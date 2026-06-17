"use client";

interface Feature {
  name: string;
  trial?: string | boolean;
  basic?: string | boolean;
  pro?: string | boolean;
}

interface PlanBenefits {
  plan: string;
  features: Feature[];
}

export const usePlanComparison = (): PlanBenefits[] => {
  return [
    {
      plan: "trial",
      features: [
        { name: "QR Menu System", trial: "5 Tables", basic: "Unlimited", pro: "Unlimited" },
        { name: "Digital Menu Card", trial: true, basic: true, pro: true },
        { name: "Online Ordering", trial: "Basic", basic: "Full", pro: "Full" },
        { name: "Dynamic QR per Table", trial: false, basic: true, pro: true },
        { name: "Menu Items", trial: "Up to 30", basic: "Unlimited", pro: "Unlimited" },
        { name: "Categories", trial: "Up to 5", basic: "Unlimited", pro: "Unlimited" },
        { name: "Razorpay Payments", trial: false, basic: true, pro: true },
        { name: "Kitchen Display System", trial: false, basic: true, pro: true },
        { name: "PDF Reports & Invoices", trial: false, basic: true, pro: true },
        { name: "Admin Managers", trial: "1", basic: "Up to 3", pro: "Unlimited" },
        { name: "Customer Auth", trial: false, basic: true, pro: true },
        { name: "Analytics Dashboard", trial: false, basic: "Standard", pro: "Advanced" },
        { name: "Occupancy Tracking", trial: false, basic: false, pro: true },
        { name: "24/7 Priority Support", trial: false, basic: false, pro: true },
        { name: "AI Menu Assistant", trial: false, basic: false, pro: true },
        { name: "Multi-Branch Support", trial: false, basic: false, pro: true },
        { name: "Custom Branding", trial: false, basic: false, pro: true },
        { name: "Dedicated Account Manager", trial: false, basic: false, pro: true },
      ],
    },
    {
      plan: "basic",
      features: [
        { name: "QR Menu System", trial: "5 Tables", basic: "Unlimited", pro: "Unlimited" },
        { name: "Digital Menu Card", trial: true, basic: true, pro: true },
        { name: "Online Ordering", trial: "Basic", basic: "Full", pro: "Full" },
        { name: "Dynamic QR per Table", trial: false, basic: true, pro: true },
        { name: "Menu Items", trial: "Up to 30", basic: "Unlimited", pro: "Unlimited" },
        { name: "Razorpay Payments", trial: false, basic: true, pro: true },
        { name: "Kitchen Display System", trial: false, basic: true, pro: true },
        { name: "Admin Managers", trial: "1", basic: "Up to 3", pro: "Unlimited" },
        { name: "Analytics Dashboard", trial: false, basic: "Standard", pro: "Advanced" },
      ],
    },
    {
      plan: "pro",
      features: [
        { name: "QR Menu System", trial: "5 Tables", basic: "Unlimited", pro: "Unlimited" },
        { name: "Online Ordering", trial: "Basic", basic: "Full", pro: "Full" },
        { name: "Menu Items", trial: "Up to 30", basic: "Unlimited", pro: "Unlimited" },
        { name: "Admin Managers", trial: "1", basic: "Up to 3", pro: "Unlimited" },
        { name: "Analytics Dashboard", trial: false, basic: "Standard", pro: "Advanced" },
        { name: "Occupancy Tracking", trial: false, basic: false, pro: true },
        { name: "24/7 Priority Support", trial: false, basic: false, pro: true },
        { name: "AI Menu Assistant", trial: false, basic: false, pro: true },
        { name: "Multi-Branch Support", trial: false, basic: false, pro: true },
        { name: "Custom Branding", trial: false, basic: false, pro: true },
        { name: "Dedicated Account Manager", trial: false, basic: false, pro: true },
      ],
    },
  ];
};
