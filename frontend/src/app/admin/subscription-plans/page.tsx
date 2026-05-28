// src/app/admin/subscription-plans/page.tsx
"use client"
import React, { useState } from "react"
import { Loader2 } from "lucide-react"
import Swal from "sweetalert2"
import SubscriptionCard from "@/components/SubscriptionCard"
import CurrentSubscriptionCard from "@/components/CurrentSubscriptionCard"
import RecommendedUpgradeCard from "@/components/RecommendedUpgradeCard"
import PlanComparisonModal from "@/components/PlanComparisonModal"
import { useSubscription } from "@/lib/hooks/useSubscription"

export default function SubscriptionPlans() {
  const { plans, currentSubscription, loading, error, mutate } = useSubscription()
  const [isModalOpen, setModalOpen] = useState(false)

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
      const targetPlan = plans.find(p => p.plan_id === planId);
      if (!targetPlan) {
        Swal.fire("Billing Error", "Invalid subscription plan selected.", "error");
        return;
      }

      const planName = targetPlan.name.toLowerCase();
      if (planName === 'trial') {
        Swal.fire("Trial Tier", "Trial tier cannot be purchased manually.", "info");
        return;
      }

      Swal.fire({
        title: "Initializing Checkout...",
        text: "Connecting to Razorpay secure payment gateway.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Resolve hotel slug from URL search params or fallback to session
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
        Swal.fire({
          title: "Session Expired",
          text: "Authorized hotel administrator session is required.",
          icon: "error",
          confirmButtonColor: "#FF5A1F"
        });
        return;
      }

      // 1. Create Razorpay order
      const orderRes = await fetch("/api/payments/create-subscription-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planName,
          hotel_slug: activeSlug
        })
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        Swal.fire({
          title: "Order Failed",
          text: orderData.message || "Failed to initialize checkout. Verify that your administrative session is active.",
          icon: "error",
          confirmButtonColor: "#FF5A1F"
        });
        return;
      }

      // 2. Fetch obfuscated Razorpay Key ID
      const keyRes = await fetch("/api/payments/admin-razorpay-key");
      const keyData = await keyRes.json();

      if (!keyData.success) {
        Swal.fire("Billing Error", "Could not fetch platform payment credentials.", "error");
        return;
      }

      const razorpayKey = window.atob(keyData.key);

      // 3. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        Swal.fire("Connection Error", "Failed to load Razorpay billing engine.", "error");
        return;
      }

      Swal.close();

      // 4. Open Razorpay widget
      const options = {
        key: razorpayKey,
        amount: orderData.razorpay_order.amount,
        currency: orderData.razorpay_order.currency,
        name: "HotByte Platforms",
        description: `${type === "renew" ? "Renew" : "Upgrade to"} ${planName.toUpperCase()} Plan`,
        order_id: orderData.razorpay_order.id,
        handler: async function (response: any) {
          Swal.fire({
            title: "Confirming Transaction...",
            text: "Updating your SaaS network privileges.",
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          // Verify signature on backend
          const verifyRes = await fetch("/api/payments/verify-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan: planName,
              hotel_slug: activeSlug,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            Swal.fire({
              title: "Upgrade Successful! 🎉",
              text: `Your hotel is now successfully active on the ${planName.toUpperCase()} plan!`,
              icon: "success",
              confirmButtonColor: "#FF5A1F"
            }).then(() => {
              mutate();
            });
          } else {
            Swal.fire("Billing Verification Failed", verifyData.message || "Could not confirm signature.", "error");
          }
        },
        prefill: {
          name: "Hotel Admin",
          email: "billing@hotbyte.in"
        },
        theme: {
          color: "#FF5A1F"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error("Subscription payment error:", err);
      Swal.fire("Billing Error", "A network error occurred while compiling your payment session.", "error");
    }
  };

  // Recommendation logic
  const planOrder: Record<string, number> = { trial: 0, basic: 1, pro: 2 }
  const currentName = currentSubscription?.name?.toLowerCase() ?? "trial"
  const highestPlan = "pro"
  const showRecommendation = !!(currentName && planOrder[currentName] < planOrder[highestPlan])
  const recommendedPlan = plans.find(p => p.name.toLowerCase() === highestPlan)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0c0c0c]">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        Failed to load plans. Please try again later.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 p-8 text-gray-200">
      <h1 className="text-4xl font-extrabold mb-6 flex items-center gap-3 animate-fade-in-up">
        <span className="text-[var(--orange)]">💎</span> Subscription Plans
      </h1>

      {/* Current subscription summary */}
      <CurrentSubscriptionCard
        subscription={currentSubscription ? { ...currentSubscription, name: currentSubscription.name ?? "" } : null}
        onUpgrade={(id) => handlePayment(id, "upgrade")}
      />

      {/* Recommendation card */}
      {showRecommendation && recommendedPlan && (
        <RecommendedUpgradeCard
          currentPlan={currentName}
          recommendedPlanId={recommendedPlan.plan_id}
          recommendedPlanName={recommendedPlan.name}
          onUpgrade={(id) => handlePayment(id, "upgrade")}
        />
      )}

      {/* Plans grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-fade-in-up mt-8">
        {plans.map(plan => {
          return (
            <SubscriptionCard
              key={plan.plan_id}
              plan={plan}
              currentSubscription={currentSubscription ?? undefined}
              onRenew={(id) => handlePayment(id, "renew")}
              onUpgrade={(id) => handlePayment(id, "upgrade")}
              isRecommended={showRecommendation && plan.name.toLowerCase() === highestPlan}
            />
          )
        })}
      </div>

      {/* Modal trigger */}
      <div className="flex justify-center mt-8">
        <button className="btn-orange px-6 py-2 rounded" onClick={() => setModalOpen(true)}>
          View Plan Comparison
        </button>
      </div>

      <PlanComparisonModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
