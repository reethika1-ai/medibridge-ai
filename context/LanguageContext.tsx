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

      {/* First-Visit Language Selection Modal */}
      {isMounted && showWelcomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-blue-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl ring-1 ring-white/10">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-2xl shadow-lg shadow-blue-500/30">
                🌐
              </div>
              <h2 className="mt-4 text-xl font-black text-white sm:text-2xl">
                Choose Your Language
              </h2>
              <p className="mt-1.5 text-xs text-slate-300">
                अपनी पसंदीदा भाषा चुनें · మీ ప్రాధాన్య భాషను ఎంచుకోండి
              </p>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                MediBridge AI supports multilingual voice intake and clinical triage in English, हिन्दी, and తెలుగు.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => handleSelectFromModal("en")}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                  language === "en"
                    ? "border-blue-500 bg-blue-600/20 text-white shadow-md shadow-blue-500/20"
                    : "border-slate-800 bg-slate-900/80 text-slate-200 hover:border-slate-700 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇬🇧</span>
                  <div>
                    <span className="block text-sm font-bold text-white">English</span>
                    <span className="text-xs text-slate-400">Default Clinical English</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-400">Select →</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFromModal("hi")}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                  language === "hi"
                    ? "border-blue-500 bg-blue-600/20 text-white shadow-md shadow-blue-500/20"
                    : "border-slate-800 bg-slate-900/80 text-slate-200 hover:border-slate-700 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇮🇳</span>
                  <div>
                    <span className="block text-sm font-bold text-white">हिन्दी (Hindi)</span>
                    <span className="text-xs text-slate-400">बोलकर या लिखकर लक्षण दर्ज करें</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-400">चुनें →</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFromModal("te")}
                className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                  language === "te"
                    ? "border-blue-500 bg-blue-600/20 text-white shadow-md shadow-blue-500/20"
                    : "border-slate-800 bg-slate-900/80 text-slate-200 hover:border-slate-700 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇮🇳</span>
                  <div>
                    <span className="block text-sm font-bold text-white">తెలుగు (Telugu)</span>
                    <span className="text-xs text-slate-400">వాయిస్ ద్వారా లక్షణాలను నమోదు చేయండి</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-400">ఎంచుకోండి →</span>
              </button>
            </div>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShowWelcomeModal(false)}
                className="text-xs font-semibold text-slate-400 hover:text-white underline"
              >
                Continue with English (Default)
              </button>
            </div>
          </div>
        </div>
      )}
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

