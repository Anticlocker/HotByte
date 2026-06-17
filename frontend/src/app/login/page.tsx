"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import CustomerNavbar from "@/components/CustomerNavbar";
import Footer from "@/components/Footer";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useNotification } from "@/context/NotificationContext";
import { logger } from "@/lib/utils/logger";
import '@/i18n';

function LoginContent() {
  const notif = useNotification();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hotelSlug = searchParams?.get("hotel") || "hotbyte";

  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const googleInitialized = useRef(false);
  const loginCallbackRef = useRef<any>(null);

  useEffect(() => {
    // 1. Session check to redirect logged-in users to their correct menu
    fetch(`/api/auth/session-check?hotel_slug=${hotelSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          router.push(`/${hotelSlug}/menu`);
        }
      })
      .catch(() => {});

    // 2. Fetch Google Client ID from backend config
    fetch("/api/auth/google-config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setClientId(data.clientId);
        }
      })
      .catch(() => {});
  }, [router, hotelSlug]);

  const handleGoogleLoginResponse = async (response: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: response.credential,
          hotelSlug,
        }),
      });
      const data = await res.json();

      if (data.success) {
        notif.success(t('login.loggedIn'), t('login.welcomeMsg'));
        router.push(`/${hotelSlug}/menu`);
      } else {
        notif.error(t('login.verificationFailed'), data.message || "Google login failed.");
      }
    } catch (err) {
      notif.error(t('login.networkError'), t('login.networkErrorMsg'));
    } finally {
      setLoading(false);
    }
  };

  // Keep callback ref up to date without triggering re-initialization
  useEffect(() => {
    loginCallbackRef.current = handleGoogleLoginResponse;
  });

  useEffect(() => {
    if (!clientId || !googleScriptLoaded || googleInitialized.current) return;

    try {
      googleInitialized.current = true;
      // @ts-ignore
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: (res: any) => loginCallbackRef.current?.(res),
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: false,
      });

      // @ts-ignore
      window.google?.accounts.id.renderButton(
        document.getElementById("google-login-btn"),
        {
          theme: "filled_blue",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "pill",
        }
      );

      // Only prompt One Tap in non-local environments to prevent FedCM origin mismatches
      if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        // @ts-ignore
        window.google?.accounts.id.prompt((_notification: any) => {
          // One Tap prompt shown
        });
      }
    } catch (err) {
      googleInitialized.current = false;
      logger.error("Failed to render Google Login button:", err);
    }
  }, [clientId, googleScriptLoaded]);

  return (
    <div className="mesh-gradient min-h-screen flex flex-col justify-between selection:bg-orange-100 selection:text-orange-700 bg-white dark:bg-[#0b0d11] transition-colors duration-300 pt-14">
      <CustomerNavbar />
      
      {/* Load Google Client Script Dynamically */}
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={() => setGoogleScriptLoaded(true)}
        onError={() => logger.error("Google Sign-In SDK failed to load")}
        strategy="afterInteractive"
      />

      <main className="flex-grow flex items-center justify-center py-12 px-6 relative overflow-hidden">
        {/* Glow elements */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-white/70 dark:bg-zinc-900/60 border border-gray-150/40 dark:border-zinc-800/40 shadow-2xl backdrop-blur-xl p-8 rounded-[32px] animate-fade-in-up text-center flex flex-col items-center">
          
          {/* Header Badge */}
          <div className="w-16 h-16 rounded-3xl bg-orange-50 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center text-2xl shadow-inner mb-6 animate-pulse">
            <KeyRound size={26} />
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
            {t('login.title')}
          </h2>
          
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-8">
            {t('login.subtitle')}
          </p>
          


          <div className="w-full bg-[#fafafa] dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800/30 rounded-2xl py-5 px-6 mb-8 flex flex-col items-center justify-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('login.scopedTo')}</span>
            <span className="text-xs font-extrabold text-orange-500 uppercase tracking-widest font-mono">
              {hotelSlug === "hotbyte" ? t('login.platform') : `${t('login.hotel')}: ${hotelSlug}`}
            </span>
          </div>

          {/* Google Sign-in Widget Holder */}
          <div className="w-full flex flex-col items-center justify-center min-h-[50px] relative z-10 my-4 gap-4">
            {!clientId ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t('login.preparing')}</span>
              </div>
            ) : (
              <div id="google-login-btn" className="transition-all duration-300 hover:scale-103 active:scale-97"></div>
            )}

            {/* Legal agreement text */}
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 text-center leading-relaxed px-2">
              By continuing, you agree to our{" "}
              <Link href="/terms-and-conditions" className="text-orange-500 hover:underline font-bold">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" className="text-orange-500 hover:underline font-bold">
                Privacy Policy
              </Link>.
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2.5 mt-6 text-sm font-bold text-orange-500 animate-pulse">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <span>{t('login.verifying')}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mt-8 text-gray-400 dark:text-gray-600">
            <ShieldCheck size={16} />
            <span className="text-[11px] font-semibold tracking-wide uppercase">
              {t('login.poweredBy')}
            </span>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="bg-[#0b0d11] min-h-screen text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 animate-pulse">Loading login terminal...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
