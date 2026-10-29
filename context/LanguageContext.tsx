"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Language, translations, TranslationKey } from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  showWelcomeModal: boolean;
  setShowWelcomeModal: (show: boolean) => void;
  t: (key: TranslationKey | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    const savedLang = localStorage.getItem("medibridge_lang") as Language | null;
    if (savedLang && (savedLang === "en" || savedLang === "hi" || savedLang === "te")) {
      setLanguageState(savedLang);
    } else {
      // First visit: show welcome language selection modal
      setShowWelcomeModal(true);
    }
  }, []);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("medibridge_lang", lang);
    }
  }

  function handleSelectFromModal(lang: Language) {
    setLanguage(lang);
    setShowWelcomeModal(false);
  }

  function t(key: TranslationKey | string): string {
    const langDict = translations[language] as Record<string, string>;
    const enDict = translations.en as Record<string, string>;
    return langDict?.[key] || enDict?.[key] || key;
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        showWelcomeModal,
        setShowWelcomeModal,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

