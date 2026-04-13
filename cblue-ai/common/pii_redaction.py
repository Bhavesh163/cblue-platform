import re

class PIIRedactor:
    PATTERNS = {
        'phone': r'\b0[0-9]{1,2}[-\s]?[0-9]{3}[-\s]?[0-9]{4}\b',
        'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'thai_id': r'\b[0-9]{1}-[0-9]{4}-[0-9]{5}-[0-9]{2}-[0-9]\b',
    }
    
    @staticmethod
    def redact(text: str) -> str:
        for name, pattern in PIIRedactor.PATTERNS.items():
            text = re.sub(pattern, f'[REDACTED_{name.upper()}]', text)
        return text
    
    @staticmethod
    def detect(text: str) -> bool:
        return any(re.search(pattern, text) for pattern in PIIRedactor.PATTERNS.values())
