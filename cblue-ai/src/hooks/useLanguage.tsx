import { useState, createContext, useContext, ReactNode } from 'react';
import { translations, Language } from '../data/content';

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('th');

    const t = (path: string): string => {
        const keys = path.split('.');
        let current: any = translations;

        for (const key of keys) {
            if (current[key] === undefined) return path;
            current = current[key];
        }

        if (typeof current === 'object' && current[language]) {
            return current[language];
        }

        return typeof current === 'string' ? current : path;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
