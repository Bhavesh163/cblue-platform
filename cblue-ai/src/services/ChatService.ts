import { PIIRedactor } from '../common/pii_redaction';
import { HybridRetriever } from '../common/retrieval';
import { buildFallbackResponse, Language } from '../common/prompts';

export class ChatService {
    /**
     * Processes a user message and returns a response.
     * 1. Redacts PII from input.
     * 2. Searches the Knowledge Base.
     * 3. Returns a ready response or a fallback.
     */
    static async sendMessage(message: string): Promise<string> {
        // 1. PII Redaction
        // Even though we are client-side, we simulate the "safe" processing flow.
        const cleanMessage = PIIRedactor.redact(message);
        console.log("Processing message (redacted):", cleanMessage);

        const lang = this.detectLanguage(cleanMessage);

        // 2. Retrieval
        // Simulate network delay for realism
        await new Promise(resolve => setTimeout(resolve, 600));

        const result = HybridRetriever.search(cleanMessage);

        if (result) {
            return this.extractResponseByLanguage(result.text, lang);
        }

        // 3. Fallback
        return buildFallbackResponse(lang);
    }

    private static detectLanguage(text: string): Language {
        // Simple heuristic detection
        const thaiPattern = /[\u0E00-\u0E7F]/;
        const chinesePattern = /[\u4E00-\u9FFF]/;

        if (thaiPattern.test(text)) return 'th';
        if (chinesePattern.test(text)) return 'zh';
        return 'en'; // Default to English if no Thai/Chinese chars found
    }

    private static extractResponseByLanguage(fullText: string, lang: Language): string {
        // The KB format is: English \n---\n Thai \n---\n Chinese
        const parts = fullText.split('\n---\n').map(p => p.trim());

        // If content doesn't follow the 3-part structure, fall back to full text
        if (parts.length < 3) return fullText;

        if (lang === 'en') return parts[0];
        if (lang === 'th') return parts[1];
        if (lang === 'zh') return parts[2];

        return parts[1]; // Default to Thai
    }
}
