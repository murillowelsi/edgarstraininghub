
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import ptTranslations from '../translations/pt.json';
import enTranslations from '../translations/en.json';

type TranslationsType = typeof ptTranslations;
type LanguageType = 'pt' | 'en';

interface LanguageContextType {
  language: LanguageType;
  t: TranslationsType;
  changeLanguage: (lang: LanguageType) => void;
}

const translations = {
  pt: ptTranslations,
  en: enTranslations
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Get language from localStorage or default to English
  const [language, setLanguage] = useState<LanguageType>(() => {
    const savedLanguage = localStorage.getItem('language') as LanguageType;
    return savedLanguage && ['pt', 'en'].includes(savedLanguage) ? savedLanguage : 'en';
  });

  // Save language preference to localStorage
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const changeLanguage = (lang: LanguageType) => {
    setLanguage(lang);
  };

  const value = {
    language,
    t: translations[language],
    changeLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
