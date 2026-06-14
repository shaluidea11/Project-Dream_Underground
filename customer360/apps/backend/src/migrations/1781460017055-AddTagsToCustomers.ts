import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTagsToCustomers1781460017055 implements MigrationInterface {
    name = 'AddTagsToCustomers1781460017055'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_customer"`);
        await queryRunner.query(`ALTER TABLE "customer_identity_map" DROP CONSTRAINT "FK_identity_map_customer"`);
        await queryRunner.query(`ALTER TABLE "communications" DROP CONSTRAINT "FK_communications_campaign"`);
        await queryRunner.query(`ALTER TABLE "communications" DROP CONSTRAINT "FK_communications_customer"`);
        await queryRunner.query(`ALTER TABLE "campaign_analytics" DROP CONSTRAINT "FK_campaign_analytics_campaign"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_campaigns_user"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_campaigns_segment"`);
        await queryRunner.query(`ALTER TABLE "segments" DROP CONSTRAINT "FK_segments_user"`);
        await queryRunner.query(`ALTER TABLE "segment_memberships" DROP CONSTRAINT "FK_segment_memberships_segment"`);
        await queryRunner.query(`ALTER TABLE "segment_memberships" DROP CONSTRAINT "FK_segment_memberships_customer"`);
        await queryRunner.query(`ALTER TABLE "upload_jobs" DROP CONSTRAINT "FK_upload_jobs_user"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_customer_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_ordered_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_communications_campaign_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_communications_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_customers_email"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_customers_phone"`);
        await queryRunner.query(`ALTER TABLE "customers" ADD "tags" text array NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "customer_identity_map" ALTER COLUMN "match_confidence" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "resource_id"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "resource_id" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_772d0ce0473ac2ccfa26060dbe" ON "orders" ("customer_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1b462b3edbdf5afb9de286be1b" ON "orders" ("ordered_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_2f9589233f30f4b57530c4245d" ON "communications" ("campaign_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_621757b9213a8abb1f540e62b7" ON "communications" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_8536b8b85c06969f84f0c098b0" ON "customers" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_88acd889fbe17d0e16cc4bc917" ON "customers" ("phone") `);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customer_identity_map" ADD CONSTRAINT "FK_185d160ec6797d10ce61078cad4" FOREIGN KEY ("canonical_customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "communications" ADD CONSTRAINT "FK_2f9589233f30f4b57530c4245db" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "communications" ADD CONSTRAINT "FK_ee3c9d63e7095dd77ba0b6c838f" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign_analytics" ADD CONSTRAINT "FK_2d791e9f44824aec3e36bbaa467" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_49da41a196c3d2bd6f5ce1dc3b5" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_4d0f69a23f991dbd8fdc60a27bb" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "segments" ADD CONSTRAINT "FK_e8861755c92c5cc5a23cfc0a955" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "segment_memberships" ADD CONSTRAINT "FK_7478c65bc64f5148b22abc89754" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "segment_memberships" ADD CONSTRAINT "FK_e2653e5da0c983cc680e5190df0" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "upload_jobs" ADD CONSTRAINT "FK_20368994215a227ab99277fac2a" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0"`);
        await queryRunner.query(`ALTER TABLE "upload_jobs" DROP CONSTRAINT "FK_20368994215a227ab99277fac2a"`);
        await queryRunner.query(`ALTER TABLE "segment_memberships" DROP CONSTRAINT "FK_e2653e5da0c983cc680e5190df0"`);
        await queryRunner.query(`ALTER TABLE "segment_memberships" DROP CONSTRAINT "FK_7478c65bc64f5148b22abc89754"`);
        await queryRunner.query(`ALTER TABLE "segments" DROP CONSTRAINT "FK_e8861755c92c5cc5a23cfc0a955"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_4d0f69a23f991dbd8fdc60a27bb"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "FK_49da41a196c3d2bd6f5ce1dc3b5"`);
        await queryRunner.query(`ALTER TABLE "campaign_analytics" DROP CONSTRAINT "FK_2d791e9f44824aec3e36bbaa467"`);
        await queryRunner.query(`ALTER TABLE "communications" DROP CONSTRAINT "FK_ee3c9d63e7095dd77ba0b6c838f"`);
        await queryRunner.query(`ALTER TABLE "communications" DROP CONSTRAINT "FK_2f9589233f30f4b57530c4245db"`);
        await queryRunner.query(`ALTER TABLE "customer_identity_map" DROP CONSTRAINT "FK_185d160ec6797d10ce61078cad4"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_88acd889fbe17d0e16cc4bc917"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8536b8b85c06969f84f0c098b0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_621757b9213a8abb1f540e62b7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2f9589233f30f4b57530c4245d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1b462b3edbdf5afb9de286be1b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_772d0ce0473ac2ccfa26060dbe"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "resource_id"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "resource_id" uuid`);
        await queryRunner.query(`ALTER TABLE "customer_identity_map" ALTER COLUMN "match_confidence" SET DEFAULT 1.0`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "tags"`);
        await queryRunner.query(`CREATE INDEX "IDX_customers_phone" ON "customers" ("phone") `);
        await queryRunner.query(`CREATE INDEX "IDX_customers_email" ON "customers" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_communications_status" ON "communications" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_communications_campaign_id" ON "communications" ("campaign_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_orders_ordered_at" ON "orders" ("ordered_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_orders_customer_id" ON "orders" ("customer_id") `);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "upload_jobs" ADD CONSTRAINT "FK_upload_jobs_user" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "segment_memberships" ADD CONSTRAINT "FK_segment_memberships_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "segment_memberships" ADD CONSTRAINT "FK_segment_memberships_segment" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "segments" ADD CONSTRAINT "FK_segments_user" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_campaigns_segment" FOREIGN KEY ("segment_id") REFERENCES "segments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "FK_campaigns_user" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign_analytics" ADD CONSTRAINT "FK_campaign_analytics_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "communications" ADD CONSTRAINT "FK_communications_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "communications" ADD CONSTRAINT "FK_communications_campaign" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "customer_identity_map" ADD CONSTRAINT "FK_identity_map_customer" FOREIGN KEY ("canonical_customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
