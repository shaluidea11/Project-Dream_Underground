import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Customer } from '../../entities/customer.entity';
import { Order } from '../../entities/order.entity';
import { CustomerIdentityMap } from '../../entities/customer-identity-map.entity';
import { DuplicateGroup, NormalizedCustomer } from './dedup-engine';
import { DataNormalizer } from './normalizer';

export interface MergeResult {
  customersCreated: number;
  customersUpdated: number;
  duplicatesMerged: number;
  ordersCreated: number;
}

@Injectable()
export class CustomerMerger {
  private readonly logger = new Logger(CustomerMerger.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(CustomerIdentityMap)
    private readonly identityMapRepo: Repository<CustomerIdentityMap>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Merge deduplicated customer groups into the database.
   */
  async mergeCustomers(
    groups: DuplicateGroup[],
    sourceFile: string,
  ): Promise<MergeResult> {
    let customersCreated = 0;
    let customersUpdated = 0;
    let duplicatesMerged = 0;

    for (const group of groups) {
      const { canonical, duplicates } = group;
      duplicatesMerged += duplicates.length;

      // Try to find existing customer by email or phone
      let existingCustomer: Customer | null = null;

      if (canonical.email) {
        existingCustomer = await this.customerRepo.findOne({
          where: { email: canonical.email },
        });
      }
      if (!existingCustomer && canonical.phone) {
        existingCustomer = await this.customerRepo.findOne({
          where: { phone: canonical.phone },
        });
      }

      let customerId: string;

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Use raw query to handle jsonb properly
        await this.dataSource.query(
          `UPDATE customers SET
            canonical_name = COALESCE($2, canonical_name),
            city = COALESCE($3, city),
            state = COALESCE($4, state),
            preferred_channel = COALESCE($5, preferred_channel),
            raw_identities = COALESCE(raw_identities, '[]'::jsonb) || $6::jsonb,
            updated_at = NOW()
          WHERE id = $1`,
          [
            customerId,
            canonical.canonical_name || null,
            canonical.city || null,
            canonical.state || null,
            canonical.preferred_channel || null,
            JSON.stringify(this.buildRawIdentities(canonical, duplicates)),
          ],
        );
        customersUpdated++;
      } else {
        customerId = uuidv4();
        await this.dataSource.query(
          `INSERT INTO customers (id, canonical_name, email, phone, city, state, preferred_channel, engagement_score, lifetime_value, total_spend, order_count, raw_identities, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, 0, $8::jsonb, NOW(), NOW())
           ON CONFLICT (email) DO NOTHING`,
          [
            customerId,
            canonical.canonical_name,
            canonical.email || null,
            canonical.phone || null,
            canonical.city || null,
            canonical.state || null,
            canonical.preferred_channel || 'email',
            JSON.stringify(this.buildRawIdentities(canonical, duplicates)),
          ],
        );
        customersCreated++;
      }

      // Create identity map entries
      const allRecords = [canonical, ...duplicates];
      for (const rec of allRecords) {
        await this.dataSource.query(
          `INSERT INTO customer_identity_map (id, canonical_customer_id, source_name, source_email, source_phone, source_file, match_confidence, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            uuidv4(),
            customerId,
            rec.canonical_name || null,
            rec.email || null,
            rec.phone || null,
            sourceFile,
            rec === canonical ? 1.0 : 0.9,
          ],
        );
      }
    }

    this.logger.log(
      `Merge complete: ${customersCreated} created, ${customersUpdated} updated, ${duplicatesMerged} duplicates merged`,
    );

    return { customersCreated, customersUpdated, duplicatesMerged, ordersCreated: 0 };
  }

  /**
   * Ingest orders and link to canonical customers.
   */
  async ingestOrders(
    rows: Record<string, string>[],
    schemaMap: Record<string, string>,
  ): Promise<number> {
    let ordersCreated = 0;

    for (const row of rows) {
      const externalOrderId = this.getMappedValue(row, schemaMap, 'external_order_id');
      const amount = DataNormalizer.normalizeAmount(this.getMappedValue(row, schemaMap, 'amount'));
      const status = this.getMappedValue(row, schemaMap, 'status') || 'completed';
      const orderedAtStr = this.getMappedValue(row, schemaMap, 'ordered_at');
      const orderedAt = DataNormalizer.parseDate(orderedAtStr) || new Date();

      const email = DataNormalizer.normalizeEmail(this.getMappedValue(row, schemaMap, 'email'));
      const phone = DataNormalizer.normalizePhone(this.getMappedValue(row, schemaMap, 'phone'));

      let customer: Customer | null = null;
      if (email) customer = await this.customerRepo.findOne({ where: { email } });
      if (!customer && phone) customer = await this.customerRepo.findOne({ where: { phone } });

      if (!customer) {
        this.logger.warn(`No customer found for order ${externalOrderId}, skipping.`);
        continue;
      }

      try {
        await this.dataSource.query(
          `INSERT INTO orders (id, customer_id, external_order_id, amount, status, ordered_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (external_order_id) DO NOTHING`,
          [uuidv4(), customer.id, externalOrderId || uuidv4(), amount, status, orderedAt],
        );

        await this.dataSource.query(
          `UPDATE customers SET order_count = order_count + 1, total_spend = total_spend + $2, last_order_at = $3, updated_at = NOW() WHERE id = $1`,
          [customer.id, amount, orderedAt],
        );

        ordersCreated++;
      } catch (err) {
        if ((err as any)?.code === '23505') {
          this.logger.debug(`Order ${externalOrderId} already exists, skipping.`);
        } else {
          throw err;
        }
      }
    }

    this.logger.log(`Order ingestion complete: ${ordersCreated} orders created`);
    return ordersCreated;
  }

  private buildRawIdentities(canonical: NormalizedCustomer, duplicates: NormalizedCustomer[]) {
    return [canonical, ...duplicates].map((rec) => ({
      name: rec.canonical_name,
      email: rec.email,
      phone: rec.phone,
      city: rec.city,
      state: rec.state,
    }));
  }

  private getMappedValue(
    row: Record<string, string>,
    schemaMap: Record<string, string>,
    targetField: string,
  ): string {
    for (const [source, target] of Object.entries(schemaMap)) {
      if (target === targetField) {
        return row[source] || '';
      }
    }
    return '';
  }
}
