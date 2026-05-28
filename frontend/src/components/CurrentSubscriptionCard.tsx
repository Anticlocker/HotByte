// src/components/CurrentSubscriptionCard.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Button } from "@/components/ui/button";

interface Subscription {
  plan_id: number;
  name: string; // basic / pro / premium
  expiry_date: string; // ISO string
  status: string; // active | expired
  start_date?: string;
}

interface Props {
  subscription: Subscription | null;
  onUpgrade?: (planId: number) => void;
}

const badgeColors: Record<string, string> = {
  trial: "bg-teal-500",
  basic: "bg-amber-500",
  pro: "bg-yellow-500",
  premium: "bg-yellow-500",
};

export const CurrentSubscriptionCard: React.FC<Props> = ({ subscription, onUpgrade }) => {
  if (!subscription) return null;

  const today = new Date();
  const expiry = new Date(subscription.expiry_date);
  const daysRemaining = Math.max(0, Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const totalDays = Math.max(
    1,
    Math.ceil((expiry.getTime() - new Date(subscription.start_date ?? today).getTime()) / (1000 * 60 * 60 * 24))
  );
  const progress = Math.round(((totalDays - daysRemaining) / totalDays) * 100);
  const isExpired = subscription.status === "expired";

  const badgeClass = badgeColors[subscription.name.toLowerCase()] || "bg-gray-600";

  return (
    <motion.div
      className="glass-card-dark p-6 mb-8 max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${badgeClass} text-white mb-2`}>
        {subscription.name.charAt(0).toUpperCase() + subscription.name.slice(1)}
      </div>
      <h2 className="text-2xl font-semibold text-white mb-2">Current Plan</h2>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16">
          <CircularProgressbar
            value={progress}
            text={`${daysRemaining}d`}
            styles={buildStyles({
              textColor: "#fff",
              pathColor: isExpired ? "#ff5a1f" : "#10b981",
              trailColor: "rgba(255,255,255,0.2)",
            })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-gray-300">Expires: {expiry.toLocaleDateString()}</p>
          <p className={`text-sm ${isExpired ? "text-red-400" : "text-green-400"}`}>Status: {subscription.status}</p>
        </div>
      </div>
      {!isExpired && onUpgrade && (
        <Button variant="outline" className="mt-4 w-full" onClick={() => onUpgrade(subscription.plan_id)}>
          Upgrade Plan
        </Button>
      )}
    </motion.div>
  );
};

export default CurrentSubscriptionCard;
