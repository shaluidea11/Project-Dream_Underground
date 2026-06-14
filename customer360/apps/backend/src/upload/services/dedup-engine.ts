import { Logger } from '@nestjs/common';

export interface NormalizedCustomer {
  canonical_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  preferred_channel: string | null;
  _sourceIndex: number; // original row index for tracking
}

export interface DuplicateGroup {
  canonical: NormalizedCustomer;
  duplicates: NormalizedCustomer[];
}

/**
 * Deduplication engine: groups records by exact email/phone match,
 * then fuzzy name matching within same city.
 */
export class DedupEngine {
  private static readonly logger = new Logger('DedupEngine');

  /**
   * Run deduplication on normalized customer records.
   * Returns unique groups where each group contains a canonical record and its duplicates.
   */
  static deduplicate(records: NormalizedCustomer[]): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    const assigned = new Set<number>();

    // Pass 1: Group by exact email match
    const emailMap = new Map<string, number[]>();
    records.forEach((rec, idx) => {
      if (rec.email) {
        const key = rec.email.toLowerCase();
        if (!emailMap.has(key)) emailMap.set(key, []);
        emailMap.get(key)!.push(idx);
      }
    });

    for (const indices of emailMap.values()) {
      if (indices.length > 1) {
        // All these records share the same email — group them
        const canonical = records[indices[0]];
        const dupes = indices.slice(1).map((i) => records[i]);
        groups.push({ canonical, duplicates: dupes });
        indices.forEach((i) => assigned.add(i));
      }
    }

    // Pass 2: Group by exact phone match (for records not yet assigned)
    const phoneMap = new Map<string, number[]>();
    records.forEach((rec, idx) => {
      if (!assigned.has(idx) && rec.phone) {
        const key = rec.phone;
        if (!phoneMap.has(key)) phoneMap.set(key, []);
        phoneMap.get(key)!.push(idx);
      }
    });

    for (const indices of phoneMap.values()) {
      if (indices.length > 1) {
        const canonical = records[indices[0]];
        const dupes = indices.slice(1).map((i) => records[i]);
        groups.push({ canonical, duplicates: dupes });
        indices.forEach((i) => assigned.add(i));
      }
    }

    // Pass 3: Fuzzy name match within same city (for still-unassigned records)
    const cityMap = new Map<string, number[]>();
    records.forEach((rec, idx) => {
      if (!assigned.has(idx) && rec.city) {
        const key = rec.city.toLowerCase();
        if (!cityMap.has(key)) cityMap.set(key, []);
        cityMap.get(key)!.push(idx);
      }
    });

    for (const indices of cityMap.values()) {
      const used = new Set<number>();
      for (let i = 0; i < indices.length; i++) {
        if (used.has(indices[i])) continue;
        const rec1 = records[indices[i]];
        const fuzzyDupes: NormalizedCustomer[] = [];

        for (let j = i + 1; j < indices.length; j++) {
          if (used.has(indices[j])) continue;
          const rec2 = records[indices[j]];

          if (rec1.canonical_name && rec2.canonical_name) {
            const dist = DedupEngine.levenshtein(
              rec1.canonical_name.toLowerCase(),
              rec2.canonical_name.toLowerCase(),
            );
            if (dist <= 3) {
              fuzzyDupes.push(rec2);
              used.add(indices[j]);
              assigned.add(indices[j]);
            }
          }
        }

        if (fuzzyDupes.length > 0) {
          groups.push({ canonical: rec1, duplicates: fuzzyDupes });
          used.add(indices[i]);
          assigned.add(indices[i]);
        }
      }
    }

    // Pass 4: Remaining records are unique — each is its own group
    records.forEach((rec, idx) => {
      if (!assigned.has(idx)) {
        groups.push({ canonical: rec, duplicates: [] });
      }
    });

    DedupEngine.logger.log(
      `Deduplication complete: ${records.length} records → ${groups.length} unique groups (${records.length - groups.length} duplicates found)`,
    );

    return groups;
  }

  /**
   * Levenshtein distance between two strings.
   */
  private static levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}
