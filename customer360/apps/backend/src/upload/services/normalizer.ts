/**
 * Normalizes raw data fields (phone, email, name, dates) into consistent formats.
 */
export class DataNormalizer {
  /**
   * Normalize phone to E.164 format.
   * Handles Indian numbers (10 digits → +91...) and other formats.
   */
  static normalizePhone(phone: string): string | null {
    if (!phone) return null;

    // Strip everything except digits and leading +
    let digits = phone.replace(/[^\d+]/g, '');

    // Remove leading + for processing
    const hasPlus = digits.startsWith('+');
    if (hasPlus) digits = digits.slice(1);

    // Indian number: 10 digits → prepend 91
    if (digits.length === 10) {
      digits = '91' + digits;
    }

    // Already has country code (11-15 digits)
    if (digits.length < 10 || digits.length > 15) {
      return null; // Invalid phone
    }

    return '+' + digits;
  }

  /**
   * Normalize email: lowercase, trim.
   */
  static normalizeEmail(email: string): string | null {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return null;
    }
    return normalized;
  }

  /**
   * Normalize name: title case, trim extra whitespace.
   */
  static normalizeName(name: string): string {
    if (!name) return '';
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Parse various date formats into ISO 8601 Date.
   */
  static parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // Already ISO format
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) return isoDate;

    // Try DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(d.getTime())) return d;
    }

    // Try MM/DD/YYYY
    const mmddyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mmddyyyy) {
      const [, month, day, year] = mmddyyyy;
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }

  /**
   * Normalize a parsed amount string to a number.
   */
  static normalizeAmount(amount: string): number {
    if (!amount) return 0;
    // Remove currency symbols, commas, spaces
    const cleaned = amount.replace(/[₹$€£,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }
}
