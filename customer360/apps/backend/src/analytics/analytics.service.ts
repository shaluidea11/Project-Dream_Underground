import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getDashboardHome() {
    // 1. Total customers
    const [{ count: totalCustomers }] = await this.dataSource.query(
      'SELECT COUNT(*)::int as count FROM customers',
    );

    // 2. Active segments
    const [{ count: totalSegments }] = await this.dataSource.query(
      'SELECT COUNT(*)::int as count FROM segments',
    );

    // 3. Campaigns this month
    const [{ count: campaignsThisMonth }] = await this.dataSource.query(
      `SELECT COUNT(*)::int as count FROM campaigns 
       WHERE created_at >= date_trunc('month', CURRENT_DATE)`,
    );

    // 4. Best performing campaign (highest conversion rate)
    const bestCampaignRows = await this.dataSource.query(
      `SELECT c.id, c.name, 
              (ca.total_converted::float / NULLIF(ca.total_sent, 0)) * 100 as conversion_rate
       FROM campaigns c
       JOIN campaign_analytics ca ON c.id = ca.campaign_id
       WHERE ca.total_sent > 0
       ORDER BY conversion_rate DESC
       LIMIT 1`,
    );

    const bestCampaign = bestCampaignRows[0] || null;

    return {
      totalCustomers,
      totalSegments,
      campaignsThisMonth,
      bestCampaign: bestCampaign
        ? {
            id: bestCampaign.id,
            name: bestCampaign.name,
            conversionRate: parseFloat(bestCampaign.conversion_rate || '0'),
          }
        : null,
    };
  }

  async getCampaignAnalytics(campaignId: string) {
    const campaignRows = await this.dataSource.query(
      `SELECT c.id, c.name, c.channel, c.status,
              ca.total_sent, ca.total_delivered, ca.total_failed, 
              ca.total_opened, ca.total_read, ca.total_clicked, ca.total_converted,
              ca.ai_summary
       FROM campaigns c
       LEFT JOIN campaign_analytics ca ON c.id = ca.campaign_id
       WHERE c.id = $1`,
      [campaignId],
    );

    if (campaignRows.length === 0) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    const row = campaignRows[0];
    const totalSent = parseInt(row.total_sent || '0', 10);
    const totalDelivered = parseInt(row.total_delivered || '0', 10);
    const totalFailed = parseInt(row.total_failed || '0', 10);
    const totalOpened = parseInt(row.total_opened || '0', 10);
    const totalRead = parseInt(row.total_read || '0', 10);
    const totalClicked = parseInt(row.total_clicked || '0', 10);
    const totalConverted = parseInt(row.total_converted || '0', 10);

    return {
      campaign: {
        id: row.id,
        name: row.name,
        channel: row.channel,
        status: row.status,
      },
      metrics: {
        totalSent,
        totalDelivered,
        totalFailed,
        totalOpened,
        totalRead,
        totalClicked,
        totalConverted,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        conversionRate: totalClicked > 0 ? (totalConverted / totalClicked) * 100 : 0,
        aiSummary: row.ai_summary || null,
      },
    };
  }

  async getCampaignTimeseries(campaignId: string) {
    const rows = await this.dataSource.query(
      `SELECT
         date_trunc('hour', COALESCE(delivered_at, opened_at, clicked_at, converted_at)) as hour,
         COUNT(delivered_at)::int as delivered,
         COUNT(opened_at)::int as opened,
         COUNT(clicked_at)::int as clicked,
         COUNT(converted_at)::int as converted
       FROM communications
       WHERE campaign_id = $1 AND (delivered_at IS NOT NULL OR opened_at IS NOT NULL OR clicked_at IS NOT NULL OR converted_at IS NOT NULL)
       GROUP BY hour
       ORDER BY hour ASC`,
      [campaignId],
    );

    let cumDelivered = 0;
    let cumOpened = 0;
    let cumClicked = 0;
    let cumConverted = 0;

    return rows.map((r: any) => {
      cumDelivered += r.delivered;
      cumOpened += r.opened;
      cumClicked += r.clicked;
      cumConverted += r.converted;
      return {
        timestamp: r.hour,
        delivered: cumDelivered,
        opened: cumOpened,
        clicked: cumClicked,
        converted: cumConverted,
      };
    });
  }

  async getChannelComparison() {
    const rows = await this.dataSource.query(
      `SELECT
         channel,
         COUNT(CASE WHEN status IN ('sent', 'delivered', 'opened', 'read', 'clicked', 'converted') THEN 1 END)::int as total_sent,
         COUNT(CASE WHEN status IN ('delivered', 'opened', 'read', 'clicked', 'converted') THEN 1 END)::int as total_delivered,
         COUNT(CASE WHEN status IN ('opened', 'read', 'clicked', 'converted') THEN 1 END)::int as total_opened,
         COUNT(CASE WHEN status IN ('clicked', 'converted') THEN 1 END)::int as total_clicked,
         COUNT(CASE WHEN status = 'converted' THEN 1 END)::int as total_converted
       FROM communications
       GROUP BY channel`,
    );

    return rows.map((r: any) => {
      const totalSent = r.total_sent;
      const totalDelivered = r.total_delivered;
      const totalOpened = r.total_opened;
      const totalClicked = r.total_clicked;
      const totalConverted = r.total_converted;

      return {
        channel: r.channel,
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalConverted,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        conversionRate: totalClicked > 0 ? (totalConverted / totalClicked) * 100 : 0,
      };
    });
  }
}
