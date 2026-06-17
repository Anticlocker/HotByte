"use client"
import React from "react";
import { motion } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Crown, Calendar, Zap } from "lucide-react";

interface Subscription {
  plan_id: number;
  name: string;
  expiry_date: string;
  status: string;
  start_date?: string;
}

interface Props {
  subscription: Subscription | null;
  onUpgrade?: (planId: number) => void;
}

const badgeConfig: Record<string, { class: string; label: string }> = {
  trial: { class: "bg-gray-700/60 border-gray-600/40 text-gray-400", label: "Trial" },
  basic: { class: "bg-blue-500/15 border-blue-500/30 text-blue-400", label: "Basic" },
  pro: { class: "bg-amber-500/15 border-amber-500/30 text-amber-400", label: "Pro" },
};

export const CurrentSubscriptionCard: React.FC<Props> = ({ subscription, onUpgrade }) => {
  if (!subscription) return null;

  const today = new Date();
  const expiry = new Date(subscription.expiry_date);
  const daysRemaining = Math.max(0, Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const totalDays = Math.max(1, Math.ceil((expiry.getTime() - new Date(subscription.start_date ?? today).getTime()) / (1000 * 60 * 60 * 24)));
  const progress = Math.round(((totalDays - daysRemaining) / totalDays) * 100);
  const isExpired = subscription.status === "expired";
  const config = badgeConfig[subscription.name.toLowerCase()] || badgeConfig.trial;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative bg-[#0e0e0e]/90 backdrop-blur-2xl border border-gray-800/60 rounded-2xl p-6 overflow-hidden"
    >
      <div className="flex items-start gap-6">
        <div className="w-20 h-20 flex-shrink-0">
          <CircularProgressbar
            value={isExpired ? 100 : progress}
            text={isExpired ? "0d" : `${daysRemaining}d`}
            styles={buildStyles({
              textColor: "#9ca3af",
              pathColor: isExpired ? "#ef4444" : "#10b981",
              trailColor: "rgba(255,255,255,0.06)",
              textSize: "22px",
              strokeLinecap: "round",
            })}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Crown size={14} className="text-amber-500" />
            <span className={`inline-flex px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${config.class}`}>
              {config.label}
            </span>
            <span className={`text-[10px] font-black uppercase tracking-wider ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
              {isExpired ? 'Expired' : `Active — ${daysRemaining}d left`}
            </span>
          </div>
          <h2 className="text-lg font-black text-white mb-1">Current Plan</h2>
          <div className="flex items-center gap-4 text-[11px] text-gray-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              Expires {expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
        {!isExpired && onUpgrade && (
          <button
            onClick={() => onUpgrade(subscription.plan_id)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all duration-300 cursor-pointer"
          >
            <Zap size={12} />
            Upgrade
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default CurrentSubscriptionCard;
