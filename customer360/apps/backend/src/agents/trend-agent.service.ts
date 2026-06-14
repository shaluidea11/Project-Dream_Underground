import { Injectable, Logger, HttpException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TrendInsight } from '../entities/trend-insight.entity';

@Injectable()
export class TrendAgentService implements OnModuleInit {
  private readonly logger = new Logger(TrendAgentService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    @InjectRepository(TrendInsight)
    private readonly trendRepo: Repository<TrendInsight>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    @InjectQueue('trend.scan')
    private readonly trendQueue: Queue,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'your-gemini-api-key') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async onModuleInit() {
    try {
      this.logger.log('Scheduling repeatable daily trend scan job at midnight...');
      // Clean up previous repeatable jobs for trend.scan to avoid duplicates
      const jobs = await this.trendQueue.getRepeatableJobs();
      for (const job of jobs) {
        await this.trendQueue.removeRepeatableByKey(job.key);
      }
      
      await this.trendQueue.add(
        'scan',
        {},
        {
          repeat: { pattern: '0 0 * * *' },
          jobId: 'trend-daily-scan',
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      );
    } catch (err: any) {
      this.logger.error(`Failed to schedule daily scan repeatable job: ${err.message}`);
    }
  }

  /**
   * Scan database metrics and use Gemini 2.0 Flash to generate marketing insights.
   */
  async runScan(): Promise<TrendInsight[]> {
    if (!this.genAI) {
      throw new HttpException('Gemini API key not configured', 503);
    }

    this.logger.log('TrendAgent running daily scan...');

    // 1. Gather stats for context
    const customerStats = await this.dataSource.query(
      `SELECT COUNT(*)::int as total_customers,
              COALESCE(AVG(total_spend), 0)::float as avg_spend,
              COALESCE(AVG(engagement_score), 0)::float as avg_engagement
       FROM customers`
    );

    const channelStats = await this.dataSource.query(
      `SELECT preferred_channel, COUNT(*)::int as count 
       FROM customers 
       WHERE preferred_channel IS NOT NULL 
       GROUP BY preferred_channel`
    );

    const orderStats = await this.dataSource.query(
      `SELECT COUNT(*)::int as total_orders, 
              COALESCE(AVG(amount), 0)::float as avg_order_value
       FROM orders`
    );

    const campaignStats = await this.dataSource.query(
      `SELECT c.name, c.channel, c.status,
              ca.total_sent, ca.total_delivered, ca.total_clicked, ca.total_converted
       FROM campaigns c
       LEFT JOIN campaign_analytics ca ON c.id = ca.campaign_id
       ORDER BY c.created_at DESC
       LIMIT 5`
    );

    const contextData = {
      customers: customerStats[0] || {},
      channels: channelStats,
      orders: orderStats[0] || {},
      recentCampaigns: campaignStats,
    };

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a CRM marketer's trend scanner AI. Analyze the current state of our CRM database and suggest 2-3 actionable marketing campaign insights.
    
CURRENT CRM METRICS SUMMARY:
${JSON.stringify(contextData, null, 2)}

STRICT RULES:
1. Output ONLY a valid JSON array of objects. No markdown backticks, no code blocks, no other text.
2. The JSON array objects must match this EXACT schema:
   {
     "title": "<short compelling title for the trend, e.g. Re-engage Inactive Coffee Lovers>",
     "insight": "<actionable trend insight based on data, e.g. Customers who purchased Cold Brew in the last 30 days are 2x more likely to convert. High-value customers have not been targeted for 14 days.>",
     "suggested_segment": {
       "name": "<suggested name for segment, e.g. Lapsed Cold Brew Buyers>",
       "description": "<detailed description of segment criteria>",
       "filter_ast": {
         "logic": "AND" | "OR",
         "conditions": [
           { "field": "<field>", "op": "<operator>", "value": <value> }
         ]
       }
     },
     "suggested_channel": "whatsapp" | "sms" | "email" | "rcs",
     "suggested_message": "<personalized marketing copy, e.g. Hey {{customer.name}}, we miss you! ☕ Enjoy a free espresso on your next order over 200.>"
   }
3. The keys for conditions inside filter_ast are: "field", "op" (NOT "operator"), "value".
4. Whitelisted filter fields: totalSpend, orderCount, engagementScore, city, state, lastOrderAt, preferredChannel.
5. Whitelisted filter ops: gt, lt, gte, lte, eq, neq.
6. For date fields (lastOrderAt), value must be an ISO 8601 date string relative to today: ${new Date().toISOString()}.
7. "tags" is NOT a valid field in filter_ast — do not use it.
8. Make the message compelling and personalized.

JSON ARRAY:`;

    let text = '';
    try {
      const result = await model.generateContent(prompt);
      text = result.response.text().trim();
    } catch (err: any) {
      this.logger.error(`Gemini generation failed: ${err.message}`);
      if (err.status === 429) {
        throw new HttpException(
          'Gemini AI rate limit exceeded. Please wait a moment and try again.',
          429,
        );
      }
      throw new BadRequestException(`Gemini AI service error: ${err.message}`);
    }

    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    try {
      const parsedArray = JSON.parse(text);
      if (!Array.isArray(parsedArray)) {
        throw new Error('AI did not return a JSON array');
      }

      const insights: TrendInsight[] = [];
      for (const item of parsedArray) {
        const trend = new TrendInsight();
        trend.title = item.title;
        trend.insight = item.insight;
        trend.suggestedSegment = item.suggested_segment || null;
        trend.suggestedChannel = item.suggested_channel || 'whatsapp';
        trend.suggestedMessage = item.suggested_message || null;
        trend.isRead = false;
        
        insights.push(trend);
      }

      const saved = await this.trendRepo.save(insights);
      this.logger.log(`Generated and saved ${saved.length} new trend insights.`);
      return saved;
    } catch (err) {
      this.logger.error(`Failed to parse TrendAgent response: ${text}`);
      throw new Error(`AI returned invalid trends data: ${(err as Error).message}`);
    }
  }

  async findAll(): Promise<TrendInsight[]> {
    return this.trendRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findUnreadCount(): Promise<number> {
    return this.trendRepo.count({
      where: { isRead: false },
    });
  }

  async markRead(id: string): Promise<TrendInsight> {
    const trend = await this.trendRepo.findOne({ where: { id } });
    if (!trend) {
      throw new HttpException(`Trend insight ${id} not found`, 404);
    }
    trend.isRead = true;
    return this.trendRepo.save(trend);
  }
}
