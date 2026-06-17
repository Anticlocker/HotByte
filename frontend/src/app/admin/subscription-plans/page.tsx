"use client"
import React, { useState } from "react"
import { motion } from "framer-motion"
import { Loader2, CreditCard, ArrowUpRight, Layers } from "lucide-react"
import { useNotification } from "@/context/NotificationContext"
import SubscriptionCard from "@/components/SubscriptionCard"
import CurrentSubscriptionCard from "@/components/CurrentSubscriptionCard"
import RecommendedUpgradeCard from "@/components/RecommendedUpgradeCard"
import PlanComparisonModal from "@/components/PlanComparisonModal"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { logger } from "@/lib/utils/logger"

export default function SubscriptionPlans() {
  const notif = useNotification();
  const { plans, currentSubscription, loading, error, mutate } = useSubscription();
  const planOrder: Record<string, number> = { trial: 0, basic: 1, pro: 2 };
  const [isModalOpen, setModalOpen] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (planId: number, type: "renew" | "upgrade") => {
    try {
      let targetPlan = plans.find(p => p.plan_id === Number(planId));
      if (!targetPlan) {
        const nameStr = String(planId).toLowerCase();
        targetPlan = plans.find(p => p.name.toLowerCase().includes(nameStr));
        if (!targetPlan) {
          const orderName = Object.entries(planOrder).find(([, id]) => id === Number(planId))?.[0];
          if (orderName) {
            targetPlan = plans.find(p => p.name.toLowerCase() === orderName);
          }
        }
        if (!targetPlan) {
          notif.error("Billing Error", "Invalid subscription plan selected.");
          return;
        }
      }

      let planIdentifier: string;
      if (targetPlan.name.toLowerCase().includes('trial')) {
        planIdentifier = 'trial';
      } else {
        planIdentifier = targetPlan.name.toLowerCase();
      }

      notif.loading("Initializing Checkout...");

      let activeSlug = "";
      if (typeof window !== "undefined") {
        activeSlug = new URLSearchParams(window.location.search).get("hotel") || "";
      }
      if (!activeSlug) {
        const sessionRes = await fetch("/api/auth/admin/session-check");
        const sessionData = await sessionRes.json();
        if (sessionData.authenticated && sessionData.admin?.hotelSlug) {
          activeSlug = sessionData.admin.hotelSlug;
        }
      }

      if (!activeSlug) {
        await notif.alert("Session Expired", "Authorized hotel administrator session is required.", "error");
        return;
      }

      const getCsrfToken = () => {
        if (typeof document === "undefined") return "";
        const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : "";
      };
      const orderRes = await fetch("/api/payments/create-subscription-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({ plan: planIdentifier, hotel_slug: activeSlug })
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        await notif.alert("Order Failed", orderData.message || "Failed to initialize checkout. Verify that your administrative session is active.", "error");
        return;
      }

      const keyRes = await fetch("/api/payments/admin-razorpay-key");
      const keyData = await keyRes.json();

      if (!keyData.success) {
        notif.error("Billing Error", "Could not fetch platform payment credentials.");
        return;
      }

      const razorpayKey = window.atob(keyData.key);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        notif.error("Connection Error", "Failed to load Razorpay billing engine.");
        return;
      }

      notif.close();

      const options = {
        key: razorpayKey,
        amount: orderData.razorpay_order.amount,
        currency: orderData.razorpay_order.currency,
        name: "HotByte Platforms",
        description: `${type === "renew" ? "Renew" : "Upgrade to"} ${targetPlan.name.toUpperCase()} Plan`,
        order_id: orderData.razorpay_order.id,
        handler: async function (response: any) {
          notif.loading("Confirming Transaction...");

          const getCsrfToken = () => {
            if (typeof document === "undefined") return "";
            const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
            return match ? decodeURIComponent(match[1]) : "";
          };
          const verifyRes = await fetch("/api/payments/verify-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
            body: JSON.stringify({
              plan: planIdentifier,
              hotel_slug: activeSlug,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            await notif.alert("Upgrade Successful! 🎉", `Your hotel is now successfully active on the ${planIdentifier.toUpperCase()} plan!`, "success");
            mutate();
          } else {
            notif.error("Billing Verification Failed", verifyData.message || "Could not confirm signature.");
          }
        },
        prefill: { name: "Hotel Admin", email: "billing@hotbyte.in" },
        theme: { color: "#FF5A1F" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      logger.error("Subscription payment error:", err);
      notif.error("Billing Error", "A network error occurred while compiling your payment session.");
    }
  };

  const currentName = currentSubscription?.name?.toLowerCase() ?? "trial";
  const highestPlan = "pro";
  const showRecommendation = !!(currentName && planOrder[currentName] < planOrder[highestPlan]);
  const recommendedPlan = plans.find(p => p.name.toLowerCase() === highestPlan);

  const sortedPlans = [...plans].sort((a, b) => (planOrder[a.name.toLowerCase()] ?? 99) - (planOrder[b.name.toLowerCase()] ?? 99));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0c0c0c]">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">Failed to load plans. Please try again later.</div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] p-6 lg:p-10 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <CreditCard size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Subscription Plans</h1>
              <p className="text-[10px] text-gray-500 font-semibold">Manage your hotel&apos;s subscription and billing</p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-gray-800 hover:bg-white/10 text-gray-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer"
          >
            <Layers size={12} />
            Compare Plans
          </button>
        </div>
      </motion.div>

      {/* Current subscription */}
      {currentSubscription && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        >
          <CurrentSubscriptionCard
            subscription={currentSubscription ? { ...currentSubscription, name: currentSubscription.name ?? "" } : null}
            onUpgrade={(id) => handlePayment(id, "upgrade")}
          />
        </motion.div>
      )}

      {/* Recommendation */}
      {showRecommendation && recommendedPlan && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <RecommendedUpgradeCard
            currentPlan={currentName}
            recommendedPlanId={recommendedPlan.plan_id}
            recommendedPlanName={recommendedPlan.name}
            onUpgrade={(id) => handlePayment(id, "upgrade")}
          />
        </motion.div>
      )}

      {/* Plans grid */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full" />
          <h2 className="text-sm font-black text-white uppercase tracking-wider">Available Plans</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sortedPlans.map((plan, idx) => (
            <SubscriptionCard
              key={plan.plan_id}
              plan={plan}
              currentSubscription={currentSubscription ?? undefined}
              onRenew={(id) => handlePayment(id, "renew")}
              onUpgrade={(id) => handlePayment(id, "upgrade")}
              isRecommended={showRecommendation && plan.name.toLowerCase() === highestPlan}
            />
          ))}
        </div>
      </div>

      {/* Mobile compare button */}
      <div className="sm:hidden flex justify-center">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-gray-800 hover:bg-white/10 text-gray-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer"
        >
          <Layers size={12} />
          Compare Plans
        </button>
      </div>

      <PlanComparisonModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
