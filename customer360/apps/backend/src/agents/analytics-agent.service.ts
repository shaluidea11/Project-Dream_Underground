import { Injectable, Logger, HttpException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Campaign } from '../entities/campaign.entity';
import { CampaignAnalytics } from '../entities/campaign-analytics.entity';

@Injectable()
export class AnalyticsAgentService {
  private readonly logger = new Logger(AnalyticsAgentService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignAnalytics)
    private readonly analyticsRepo: Repository<CampaignAnalytics>,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'your-gemini-api-key') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Generates a performance report and suggestions for a completed campaign.
   */
  async generateCampaignReport(campaignId: string): Promise<string> {
    if (!this.genAI) {
      throw new HttpException('Gemini API key not configured', 503);
    }

    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
      relations: ['segment', 'analytics'],
    });

    if (!campaign) {
      throw new HttpException(`Campaign ${campaignId} not found`, 404);
    }

    const analytics = campaign.analytics;
    if (!analytics) {
      throw new HttpException(`Analytics record for campaign ${campaignId} not found`, 404);
    }

    this.logger.log(`AnalyticsAgent generating report for campaign: ${campaign.name}`);

    const totalSent = analytics.totalSent;
    const totalDelivered = analytics.totalDelivered;
    const totalOpened = analytics.totalOpened;
    const totalClicked = analytics.totalClicked;
    const totalConverted = analytics.totalConverted;

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const conversionRate = totalClicked > 0 ? (totalConverted / totalClicked) * 100 : 0;

    const campaignContext = {
      name: campaign.name,
      channel: campaign.channel,
      messageBody: campaign.messageBody,
      segmentName: campaign.segment?.name || 'Unknown',
      segmentDescription: campaign.segment?.description || '',
      metrics: {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalConverted,
        deliveryRate: `${deliveryRate.toFixed(1)}%`,
        openRate: `${openRate.toFixed(1)}%`,
        clickRate: `${clickRate.toFixed(1)}%`,
        conversionRate: `${conversionRate.toFixed(1)}%`,
      },
    };

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert CRM analyst. Analyze the performance of this marketing campaign and write a concise, professional report containing a performance summary, key insights, and actionable recommendations/suggestions.

CAMPAIGN CONTEXT & RESULTS:
${JSON.stringify(campaignContext, null, 2)}

STRICT RULES:
1. Write the report in Markdown format.
2. Structure the report with these sections:
   ### Executive Summary
   ### Key Performance Insights
   ### Actionable Recommendations
3. Keep the tone professional, encouraging, and highly metric-focused.
4. Keep the report under 250 words. Do not output JSON or HTML.

REPORT:`;

    let text = '';
    try {
      const result = await model.generateContent(prompt);
      text = result.response.text().trim();
    } catch (err: any) {
      this.logger.error(`Gemini report generation failed: ${err.message}`);
      if (err.status === 429) {
        throw new HttpException(
          'Gemini AI rate limit exceeded. Please wait a moment and try again.',
          429,
        );
      }
      throw new BadRequestException(`Gemini AI service error: ${err.message}`);
    }

    analytics.aiSummary = text;
    await this.analyticsRepo.save(analytics);
    this.logger.log(`AI performance report saved for campaign ${campaignId}`);

    return text;
  }
}
