import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Known column patterns mapped to our target fields
const CUSTOMER_PATTERNS: Record<string, string[]> = {
  canonical_name: ['name', 'customer_name', 'full_name', 'customer', 'first_name', 'fullname', 'contact_name'],
  email: ['email', 'e-mail', 'email_address', 'mail', 'e_mail', 'customer_email'],
  phone: ['phone', 'mobile', 'contact', 'phone_number', 'mobile_number', 'telephone', 'tel', 'cell', 'contact_number'],
  city: ['city', 'town', 'location'],
  state: ['state', 'province', 'region'],
  preferred_channel: ['preferred_channel', 'channel', 'contact_channel', 'preferred_contact'],
};

const ORDER_PATTERNS: Record<string, string[]> = {
  external_order_id: ['order_id', 'external_order_id', 'order_number', 'order_no', 'orderid', 'id'],
  amount: ['amount', 'total', 'price', 'order_amount', 'total_amount', 'order_total', 'value', 'order_value'],
  status: ['status', 'order_status'],
  ordered_at: ['date', 'ordered_at', 'order_date', 'created_at', 'purchase_date', 'timestamp'],
  items: ['items', 'products', 'order_items', 'product_name', 'item_name'],
};

export type UploadType = 'customers' | 'orders';

export interface SchemaMap {
  mapping: Record<string, string>; // source_column -> target_field
  confidence: number;
  detectedType: UploadType;
}

@Injectable()
export class SchemaDetector {
  private readonly logger = new Logger(SchemaDetector.name);

  constructor(private readonly config: ConfigService) {}

  async detect(
    headers: string[],
    sampleRows: Record<string, string>[],
    hintType?: UploadType,
  ): Promise<SchemaMap> {
    const geminiKey = this.config.get<string>('GEMINI_API_KEY');

    // Try Gemini AI first if API key is available
    if (geminiKey && geminiKey !== 'your-gemini-api-key') {
      try {
        return await this.detectWithGemini(headers, sampleRows, geminiKey, hintType);
      } catch (err) {
        this.logger.warn(`Gemini schema detection failed, falling back to rules: ${(err as Error).message}`);
      }
    }

    // Fallback to rule-based detection
    return this.detectWithRules(headers, hintType);
  }

  private async detectWithGemini(
    headers: string[],
    sampleRows: Record<string, string>[],
    apiKey: string,
    hintType?: UploadType,
  ): Promise<SchemaMap> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const sampleData = sampleRows.slice(0, 5);

    const prompt = `You are a data schema detection expert. Analyze these CSV/Excel headers and sample data, then map each source column to the correct target field.

Target fields for CUSTOMER data: canonical_name, email, phone, city, state, preferred_channel
Target fields for ORDER data: external_order_id, amount, status, ordered_at, items

Source headers: ${JSON.stringify(headers)}
Sample rows (first 5): ${JSON.stringify(sampleData, null, 2)}
${hintType ? `User hint: this is ${hintType} data.` : ''}

Respond ONLY with valid JSON, no markdown formatting, no code blocks:
{
  "detectedType": "customers" or "orders",
  "mapping": { "source_column_name": "target_field_name", ... },
  "confidence": 0.0 to 1.0
}

Only map columns you are confident about. Use null for source columns that don't match any target field.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Filter out null/undefined mappings
    const mapping: Record<string, string> = {};
    for (const [source, target] of Object.entries(parsed.mapping)) {
      if (target && target !== 'null') {
        mapping[source] = target as string;
      }
    }

    return {
      mapping,
      confidence: parsed.confidence || 0.8,
      detectedType: parsed.detectedType || hintType || 'customers',
    };
  }

  private detectWithRules(headers: string[], hintType?: UploadType): SchemaMap {
    const mapping: Record<string, string> = {};
    let customerScore = 0;
    let orderScore = 0;

    for (const header of headers) {
      const h = header.toLowerCase().replace(/\s+/g, '_');

      // Check customer patterns
      for (const [target, patterns] of Object.entries(CUSTOMER_PATTERNS)) {
        if (patterns.includes(h)) {
          mapping[header] = target;
          customerScore++;
          break;
        }
      }

      // Check order patterns (only if not already mapped)
      if (!mapping[header]) {
        for (const [target, patterns] of Object.entries(ORDER_PATTERNS)) {
          if (patterns.includes(h)) {
            mapping[header] = target;
            orderScore++;
            break;
          }
        }
      }
    }

    const detectedType: UploadType = hintType || (orderScore > customerScore ? 'orders' : 'customers');
    const totalMapped = Object.keys(mapping).length;
    const confidence = headers.length > 0 ? totalMapped / headers.length : 0;

    return { mapping, confidence, detectedType };
  }
}
