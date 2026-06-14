import { Injectable, Logger, HttpException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Canonical FilterAST schema (Arch.md §5.5)
export interface FilterCondition {
  field: string;
  op: string;
  value: string | number;
}

export interface FilterAST {
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
}

@Injectable()
export class SegmentationAgentService {
  private readonly logger = new Logger(SegmentationAgentService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'your-gemini-api-key') {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Convert natural language query → FilterAST using Gemini 2.0 Flash.
   * The prompt enforces:
   *   - key is "op" NOT "operator"
   *   - only whitelisted fields and operators
   */
  async generateAST(nlQuery: string): Promise<FilterAST> {
    if (!this.genAI) {
      throw new HttpException('Gemini API key not configured', 503);
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a CRM filter engine. Convert the user's natural language query into a FilterAST JSON object.

STRICT RULES:
1. Output ONLY valid JSON — no markdown, no backticks, no explanations.
2. The JSON must match this EXACT schema:
   {
     "logic": "AND" | "OR",
     "conditions": [
       { "field": "<field>", "op": "<operator>", "value": <value> }
     ]
   }
3. The key for the operator is "op" — NEVER use "operator".
4. Allowed fields ONLY: totalSpend, orderCount, engagementScore, city, state, lastOrderAt, preferredChannel
5. Allowed ops ONLY: gt, lt, gte, lte, eq, neq
6. For date fields (lastOrderAt), value must be an ISO 8601 date string like "2026-05-14T00:00:00.000Z"
7. For string fields (city, state, preferredChannel), use eq or neq only.
8. "tags" is NOT a valid field — do not use it.

EXAMPLES:
- "customers who spent more than 500" → {"logic":"AND","conditions":[{"field":"totalSpend","op":"gt","value":500}]}
- "high engagement customers from Mumbai" → {"logic":"AND","conditions":[{"field":"engagementScore","op":"gte","value":70},{"field":"city","op":"eq","value":"Mumbai"}]}
- "customers who haven't ordered in 30 days" → {"logic":"AND","conditions":[{"field":"lastOrderAt","op":"lt","value":"${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}"}]}

USER QUERY: "${nlQuery}"

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
      const ast: FilterAST = JSON.parse(text);
      // Basic shape validation
      if (!ast.logic || !Array.isArray(ast.conditions)) {
        throw new Error('Invalid AST shape');
      }
      return ast;
    } catch (err) {
      this.logger.error(`Failed to parse AI response: ${text}`);
      throw new Error(`AI returned invalid FilterAST: ${(err as Error).message}`);
    }
  }
}
