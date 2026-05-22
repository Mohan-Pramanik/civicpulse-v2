import React, { createContext, useContext, useState } from 'react';
import { translations, LANGUAGES } from '../translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    () => localStorage.getItem('civicpulse_lang') || 'en'
  );

  const switchLang = (code) => {
    setLang(code);
    localStorage.setItem('civicpulse_lang', code);
  };

  const t = translations[lang] || translations['en'];

  return (
    <LanguageContext.Provider value={{ lang, switchLang, t, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}