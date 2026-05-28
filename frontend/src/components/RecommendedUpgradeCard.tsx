// src/components/RecommendedUpgradeCard.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Props {
  currentPlan: string; // lower case name of current plan
  onUpgrade: (planId: number) => void;
  recommendedPlanId: number;
  recommendedPlanName: string;
}

// Simple gradient card with a glowing border indicating recommendation
export const RecommendedUpgradeCard: React.FC<Props> = ({ currentPlan, onUpgrade, recommendedPlanId, recommendedPlanName }) => {
  const badgeColors: Record<string, string> = {
    basic: "bg-amber-500",
    pro: "bg-yellow-500",
    premium: "bg-yellow-500",
  };

  const nextPlanBadge = badgeColors[recommendedPlanName.toLowerCase()] || "bg-gray-600";

  return (
    <motion.div
      className="glass-card-dark p-6 mb-8 max-w-md mx-auto border-2 border-purple-400 shadow-[0_0_20px_rgba(147,51,234,0.4)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${nextPlanBadge} text-white mb-2`}>Upgrade to {recommendedPlanName}</div>
      <h3 className="text-xl font-semibold text-white mb-3">Unlock Premium Features</h3>
      <p className="text-gray-300 mb-4">
        Your current <strong>{currentPlan}</strong> plan gives you essential tools. Upgrade to <strong>{recommendedPlanName}</strong> for:
      </p>
      <ul className="list-disc list-inside text-gray-200 mb-4 space-y-1">
        <li>QR Ordering</li>
        <li>Unlimited Menu Items</li>
        <li>Advanced Analytics</li>
        <li>Priority Support</li>
        <li>Multi‑Branch Management</li>
      </ul>
      <Button variant="default" className="w-full" onClick={() => onUpgrade(recommendedPlanId)}>
        Upgrade Now
      </Button>
    </motion.div>
  );
};

export default RecommendedUpgradeCard;
