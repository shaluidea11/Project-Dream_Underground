import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import dataSource from '../config/data-source';

const FIRST_NAMES = [
  'Aarav','Aditi','Aisha','Akash','Ananya','Arjun','Bhavya','Chandra','Devi','Dhruv',
  'Esha','Farhan','Gauri','Harsh','Isha','Jai','Kavya','Lakshmi','Manav','Neha',
  'Ojas','Priya','Rahul','Riya','Rohan','Saanvi','Sahil','Shreya','Tanvi','Varun',
  'Vivaan','Zara','Aditya','Anita','Aryan','Deepa','Gaurav','Ira','Kabir','Meera',
  'Nisha','Pooja','Raj','Sakshi','Siddharth','Tara','Uma','Vihaan','Yash','Zoya',
];
const LAST_NAMES = [
  'Sharma','Patel','Singh','Kumar','Gupta','Reddy','Mehta','Shah','Verma','Joshi',
  'Iyer','Nair','Chopra','Malhotra','Das','Bose','Rao','Pillai','Mishra','Pandey',
  'Saxena','Agarwal','Banerjee','Chatterjee','Mukherjee','Sen','Roy','Ghosh','Kapoor','Khanna',
];
const CITIES = [
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Delhi', state: 'Delhi' },
  { city: 'Bangalore', state: 'Karnataka' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Jaipur', state: 'Rajasthan' },
  { city: 'Lucknow', state: 'Uttar Pradesh' },
];
const CHANNELS = ['whatsapp', 'sms', 'email', 'rcs'];
const PRODUCT_NAMES = [
  'Wireless Headphones','Smart Watch','Running Shoes','Backpack','Yoga Mat',
  'Water Bottle','Sunglasses','Phone Case','Desk Lamp','Notebook',
  'USB-C Cable','Bluetooth Speaker','Fitness Tracker','Travel Mug','Laptop Stand',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export async function seed(ds: DataSource) {
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Generate 100 customers
    const customers: Array<{
      id: string; name: string; email: string; phone: string;
      city: string; state: string; channel: string;
    }> = [];

    for (let i = 0; i < 100; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const loc = pick(CITIES);
      const id = uuidv4();
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
      const phone = `+91${String(9000000000 + i * 100000 + randInt(0, 99999)).slice(0, 10)}`;

      customers.push({
        id, name, email, phone,
        city: loc.city, state: loc.state,
        channel: pick(CHANNELS),
      });

      await queryRunner.query(
        `INSERT INTO customers (id, canonical_name, email, phone, city, state, preferred_channel, engagement_score, lifetime_value, total_spend, order_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, name, email, phone, loc.city, loc.state, pick(CHANNELS), 0, 0, 0, 0],
      );
    }

    // Generate 500 orders spread across customers
    const orderStart = new Date('2024-01-01');
    const orderEnd = new Date('2025-06-01');

    // Track per-customer aggregates
    const customerAgg: Record<string, { totalSpend: number; orderCount: number; lastOrder: Date }> = {};

    for (let i = 0; i < 500; i++) {
      const customer = pick(customers);
      const orderId = uuidv4();
      const amount = rand(50, 5000);
      const orderedAt = randomDate(orderStart, orderEnd);
      const itemCount = randInt(1, 4);
      const items = Array.from({ length: itemCount }, () => ({
        name: pick(PRODUCT_NAMES),
        quantity: randInt(1, 3),
        price: rand(100, 2000),
      }));

      await queryRunner.query(
        `INSERT INTO orders (id, customer_id, external_order_id, amount, status, items, ordered_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, customer.id, `ORD-${String(i + 1).padStart(5, '0')}`, amount, 'completed', JSON.stringify(items), orderedAt],
      );

      if (!customerAgg[customer.id]) {
        customerAgg[customer.id] = { totalSpend: 0, orderCount: 0, lastOrder: orderedAt };
      }
      customerAgg[customer.id].totalSpend += amount;
      customerAgg[customer.id].orderCount += 1;
      if (orderedAt > customerAgg[customer.id].lastOrder) {
        customerAgg[customer.id].lastOrder = orderedAt;
      }
    }

    // Update customer aggregates
    for (const [custId, agg] of Object.entries(customerAgg)) {
      const engagementScore = Math.min(100, Math.round((agg.orderCount * 10 + agg.totalSpend / 100) * 100) / 100);
      const lifetimeValue = Math.round(agg.totalSpend * 1.2 * 100) / 100;
      await queryRunner.query(
        `UPDATE customers SET total_spend = $1, order_count = $2, last_order_at = $3, engagement_score = $4, lifetime_value = $5 WHERE id = $6`,
        [Math.round(agg.totalSpend * 100) / 100, agg.orderCount, agg.lastOrder, engagementScore, lifetimeValue, custId],
      );
    }

    // Create identity map entries for each customer (self-mapping)
    for (const customer of customers) {
      await queryRunner.query(
        `INSERT INTO customer_identity_map (id, canonical_customer_id, source_name, source_email, source_phone, source_file, match_confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), customer.id, customer.name, customer.email, customer.phone, 'seed', 1.0],
      );
    }

    // Seed admin user (admin@test.com / Admin123!)
    const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
    await queryRunner.query(
      `INSERT INTO users (id, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [uuidv4(), 'admin@test.com', adminPasswordHash, 'admin'],
    );

    await queryRunner.commitTransaction();
    console.log('✅ Seed complete: 100 customers, 500 orders, 100 identity map entries, 1 admin user');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    await queryRunner.release();
  }
}

async function main() {
  await dataSource.initialize();
  await seed(dataSource);
  await dataSource.destroy();
}

// Only run when executed directly (not when imported as a module)
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
