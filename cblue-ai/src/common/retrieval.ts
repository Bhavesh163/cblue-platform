import { KNOWLEDGE_BASE } from '../data/knowledge_base';

export interface RetrievalResult {
    text: string;
    score: number;
    source: string;
}

export class HybridRetriever {
    // Simple token overlap scoring to replace backend BM25/Vector search
    // Since we are client-side and rely on the 'keywords' field in the KB, 
    // we can check how many keywords match the query.

    static search(query: string, threshold: number = 0.1): RetrievalResult | null {
        const normalizedQuery = query.toLowerCase();
        let bestMatch: RetrievalResult | null = null;
        let maxScore = -1;

        for (const [key, entry] of Object.entries(KNOWLEDGE_BASE)) {
            // Calculate score based on keyword matches
            let score = 0;

            // 1. Direct Keyword Matching
            // If the query contains a keyword from the list, give it high boost
            for (const keyword of entry.keywords) {
                const normalizedKeyword = keyword.toLowerCase();

                // Exact match
                if (normalizedQuery === normalizedKeyword) {
                    score += 1.0;
                }
                // Contains match (Query contains keyword or Keyword contains query)
                else if (normalizedQuery.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedQuery)) {
                    // Weigh by length to prefer specific matches
                    score += 0.5 + (normalizedKeyword.length / 100);
                }
            }

            // 2. Simple Token Overlap with Content (Fallback)
            const queryTokens = normalizedQuery.split(/\s+/);
            // Limit content check to first 200 chars for performance if needed, but KB is small
            const contentLower = entry.content.toLowerCase();
            let tokenMatchCount = 0;
            for (const token of queryTokens) {
                if (token.length > 2 && contentLower.includes(token)) {
                    tokenMatchCount++;
                }
            }
            // Add a small score for token overlaps
            score += tokenMatchCount * 0.05;

            if (score > maxScore) {
                maxScore = score;
                bestMatch = {
                    text: entry.content,
                    score: score,
                    source: key
                };
            }
        }

        if (bestMatch && maxScore >= threshold) {
            return bestMatch;
        }

        return null; // No good match found
    }
}
