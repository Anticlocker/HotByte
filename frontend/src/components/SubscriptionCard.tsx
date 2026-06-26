"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Star, Sparkles } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Plan {
  plan_id: number;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: any; // may be string | string[] | object from API
}

interface CurrentSubscription {
  plan_id: number;
  expiry_date: string;
  status: string;
  start_date?: string;
}

interface Props {
  plan: Plan;
  currentSubscription?: CurrentSubscription;
  onRenew: (planId: number) => void;
  onUpgrade: (planId: number) => void;
  isRecommended?: boolean;
}

// ─── Hardcoded fallback feature lists (matches backend PLAN_FEATURES) ─────────
const FALLBACK_FEATURES: Record<string, string[]> = {
  trial: [
    '14-Day Free Trial',
    '1 Restaurant',
    'Unlimited Categories',
    'Unlimited Menu Items',
    'QR Digital Menu',
    'Table Wise QR Ordering',
    'Hotel QR Payment',
    'Google Customer Login',
    'Customer Auth Toggle',
    'Location Based Ordering',
    'Order Management',
    'Ratings & Reviews',
    'Basic Analytics',
    'Email Support',
  ],
  basic: [
    'Everything in Trial',
    'Unlimited Orders',
    'Up to 3 Admin Managers',
    'Sales Dashboard',
    'Customer Logs',
    'Restaurant Branding',
    'Daily Sales Reports',
    'Restaurant Settings',
    'Priority Email Support',
    'Monthly Database Backup',
    'Performance Optimizations',
  ],
  pro: [
    'Everything in Basic',
    'Unlimited Admin Managers',
    'Unlimited Staff Accounts',
    'Kitchen Display System (KDS)',
    'Advanced Analytics',
    'Peak Hour Reports',
    'Table Management',
    'Premium QR Payment Verification',
    'Restaurant Insights',
    'Premium Dashboard',
    'Dedicated Priority Support',
    'Early Access Features',
    'Future Enterprise Features',
  ],
};

// ─── Normalize features from any shape into string[] ─────────────────────────
function normalizeFeatures(features: any): string[] {
  if (!features) return [];

  // Already a proper string array
  if (Array.isArray(features)) {
    const strings = features.filter((f) => typeof f === 'string' && f.trim().length > 0);
    // Guard: if we got character-level iteration (e.g. from a stringified JSON),
    // all items will be 1-2 chars long — treat as broken
    if (strings.length > 0 && strings.every((s) => s.length <= 2)) return [];
    return strings;
  }

  // Plain string — attempt JSON.parse
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features);
      return normalizeFeatures(parsed); // recurse
    } catch {
      return [];
    }
  }

  // Key-value object (old format: {"QR Menu": true, "Tables": "Unlimited"})
  if (typeof features === 'object') {
    return Object.entries(features)
      .filter(([, v]) => v === true || (typeof v === 'string' && v !== '0' && v !== 'false'))
      .map(([k, v]) => (typeof v === 'string' && v !== 'true' ? `${k}: ${v}` : k));
  }

  return [];
}

