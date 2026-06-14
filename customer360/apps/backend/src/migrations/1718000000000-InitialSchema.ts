import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1718000000000 implements MigrationInterface {
  name = 'InitialSchema1718000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM('admin', 'marketing_manager', 'analyst')
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'analyst',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Customers
    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "canonical_name" character varying NOT NULL,
        "email" character varying,
        "phone" character varying,
        "city" character varying,
        "state" character varying,
        "preferred_channel" character varying,
        "engagement_score" float NOT NULL DEFAULT 0,
        "lifetime_value" float NOT NULL DEFAULT 0,
        "total_spend" float NOT NULL DEFAULT 0,
        "order_count" integer NOT NULL DEFAULT 0,
        "last_order_at" TIMESTAMP,
        "raw_identities" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_customers_email" UNIQUE ("email"),
        CONSTRAINT "UQ_customers_phone" UNIQUE ("phone"),
        CONSTRAINT "PK_customers" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_customers_email" ON "customers" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_customers_phone" ON "customers" ("phone")`);

    // Orders
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "external_order_id" character varying,
        "amount" float NOT NULL,
        "status" character varying NOT NULL DEFAULT 'completed',
        "items" jsonb,
        "ordered_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_orders_external_order_id" UNIQUE ("external_order_id"),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_orders_customer_id" ON "orders" ("customer_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_ordered_at" ON "orders" ("ordered_at")`);

    // Customer Identity Map
    await queryRunner.query(`
      CREATE TABLE "customer_identity_map" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "canonical_customer_id" uuid NOT NULL,
        "source_name" character varying,
        "source_email" character varying,
        "source_phone" character varying,
        "source_file" character varying,
        "match_confidence" float NOT NULL DEFAULT 1.0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customer_identity_map" PRIMARY KEY ("id")
      )
    `);

    // Segments
    await queryRunner.query(`
      CREATE TABLE "segments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_by" uuid NOT NULL,
        "name" character varying NOT NULL,
        "description" text,
        "filter_definition" jsonb,
        "nl_query" character varying,
        "customer_count" integer NOT NULL DEFAULT 0,
        "last_computed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_segments" PRIMARY KEY ("id")
      )
    `);

    // Segment Memberships
    await queryRunner.query(`
      CREATE TABLE "segment_memberships" (
        "segment_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "added_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_segment_memberships" PRIMARY KEY ("segment_id", "customer_id")
      )
    `);

    // Campaigns
    await queryRunner.query(`
      CREATE TYPE "campaigns_channel_enum" AS ENUM('whatsapp', 'sms', 'email', 'rcs')
    `);
    await queryRunner.query(`
      CREATE TYPE "campaigns_status_enum" AS ENUM('draft', 'scheduled', 'running', 'completed', 'paused')
    `);
    await queryRunner.query(`
      CREATE TABLE "campaigns" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_by" uuid NOT NULL,
        "segment_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "channel" "campaigns_channel_enum" NOT NULL,
        "message_body" text NOT NULL,
        "subject" character varying,
        "cta_text" character varying,
        "cta_url" character varying,
        "status" "campaigns_status_enum" NOT NULL DEFAULT 'draft',
        "scheduled_at" TIMESTAMP,
        "started_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_campaigns" PRIMARY KEY ("id")
      )
    `);

    // Communications
    await queryRunner.query(`
      CREATE TYPE "communications_channel_enum" AS ENUM('whatsapp', 'sms', 'email', 'rcs')
    `);
    await queryRunner.query(`
      CREATE TYPE "communications_status_enum" AS ENUM('pending', 'sent', 'delivered', 'failed', 'opened', 'read', 'clicked', 'converted')
    `);
    await queryRunner.query(`
      CREATE TABLE "communications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "recipient_phone" character varying,
        "recipient_email" character varying,
        "channel" "communications_channel_enum" NOT NULL,
        "message_body" text NOT NULL,
        "status" "communications_status_enum" NOT NULL DEFAULT 'pending',
        "sent_at" TIMESTAMP,
        "delivered_at" TIMESTAMP,
        "opened_at" TIMESTAMP,
        "clicked_at" TIMESTAMP,
        "converted_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_communications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_communications_campaign_id" ON "communications" ("campaign_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_communications_status" ON "communications" ("status")`);

    // Campaign Analytics
    await queryRunner.query(`
      CREATE TABLE "campaign_analytics" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "campaign_id" uuid NOT NULL,
        "total_sent" integer NOT NULL DEFAULT 0,
        "total_delivered" integer NOT NULL DEFAULT 0,
        "total_failed" integer NOT NULL DEFAULT 0,
        "total_opened" integer NOT NULL DEFAULT 0,
        "total_read" integer NOT NULL DEFAULT 0,
        "total_clicked" integer NOT NULL DEFAULT 0,
        "total_converted" integer NOT NULL DEFAULT 0,
        "computed_at" TIMESTAMP,
        CONSTRAINT "UQ_campaign_analytics_campaign_id" UNIQUE ("campaign_id"),
        CONSTRAINT "PK_campaign_analytics" PRIMARY KEY ("id")
      )
    `);

    // Upload Jobs
    await queryRunner.query(`
      CREATE TYPE "upload_jobs_type_enum" AS ENUM('customers', 'orders')
    `);
    await queryRunner.query(`
      CREATE TYPE "upload_jobs_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')
    `);
    await queryRunner.query(`
      CREATE TABLE "upload_jobs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_by" uuid NOT NULL,
        "file_name" character varying NOT NULL,
        "file_url" character varying NOT NULL,
        "type" "upload_jobs_type_enum" NOT NULL,
        "status" "upload_jobs_status_enum" NOT NULL DEFAULT 'pending',
        "schema_map" jsonb,
        "records_processed" integer NOT NULL DEFAULT 0,
        "duplicates_merged" integer NOT NULL DEFAULT 0,
        "error_message" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP,
        CONSTRAINT "PK_upload_jobs" PRIMARY KEY ("id")
      )
    `);

    // Audit Logs
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "action" character varying NOT NULL,
        "resource_type" character varying NOT NULL,
        "resource_id" uuid,
        "metadata" jsonb,
        "ip_address" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // Foreign keys
    await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "customer_identity_map" ADD CONSTRAINT "FK_identity_map_customer" FOREIGN KEY ("canonical_customer_id") REFERENCES "customers"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "segments" ADD CONSTRAINT "FK_segments_user" FOREIGN KEY ("created_by") REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "segment_memberships" ADD CONSTRAINT "FK_segment_memberships_segment" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "segment_memberships" ADD CONSTRAINT "FK_segment_memberships_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_campaigns_user" FOREIGN KEY ("created_by") REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_campaigns_segment" FOREIGN KEY ("segment_id") REFERENCES "segments"("id")`);
    await queryRunner.query(`ALTER TABLE "communications" ADD CONSTRAINT "FK_communications_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "communications" ADD CONSTRAINT "FK_communications_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id")`);
    await queryRunner.query(`ALTER TABLE "campaign_analytics" ADD CONSTRAINT "FK_campaign_analytics_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "upload_jobs" ADD CONSTRAINT "FK_upload_jobs_user" FOREIGN KEY ("created_by") REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_user"`);
    await queryRunner.query(`ALTER TABLE "upload_jobs" DROP CONSTRAINT "FK_upload_jobs_user"`);
    await queryRunner.query(`ALTER TABLE "campaign_analytics" DROP CONSTRAINT "FK_campaign_analytics_campaign"`);
    await queryRunner.query(`ALTER TABLE "communications" DROP CONSTRAINT "FK_communications_customer"`);
    await queryRunner.query(`ALTER TABLE "communications" DROP CONSTRAINT "FK_communications_campaign"`);
    await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_campaigns_segment"`);
    await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_campaigns_user"`);
    await queryRunner.query(`ALTER TABLE "segment_memberships" DROP CONSTRAINT "FK_segment_memberships_customer"`);
    await queryRunner.query(`ALTER TABLE "segment_memberships" DROP CONSTRAINT "FK_segment_memberships_segment"`);
    await queryRunner.query(`ALTER TABLE "segments" DROP CONSTRAINT "FK_segments_user"`);
    await queryRunner.query(`ALTER TABLE "customer_identity_map" DROP CONSTRAINT "FK_identity_map_customer"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_customer"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "upload_jobs"`);
    await queryRunner.query(`DROP TYPE "upload_jobs_status_enum"`);
    await queryRunner.query(`DROP TYPE "upload_jobs_type_enum"`);
    await queryRunner.query(`DROP TABLE "campaign_analytics"`);
    await queryRunner.query(`DROP TABLE "communications"`);
    await queryRunner.query(`DROP TYPE "communications_status_enum"`);
    await queryRunner.query(`DROP TYPE "communications_channel_enum"`);
    await queryRunner.query(`DROP TABLE "campaigns"`);
    await queryRunner.query(`DROP TYPE "campaigns_status_enum"`);
    await queryRunner.query(`DROP TYPE "campaigns_channel_enum"`);
    await queryRunner.query(`DROP TABLE "segment_memberships"`);
    await queryRunner.query(`DROP TABLE "segments"`);
    await queryRunner.query(`DROP TABLE "customer_identity_map"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_ordered_at"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_customer_id"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP INDEX "IDX_customers_phone"`);
    await queryRunner.query(`DROP INDEX "IDX_customers_email"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
