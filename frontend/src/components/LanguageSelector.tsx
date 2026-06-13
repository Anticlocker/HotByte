"use client";

import { useEffect, useState, useRef } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
];

export default function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const switchLocale = (langCode: string) => {
    setLocale(langCode); // This now also calls i18n.changeLanguage via LocaleContext
    setOpen(false);
  };

  const currentLang = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="nav-action-btn"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Globe className="h-[15px] w-[15px] opacity-70" />
        <span className="hidden sm:inline">{currentLang.label}</span>
        <span className="sm:hidden uppercase">{currentLang.code}</span>
        <ChevronDown className={`h-3 w-3 opacity-60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute right-0 mt-2 min-w-[140px] origin-top-right rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-gray-200 dark:border-slate-800/60 shadow-lg shadow-black/5 dark:shadow-black/30 z-50 transition-all duration-200 ease-out p-1 ${
          open
            ? "opacity-100 scale-100 pointer-events-auto translate-y-0"
            : "opacity-0 scale-95 pointer-events-none -translate-y-2"
        }`}
      >
        {LANGUAGES.map(lang => {
          const isSelected = lang.code === locale;
          return (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              className={`flex items-center justify-between w-full px-3 py-2 text-left text-xs font-semibold rounded-md transition-all duration-150 ${
                isSelected
                  ? "text-orange-600 dark:text-orange-400 bg-orange-50/60 dark:bg-orange-950/20"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/60 dark:hover:bg-slate-800/60"
              }`}
            >
              <span>{lang.label}</span>
              {isSelected && <Check className="h-3.5 w-3.5 text-orange-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
