import { KNOWLEDGE_BASE } from './knowledge_base';

export interface RetrievalResult {
  text: string;
  score: number;
  source: string;
}

export type Language = 'th' | 'en' | 'zh';

export class HybridRetriever {
  static search(query: string, threshold: number = 0.1): RetrievalResult | null {
    const normalizedQuery = query.toLowerCase();
    let bestMatch: RetrievalResult | null = null;
    let maxScore = -1;

    for (const [key, entry] of Object.entries(KNOWLEDGE_BASE)) {
      let score = 0;

      for (const keyword of entry.keywords) {
        const normalizedKeyword = keyword.toLowerCase();
        if (normalizedQuery === normalizedKeyword) {
          score += 1.0;
        } else if (normalizedQuery.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedQuery)) {
          score += 0.5 + (normalizedKeyword.length / 100);
        }
      }

      const queryTokens = normalizedQuery.split(/\s+/);
      const contentLower = entry.content.toLowerCase();
      let tokenMatchCount = 0;
      for (const token of queryTokens) {
        if (token.length > 2 && contentLower.includes(token)) {
          tokenMatchCount++;
        }
      }
      score += tokenMatchCount * 0.05;

      if (score > maxScore) {
        maxScore = score;
        bestMatch = {
          text: entry.content,
          score: score,
          source: key,
        };
      }
    }

    if (bestMatch && maxScore >= threshold) {
      return bestMatch;
    }

    return null;
  }

  static detectLanguage(text: string): Language {
    const thaiPattern = /[\u0E00-\u0E7F]/;
    const chinesePattern = /[\u4E00-\u9FFF]/;
    if (thaiPattern.test(text)) return 'th';
    if (chinesePattern.test(text)) return 'zh';
    return 'en';
  }

  static extractResponseByLanguage(fullText: string, lang: Language): string {
    const parts = fullText.split('\n---\n').map((p) => p.trim());
    if (parts.length < 3) return fullText;
    if (lang === 'en') return parts[0] ?? fullText;
    if (lang === 'th') return parts[1] ?? fullText;
    if (lang === 'zh') return parts[2] ?? fullText;
    return parts[1] ?? fullText;
  }
}
