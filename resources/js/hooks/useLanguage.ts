import { Language, TranslationKey, translations } from '@/locales';
import { useEffect, useState } from 'react';

export function useLanguage() {
    const [language, setLanguage] = useState<Language>('id');

    // 🔹 Ambil dari localStorage saat pertama load
    useEffect(() => {
        const saved = localStorage.getItem('app-language') as Language | null;
        if (saved && translations[saved]) {
            setLanguage(saved);
        }
    }, []);

    // 🔹 Simpan ke localStorage setiap berubah
    useEffect(() => {
        localStorage.setItem('app-language', language);
    }, [language]);

    const t = (key: TranslationKey) => {
        return translations[language][key] ?? key;
    };

    return {
        language,
        setLanguage,
        t,
    };
}
