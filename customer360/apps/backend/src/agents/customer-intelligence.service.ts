import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface CustomerStats {
  orderCount: number;
  totalSpend: number;
  lastOrderAt: Date | null;
  createdAt: Date;
}

export interface IntelligenceResult {
  engagementScore: number;
  lifetimeValue: number;
  tags: string[];
  preferredChannel: string;
}

@Injectable()
export class CustomerIntelligenceService {
  private readonly logger = new Logger(CustomerIntelligenceService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'your-gemini-api-key') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Main entrypoint to profile a customer
   */
  async profileCustomer(
    stats: CustomerStats,
    existingPreferredChannel?: string | null,
  ): Promise<IntelligenceResult> {
    const engagementScore = this.calculateEngagementScore(stats);
    const lifetimeValue = stats.totalSpend; // Simplified historical CLV

    // Default to email if no existing channel is provided
    const preferredChannel = existingPreferredChannel || 'email';

    let tags: string[] = [];
    if (this.genAI) {
      tags = await this.generateTagsWithAI(stats, engagementScore);
    } else {
      tags = this.generateFallbackTags(stats, engagementScore);
    }

    return {
      engagementScore,
      lifetimeValue,
      tags,
      preferredChannel,
    };
  }

  /**
   * Native TS calculation for Engagement Score (0-100)
   * Based on Recency and Frequency.
   */
  private calculateEngagementScore(stats: CustomerStats): number {
    let score = 0;

    // Frequency (max 50 points)
    if (stats.orderCount >= 10) score += 50;
    else if (stats.orderCount >= 5) score += 40;
    else if (stats.orderCount >= 2) score += 25;
    else if (stats.orderCount === 1) score += 10;

    // Recency (max 50 points)
    if (stats.lastOrderAt) {
      const daysSinceLastOrder =
        (new Date().getTime() - new Date(stats.lastOrderAt).getTime()) /
        (1000 * 3600 * 24);

      if (daysSinceLastOrder <= 30) score += 50;
      else if (daysSinceLastOrder <= 90) score += 35;
      else if (daysSinceLastOrder <= 180) score += 20;
      else if (daysSinceLastOrder <= 365) score += 10;
    }

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Use Gemini to generate qualitative tags based on RFM profile
   */
  private async generateTagsWithAI(
    stats: CustomerStats,
    engagementScore: number,
  ): Promise<string[]> {
    try {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const daysSinceLastOrder = stats.lastOrderAt
        ? Math.floor(
            (new Date().getTime() - new Date(stats.lastOrderAt).getTime()) /
              (1000 * 3600 * 24),
          )
        : 'Never';

      const prompt = `You are a Customer Relationship expert. Based on the following customer metrics, assign 1 to 3 qualitative tags (e.g., "Champion", "At-Risk", "Needs Attention", "Loyalist", "High-Value", "New", "Dormant", "Window Shopper").
      
      Metrics:
      - Order Count: ${stats.orderCount}
      - Total Spend: $${stats.totalSpend.toFixed(2)}
      - Days Since Last Order: ${daysSinceLastOrder}
      - Computed Engagement Score (0-100): ${engagementScore}
      
      Respond ONLY with a valid JSON array of strings, e.g. ["Tag1", "Tag2"]. No markdown or explanations.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Extract JSON array
      const jsonMatch = text.match(/\\[.*?\\]/s);
      let jsonStr = text;
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      // Cleanup backticks if any
      jsonStr = jsonStr.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

      const parsedTags = JSON.parse(jsonStr);
      if (Array.isArray(parsedTags)) {
        return parsedTags.slice(0, 3);
      }
      return [];
    } catch (err) {
      this.logger.warn(`Failed to generate tags with AI: ${(err as Error).message}`);
      return this.generateFallbackTags(stats, engagementScore);
    }
  }

  /**
   * Fallback logic if AI is unavailable or fails
   */
  private generateFallbackTags(
    stats: CustomerStats,
    engagementScore: number,
  ): string[] {
    const tags: string[] = [];

    if (engagementScore >= 80 && stats.totalSpend >= 500) {
      tags.push('Champion');
    } else if (engagementScore >= 70) {
      tags.push('Loyalist');
    }

    if (stats.orderCount === 1) {
      tags.push('New Customer');
    }

    if (stats.orderCount > 0 && engagementScore < 30) {
      tags.push('At-Risk');
    }

    if (stats.totalSpend > 1000) {
      tags.push('High-Value');
    }

    if (tags.length === 0) {
      tags.push('Standard');
    }

    return tags.slice(0, 3);
  }
}
