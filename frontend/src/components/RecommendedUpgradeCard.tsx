"use client"
import React from "react";
import { motion } from "framer-motion";
import { Zap, ArrowRight, Crown } from "lucide-react";

interface Props {
  currentPlan: string;
  onUpgrade: (planId: number) => void;
  recommendedPlanId: number;
  recommendedPlanName: string;
}

export const RecommendedUpgradeCard: React.FC<Props> = ({ currentPlan, onUpgrade, recommendedPlanId, recommendedPlanName }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="relative bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-orange-500/5 backdrop-blur-2xl border border-amber-500/20 rounded-2xl p-6 overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 flex items-start gap-5">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Crown size={20} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2">
            <Zap size={11} />
            Upgrade to {recommendedPlanName}
          </div>
          <h3 className="text-base font-black text-white mb-1">Unlock Premium Features</h3>
          <p className="text-[11px] text-gray-500 font-semibold mb-4">
            Your current <span className="text-gray-300 uppercase">{currentPlan}</span> plan gives you essential tools. Upgrade to{' '}
            <span className="text-gray-300 uppercase">{recommendedPlanName}</span> for more.
          </p>
          <button
            onClick={() => onUpgrade(recommendedPlanId)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all duration-300 cursor-pointer"
          >
            Upgrade Now
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default RecommendedUpgradeCard;
