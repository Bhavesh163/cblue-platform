export class PIIRedactor {
    private static PATTERNS: Record<string, RegExp> = {
        phone: /\b0[0-9]{1,2}[-\s]?[0-9]{3}[-\s]?[0-9]{4}\b/g,
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        thai_id: /\b[0-9]{1}-[0-9]{4}-[0-9]{5}-[0-9]{2}-[0-9]\b/g,
    };

    static redact(text: string): string {
        let redactedText = text;
        for (const [name, pattern] of Object.entries(PIIRedactor.PATTERNS)) {
            redactedText = redactedText.replace(pattern, `[REDACTED_${name.toUpperCase()}]`);
        }
        return redactedText;
    }

    static detect(text: string): boolean {
        return Object.values(PIIRedactor.PATTERNS).some(pattern => pattern.test(text));
    }
}
