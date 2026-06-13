"use client";

import CustomerNavbar from "@/components/CustomerNavbar";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="mesh-gradient min-h-screen flex flex-col justify-between selection:bg-orange-100 selection:text-orange-700 bg-white dark:bg-[#0b0d11] transition-colors duration-300">
      <CustomerNavbar />

      <main className="flex-grow max-w-[800px] mx-auto w-full px-6 py-12 relative overflow-hidden">
        {/* Glow elements */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="bg-white/70 dark:bg-zinc-900/60 border border-gray-150/40 dark:border-zinc-800/40 shadow-2xl backdrop-blur-xl p-8 md:p-12 rounded-[32px] animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center shadow-inner">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {t('privacy.title', 'Privacy Policy')}
              </h1>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-550 uppercase tracking-widest mt-1">
                {t('privacy.lastUpdated', 'Last Updated')}: June 2026
              </p>
            </div>
          </div>

          <div className="h-px bg-gray-150 dark:bg-zinc-800/50 my-6" />

          <div className="space-y-6 text-sm text-gray-600 dark:text-gray-400 font-semibold leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                1. Information We Collect
              </h2>
              <p>
                We collect information when you register on our platform, place an order, or authenticate using Google Single Sign-On (SSO). This may include your name, email address, phone number, and dining table details.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                2. How We Use Your Information
              </h2>
              <p>
                Your data is processed exclusively to manage table orders, verify session authenticity, process payment transactions via Razorpay, and notify the restaurant kitchen display systems.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                3. Security & Persistent Storage
              </h2>
              <p>
                All session tokens are cryptographically secured. Selected localization preferences and dark mode states are synced and stored securely in localized databases or browser localStorage.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                4. Third-Party Integrations
              </h2>
              <p>
                Payments are handled securely by Razorpay APIs. SSO authentication is processed by Google Identity Services. We do not sell or lease customer information to third-party marketing brokers.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 border-t border-gray-150/40 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/20 text-center transition-colors">
        <p className="text-[10px] font-bold text-gray-455 dark:text-gray-500 uppercase tracking-[0.2em]">
          {t('common.copyright', '© 2026 HotByte. Encrypted SSO Authentication.')}
        </p>
      </footer>
    </div>
  );
}
