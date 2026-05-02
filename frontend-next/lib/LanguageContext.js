"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState('fr'); // Default to French

    useEffect(() => {
        const savedLang = localStorage.getItem('kanjilock_lang');
        if (savedLang && ['en', 'fr', 'jp'].includes(savedLang)) {
            setLang(savedLang);
        }
    }, []);

    const changeLanguage = (newLang) => {
        if (['en', 'fr', 'jp'].includes(newLang)) {
            setLang(newLang);
            localStorage.setItem('kanjilock_lang', newLang);
        }
    };

    const t = (path) => {
        try {
            const keys = path.split('.');
            let result = translations[lang];
            for (const key of keys) {
                result = result[key];
            }
            return result || path;
        } catch (e) {
            console.warn(`Translation key not found: ${path}`);
            return path;
        }
    };

    return (
        <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
