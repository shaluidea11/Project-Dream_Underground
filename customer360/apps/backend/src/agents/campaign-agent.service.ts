import { Injectable, Logger, HttpException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FilterAST } from './segmentation-agent.service';

export interface CampaignSuggestion {
  suggested_segment: {
    description: string;
    filter_ast: FilterAST;
  };
  channel_recommendation: 'whatsapp' | 'sms' | 'email' | 'rcs';
  message: string;
  subject?: string;
  cta_text?: string;
  cta_url?: string;
  reasoning: string;
}

@Injectable()
export class CampaignAgentService {
  private readonly logger = new Logger(CampaignAgentService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'your-gemini-api-key') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Generates a campaign suggestion based on a user goal.
   */
  async generateCampaign(goal: string): Promise<CampaignSuggestion> {
    if (!this.genAI) {
      throw new HttpException('Gemini API key not configured', 503);
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a CRM campaign strategist. Generate a campaign suggestion matching the user's business goal.

STRICT RULES:
1. Output ONLY valid JSON — no markdown, no backticks, no explanations.
2. The JSON must match this EXACT schema:
   {
     "suggested_segment": {
       "description": "<detailed description of the segment, e.g. Customers who spent > 5000 and haven't ordered in 60 days>",
       "filter_ast": {
         "logic": "AND" | "OR",
         "conditions": [
           { "field": "<field>", "op": "<operator>", "value": <value> }
         ]
       }
     },
     "channel_recommendation": "whatsapp" | "sms" | "email" | "rcs",
     "message": "<personalized message body using variables like {{customer.name}} or {{order.last_amount}} if appropriate>",
     "subject": "<subject line (required if channel is email, optional/null otherwise)>",
     "cta_text": "<text for call to action button, e.g. Shop Now>",
     "cta_url": "<URL for call to action>",
     "reasoning": "<explanation of why this segment, channel, and message were chosen>"
   }
3. The key for the operator in filter_ast is "op" — NEVER use "operator".
4. Allowed fields ONLY: totalSpend, orderCount, engagementScore, city, state, lastOrderAt, preferredChannel
5. Allowed ops ONLY: gt, lt, gte, lte, eq, neq
6. For date fields (lastOrderAt), value must be an ISO 8601 date string like "2026-05-14T00:00:00.000Z". Relative periods must be computed relative to today: ${new Date().toISOString()}.
7. "tags" is NOT a valid field in filter_ast — do not use it.

USER GOAL: "${goal}"

JSON:`;

    let text = '';
    try {
      const result = await model.generateContent(prompt);
      text = result.response.text().trim();
    } catch (err: any) {
      this.logger.error(`Gemini model generation failed: ${err.message}`);
      if (err.status === 429) {
        throw new HttpException(
          'Gemini AI rate limit exceeded (15 requests per minute limit on the free tier). Please wait a moment and try again.',
          429,
        );
      }
      throw new BadRequestException(`Gemini AI service error: ${err.message}`);
    }

    // Strip markdown fences if present
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    try {
      const suggestion: CampaignSuggestion = JSON.parse(text);
      if (
        !suggestion.suggested_segment ||
        !suggestion.suggested_segment.filter_ast ||
        !suggestion.suggested_segment.filter_ast.conditions ||
        !suggestion.channel_recommendation ||
        !suggestion.message
      ) {
        throw new Error('Invalid campaign suggestion shape');
      }
      return suggestion;
    } catch (err) {
      this.logger.error(`Failed to parse CampaignAgent response: ${text}`);
      throw new Error(`AI returned invalid campaign suggestion: ${(err as Error).message}`);
    }
  }
}
