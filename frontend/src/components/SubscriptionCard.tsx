"use client"
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Star, Sparkles } from 'lucide-react';

interface Props {
  plan: {
    plan_id: number;
    name: string;
    price_monthly: number;
    price_yearly: number;
    features: any;
  };
  currentSubscription?: {
    plan_id: number;
    expiry_date: string;
    status: string;
    start_date?: string;
  };
  onRenew: (planId: number) => void;
  onUpgrade: (planId: number) => void;
  isRecommended?: boolean;
}

const planConfig: Record<string, { icon: any; gradient: string; badgeClass: string; accent: string }> = {
  trial: {
    icon: Sparkles,
    gradient: 'from-gray-600 to-gray-500',
    badgeClass: 'bg-gray-700/60 border-gray-600/40 text-gray-400',
    accent: 'text-gray-400'
  },
  basic: {
    icon: Star,
    gradient: 'from-blue-600 to-blue-500',
    badgeClass: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
    accent: 'text-blue-400'
  },
  pro: {
    icon: Crown,
    gradient: 'from-amber-500 to-yellow-500',
    badgeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    accent: 'text-amber-400'
  }
};

export const SubscriptionCard: React.FC<Props> = ({ plan, currentSubscription, onRenew, onUpgrade, isRecommended }) => {
  const key = plan.name.toLowerCase();
  const config = planConfig[key] || planConfig.basic;
  const Icon = config.icon;

  const isCurrent = currentSubscription?.plan_id === plan.plan_id;
  const now = Date.now();
  const daysRemaining = currentSubscription && now
    ? Math.max(0, Math.ceil((new Date(currentSubscription.expiry_date).getTime() - now) / (1000 * 60 * 60 * 24)))
    : null;
  const expired = currentSubscription?.status === 'expired';
  const isFree = plan.price_monthly === 0;

  const featuresList = useMemo(() => {
    if (!plan.features) return [];
    return Object.entries(plan.features)
      .filter(([, val]) => val === true || (typeof val === 'string' && val !== '0'))
      .slice(0, 8)
      .map(([key, val]) => {
        const label = key.replace(/\//g, ' / ');
        if (typeof val === 'string') return `${label} — ${val}`;
        return label;
      });
  }, [plan.features]);

  const handleCTA = () => {
    if (isCurrent && !expired) {
      onRenew(plan.plan_id);
    } else {
      onUpgrade(plan.plan_id);
    }
  };

  const ctaLabel = isFree && !isCurrent
    ? 'Get Started'
    : isCurrent && !expired
    ? 'Renew Plan'
    : isCurrent && expired
    ? 'Reactivate'
    : 'Upgrade';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col bg-[#0e0e0e]/90 backdrop-blur-2xl border rounded-2xl p-6 transition-all duration-500 ${
        isRecommended
          ? 'border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.15)]'
          : 'border-gray-800/60 hover:border-gray-700'
      } hover:translate-y-[-4px] hover:shadow-2xl`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full text-[9px] font-black uppercase tracking-wider text-black shadow-lg shadow-amber-500/30 z-10">
          Best Value
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${config.badgeClass}`}>
          <Icon size={12} />
          {plan.name}
        </div>
        {isCurrent && (
          <span className={`text-[9px] font-black uppercase tracking-wider ${expired ? 'text-red-400' : 'text-emerald-400'}`}>
            {expired ? 'Expired' : 'Active'}
          </span>
        )}
      </div>

      <div className="mb-5">
        {isFree ? (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white">Free</span>
            <span className="text-xs text-gray-500 font-semibold">Trial</span>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">₹{plan.price_monthly.toLocaleString('en-IN')}</span>
              <span className="text-xs text-gray-500 font-semibold">/mo</span>
            </div>
            <p className="text-[10px] text-gray-600 font-semibold mt-1">
              ₹{plan.price_yearly.toLocaleString('en-IN')}/year
            </p>
          </div>
        )}
      </div>

      {isCurrent && currentSubscription && daysRemaining !== null && (
        <div className="mb-5 p-3 bg-white/[0.03] border border-gray-800/60 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Days Remaining</span>
            <span className={`text-xs font-black ${daysRemaining <= 3 && !expired ? 'text-red-400' : 'text-gray-300'}`}>
              {expired ? 'Expired' : `${daysRemaining}d`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${daysRemaining <= 0 ? 100 : Math.max(3, (daysRemaining / 30) * 100)}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full ${expired ? 'bg-red-500' : 'bg-emerald-500'}`}
            />
          </div>
        </div>
      )}

      {featuresList.length > 0 && (
        <div className="flex-1 space-y-2 mb-6">
          {featuresList.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Check size={10} className="text-emerald-400" />
              </div>
              <span className="text-[11px] text-gray-400 font-semibold">{feature}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleCTA}
        className={`w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
          isCurrent && !expired
            ? 'bg-white/5 border border-gray-700 text-gray-300 hover:bg-white/10 hover:border-gray-600'
            : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30'
        }`}
      >
        {ctaLabel}
      </button>
    </motion.div>
  );
};

export default SubscriptionCard;
