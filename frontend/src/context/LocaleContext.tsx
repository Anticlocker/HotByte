"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '../i18n';

interface LocaleContextProps {
  locale: string;
  setLocale: (l: string) => void;
}

const LocaleContext = createContext<LocaleContextProps | undefined>(undefined);

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<string>('en');

  // On mount: load from localStorage, then try to sync from server session
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Quick-load from localStorage for instant display
    const stored = localStorage.getItem('hotbyte_locale') || 'en';
    setLocaleState(stored);
    i18n.changeLanguage(stored);

    // 2. Check server session for DB-persisted locale
    const syncFromSession = async () => {
      try {
        // Try customer session first
        const customerRes = await fetch('/api/auth/session-check');
        const customerData = await customerRes.json();
        if (customerData.authenticated && customerData.customer?.locale) {
          const dbLocale = customerData.customer.locale;
          if (dbLocale !== stored) {
            setLocaleState(dbLocale);
            localStorage.setItem('hotbyte_locale', dbLocale);
            i18n.changeLanguage(dbLocale);
          }
          return;
        }

        // Try admin session
        const adminRes = await fetch('/api/auth/admin/session-check');
        const adminData = await adminRes.json();
        if (adminData.authenticated && adminData.admin?.locale) {
          const dbLocale = adminData.admin.locale;
          if (dbLocale !== stored) {
            setLocaleState(dbLocale);
            localStorage.setItem('hotbyte_locale', dbLocale);
            i18n.changeLanguage(dbLocale);
          }
        }
      } catch {
        // Silently ignore — localStorage value is already applied
      }
    };

    syncFromSession();
  }, []);

  const setLocale = (l: string) => {
    setLocaleState(l);
    i18n.changeLanguage(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem('hotbyte_locale', l);
    }
    // Persist to database (fire-and-forget)
    fetch('/api/user/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: l }),
    }).catch(() => {});
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
};
