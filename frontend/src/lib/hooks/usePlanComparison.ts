// src/lib/hooks/usePlanComparison.ts
"use client";

interface Feature {
  name: string;
  icon: string; // name of lucide-react icon component
}

interface PlanBenefits {
  plan: string; // basic | pro | premium
  features: Feature[];
}

// Simple static data – can be replaced by an API later.
export const usePlanComparison = (): PlanBenefits[] => {
  return [
    {
      plan: "basic",
      features: [
        { name: "QR Ordering", icon: "QrCode" },
        { name: "Unlimited Menu Items", icon: "List" },
        { name: "Analytics (Basic)", icon: "BarChart2" },
      ],
    },
    {
      plan: "pro",
      features: [
        { name: "QR Ordering", icon: "QrCode" },
        { name: "Unlimited Menu Items", icon: "List" },
        { name: "Advanced Analytics", icon: "BarChart" },
        { name: "Priority Support", icon: "LifeBuoy" },
      ],
    },
    {
      plan: "premium",
      features: [
        { name: "QR Ordering", icon: "QrCode" },
        { name: "Unlimited Menu Items", icon: "List" },
        { name: "Full Analytics Suite", icon: "BarChartBig" },
        { name: "Priority Support", icon: "LifeBuoy" },
        { name: "Multi‑Branch Support", icon: "Layers" },
      ],
    },
  ];
};
