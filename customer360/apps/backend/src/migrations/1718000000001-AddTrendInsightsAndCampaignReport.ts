import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrendInsightsAndCampaignReport1718000000001 implements MigrationInterface {
  name = 'AddTrendInsightsAndCampaignReport1718000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trend_insights" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "insight" text NOT NULL,
        "suggested_segment" jsonb,
        "suggested_channel" character varying NOT NULL DEFAULT 'whatsapp',
        "suggested_message" text,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trend_insights" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "campaign_analytics" ADD "ai_summary" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaign_analytics" DROP COLUMN "ai_summary"
    `);
    await queryRunner.query(`
      DROP TABLE "trend_insights"
    `);
  }
}
