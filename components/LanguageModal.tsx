"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function LanguageModal() {
  const [isOpen, setIsOpen] = useState(true);
  const { setLanguage } = useLanguage();

  if (!isOpen) return null;

  function selectLanguage(lang: "en" | "te" | "hi") {
    setLanguage(lang);
    setIsOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-6">
        <div>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl shadow-inner text-[#00A896]">
            🌐
          </div>
          <h2 className="mt-4 text-lg sm:text-xl font-black text-slate-900">
            Select Language / భాషను ఎంచుకోండి / भाषा चुनें
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            Choose your preferred language for clinical triage and portals
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => selectLanguage("en")}
            className="w-full rounded-full border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 px-6 py-4 text-sm font-extrabold text-slate-800 hover:text-[#028090] transition shadow-xs flex items-center justify-between"
          >
            <span>🇬🇧 English (Default / Global)</span>
            <span className="text-xs text-teal-600 font-bold">Select →</span>
          </button>

          <button
            type="button"
            onClick={() => selectLanguage("te")}
            className="w-full rounded-full border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 px-6 py-4 text-sm font-extrabold text-slate-800 hover:text-[#028090] transition shadow-xs flex items-center justify-between"
          >
            <span>🇮🇳 తెలుగు (Telugu - Regional Support)</span>
            <span className="text-xs text-teal-600 font-bold">ఎంచుకోండి →</span>
          </button>

          <button
            type="button"
            onClick={() => selectLanguage("hi")}
            className="w-full rounded-full border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 px-6 py-4 text-sm font-extrabold text-slate-800 hover:text-[#028090] transition shadow-xs flex items-center justify-between"
          >
            <span>🇮🇳 हिंदी (Hindi - National Support)</span>
            <span className="text-xs text-teal-600 font-bold">चुनें →</span>
          </button>
        </div>
      </div>
    </div>
  );
}

