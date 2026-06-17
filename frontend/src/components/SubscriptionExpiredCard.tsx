"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface SubscriptionExpiredCardProps {
  plan: string;
  trialEndsAt?: string | null;
  subscriptionExpiryDate?: string | null;
  daysSinceExpiry: number;
  gracePeriodRemaining: number | null;
  isAdmin?: boolean;
  hotelSlug?: string | null;
}

export default function SubscriptionExpiredCard({
  plan,
  trialEndsAt,
  subscriptionExpiryDate,
  daysSinceExpiry,
  gracePeriodRemaining,
  isAdmin = false,
  hotelSlug,
}: SubscriptionExpiredCardProps) {
  const router = useRouter();

  const expiryDate = plan === "trial" ? trialEndsAt : subscriptionExpiryDate;
  const formattedDate = expiryDate
    ? new Date(expiryDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const planLabel = plan === "trial" ? "Free Trial" : plan === "basic" ? "Basic Plan" : "Pro Plan";

  const handleRenew = () => {
    if (isAdmin && hotelSlug) {
      router.push(`/admin/subscription-plans?hotel=${hotelSlug}`);
    } else {
      router.push(`/${hotelSlug || "hotbyte"}/upgrade`);
    }
  };

  const handleContact = () => {
    window.location.href = "mailto:support@hotbyte.in";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/15 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/15 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-rose-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }}></div>

      {/* Premium subscription card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-xl bg-white/95 dark:bg-[#0e0e0e]/95 backdrop-blur-2xl border border-gray-200/60 dark:border-gray-800/60 rounded-[32px] shadow-2xl dark:shadow-black/40 overflow-hidden"
      >
        {/* Top accent gradient bar */}
        <div className="h-2 w-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-500"></div>

        <div className="p-8 md:p-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight">
                  {isAdmin ? "Subscription Expired" : "Temporarily Unavailable"}
                </h2>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  {isAdmin ? "Action required to restore service" : "This restaurant's plan has expired"}
                </p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
              <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider">Expired</span>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-6"></div>

          {/* Plan details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800/60 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Plan</p>
              <p className="text-sm font-black text-gray-900 dark:text-gray-100">{planLabel}</p>
            </div>
            <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-800/60 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Expired On</p>
              <p className="text-sm font-black text-gray-900 dark:text-gray-100">{formattedDate}</p>
            </div>
          </div>

          {/* Days expired / grace period banner */}
          <div className={`rounded-2xl p-4 mb-6 border ${
            gracePeriodRemaining !== null && gracePeriodRemaining > 0
              ? "bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20"
              : "bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {gracePeriodRemaining !== null && gracePeriodRemaining > 0 ? (
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className={`text-xs font-bold ${
                gracePeriodRemaining !== null && gracePeriodRemaining > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-red-700 dark:text-red-400"
              }`}>
                {daysSinceExpiry === 0
                  ? "Expired today"
                  : `Expired ${daysSinceExpiry} day${daysSinceExpiry > 1 ? "s" : ""} ago`}
              </span>
            </div>
            {gracePeriodRemaining !== null && gracePeriodRemaining > 0 && (
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-500 mt-1">
                Grace period: {gracePeriodRemaining} day{gracePeriodRemaining > 1 ? "s" : ""} remaining
              </p>
            )}
          </div>

          {/* Message */}
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 mb-8">
            {isAdmin
              ? "Your HotByte subscription has expired. Renew now to continue receiving customer orders and managing your restaurant."
              : "This restaurant's HotByte subscription has expired. Please contact the restaurant owner to restore service."}
          </p>

          {/* Action buttons */}
          {isAdmin ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRenew}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/20 transition-all duration-200"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Renew Subscription
                </span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/admin/subscription-plans?hotel=${hotelSlug || ""}`)}
                className="flex-1 px-6 py-3.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-sm font-black uppercase tracking-wider rounded-2xl border border-gray-200 dark:border-gray-700 transition-all duration-200"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  View Plans
                </span>
              </motion.button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleContact}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/20 transition-all duration-200"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Restaurant
                </span>
              </motion.button>
            </div>
          )}

          {/* Support footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800/60">
            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Need help?</span>
              <a
                href="mailto:support@hotbyte.in"
                className="text-[10px] font-black text-orange-500 hover:text-orange-400 uppercase tracking-wider transition-colors"
              >
                support@hotbyte.in
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