// ─── Plan visual config ───────────────────────────────────────────────────────
const planConfig: Record<string, { icon: any; badgeClass: string; checkColor: string; glowClass: string }> = {
  trial: {
    icon: Sparkles,
    badgeClass: 'bg-gray-700/60 border-gray-600/40 text-gray-300',
    checkColor: 'text-orange-400',
    glowClass: '',
  },
  basic: {
    icon: Star,
    badgeClass: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
    checkColor: 'text-orange-400',
    glowClass: '',
  },
  pro: {
    icon: Crown,
    badgeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    checkColor: 'text-orange-400',
    glowClass: 'shadow-[0_0_40px_rgba(245,158,11,0.12)]',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export const SubscriptionCard: React.FC<Props> = ({
  plan,
  currentSubscription,
  onRenew,
  onUpgrade,
  isRecommended,
}) => {
  const key = plan.name.toLowerCase();
  const config = planConfig[key] || planConfig.basic;
  const Icon = config.icon;

  const isCurrent = currentSubscription?.plan_id === plan.plan_id;
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (currentSubscription) {
      const diff = new Date(currentSubscription.expiry_date).getTime() - Date.now();
      setDaysRemaining(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
    } else {
      setDaysRemaining(null);
    }
  }, [currentSubscription]);

  const expired = currentSubscription?.status === 'expired';
  const isFree = plan.price_monthly === 0 || plan.price_monthly === 1;

  // ── Feature list resolution ──────────────────────────────────────────────
  const featuresList = useMemo(() => {
    const normalized = normalizeFeatures(plan.features);
    // Fallback to hardcoded list if normalization returns < 3 items (corrupted data)
    if (normalized.length < 3 && FALLBACK_FEATURES[key]) return FALLBACK_FEATURES[key];
    return normalized;
  }, [plan.features, key]);

  // ── CTA ──────────────────────────────────────────────────────────────────
  const handleCTA = () => {
    if (isCurrent && !expired) onRenew(plan.plan_id);
    else onUpgrade(plan.plan_id);
  };

  const ctaLabel =
    isFree && !isCurrent
      ? 'Get Started Free'
      : isCurrent && !expired
      ? 'Renew Plan'
      : isCurrent && expired
      ? 'Reactivate'
      : 'Upgrade Now';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col bg-[#0e0e0e]/90 backdrop-blur-2xl border rounded-2xl p-6 transition-all duration-500 ${
        isRecommended
          ? `border-amber-500/40 ${config.glowClass}`
          : 'border-gray-800/60 hover:border-gray-700/80'
      } hover:-translate-y-1 hover:shadow-2xl`}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full text-[9px] font-black uppercase tracking-widest text-black shadow-lg shadow-amber-500/30 z-10 whitespace-nowrap">
          ✦ Best Value
        </div>
      )}

      {/* Header: badge + active status */}
      <div className="flex items-center justify-between mb-5">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${config.badgeClass}`}
        >
          <Icon size={11} />
          {plan.name}
        </div>
        {isCurrent && (
          <span
            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              expired
                ? 'text-red-400 border-red-500/30 bg-red-500/10'
                : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
            }`}
          >
            {expired ? '● Expired' : '● Active'}
          </span>
        )}
      </div>

      {/* Pricing */}
      <div className="mb-5">
        {isFree ? (
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">₹1</span>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-semibold leading-tight">14 Days</span>
              <span className="text-[10px] text-orange-400/80 font-bold leading-tight">Free Trial</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black text-white">
                ₹{plan.price_monthly.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-gray-500 font-semibold">/mo</span>
            </div>
            <p className="text-[10px] text-gray-600 font-semibold mt-1">
              ₹{plan.price_yearly.toLocaleString('en-IN')} billed yearly
            </p>
          </div>
        )}
      </div>

      {/* Days remaining progress */}
      {isCurrent && currentSubscription && daysRemaining !== null && (
        <div className="mb-5 p-3 bg-white/[0.03] border border-gray-800/60 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              Days Remaining
            </span>
            <span
              className={`text-xs font-black ${
                daysRemaining <= 3 && !expired ? 'text-red-400' : 'text-gray-300'
              }`}
            >
              {expired ? 'Expired' : `${daysRemaining}d`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${daysRemaining <= 0 ? 100 : Math.max(3, (daysRemaining / 30) * 100)}%`,
              }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full ${expired ? 'bg-red-500' : 'bg-emerald-500'}`}
            />
          </div>
        </div>
      )}

      {/* Features list — renders a clean string array */}
      <div className="flex-1 space-y-2 mb-6">
        {featuresList.length > 0 ? (
          featuresList.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <div className="w-4 h-4 mt-0.5 rounded-full bg-orange-500/10 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                <Check size={9} className="text-orange-400" />
              </div>
              <span className="text-[11px] text-gray-300 font-medium leading-snug">{feature}</span>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-gray-600 italic">No features listed.</p>
        )}
      </div>

      {/* CTA Button */}
      <button
        onClick={handleCTA}
        id={`cta-${key}-plan`}
        className={`w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-[0.98] ${
          isCurrent && !expired
            ? 'bg-white/5 border border-gray-700 text-gray-300 hover:bg-white/10 hover:border-gray-600'
            : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/35 hover:-translate-y-0.5'
        }`}
      >
        {ctaLabel}
      </button>
    </motion.div>
  );
};

export default SubscriptionCard;
