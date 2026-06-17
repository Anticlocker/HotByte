"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Crown, Sparkles, AlertTriangle, ArrowRight, CheckCircle2, 
  Building, Phone, Mail, ChevronLeft, ShieldCheck, Globe, Star
} from "lucide-react";
import Swal from "sweetalert2";
import { logger } from "@/lib/utils/logger";

interface PageProps {
  params: Promise<{ hotel_slug: string }>;
}

export default function UpgradePage({ params }: PageProps) {
  const { hotel_slug } = use(params);
  const router = useRouter();
  const hotelSlug = hotel_slug || "hotbyte";

  const [hotelDetails, setHotelDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch hotel data to show current subscription status
    fetch(`/api/menu/categories?hotel_slug=${hotelSlug}`)
      .then((res) => res.json())
      .then((data) => {
        // We can inspect properties returned from the server
        if (data) {
          setHotelDetails({
            slug: hotelSlug,
            plan: data.plan || "trial",
            isFrozen: data.isFrozen || false,
            trialEndsAt: data.trialEndsAt || null
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [hotelSlug]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleUpgradeCheckout = async (planKey: 'basic' | 'pro') => {
    try {
      Swal.fire({
        title: "Initializing Payment...",
        text: "Please wait while we connect to Razorpay.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const getCsrfToken = () => {
        if (typeof document === "undefined") return "";
        const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : "";
      };

      // 1. Create subscription Razorpay order
      const orderRes = await fetch("/api/payments/create-subscription-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({
          plan: planKey,
          hotel_slug: hotelSlug
        })
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        Swal.fire({
          title: "Billing Error",
          text: orderData.message || "Failed to initialize subscription checkout. Please make sure you are logged in as an administrator.",
          icon: "error",
          confirmButtonColor: "#f97316"
        });
        return;
      }

      // 2. Fetch Base64 encoded Razorpay Key ID
      const keyRes = await fetch("/api/payments/razorpay-key");
      const keyData = await keyRes.json();

      if (!keyData.success) {
        Swal.fire("Billing Error", "Could not fetch payment credentials.", "error");
        return;
      }

      const razorpayKey = window.atob(keyData.key);

      // 3. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        Swal.fire("Connection Error", "Failed to load Razorpay payment engine.", "error");
        return;
      }

      Swal.close();

      // 4. Open Razorpay widget
      const options = {
        key: razorpayKey,
        amount: orderData.razorpay_order.amount,
        currency: orderData.razorpay_order.currency,
        name: "HotByte Platforms",
        description: `Upgrade to ${planKey === 'pro' ? 'Pro Plan' : 'Basic Plan'}`,
        order_id: orderData.razorpay_order.id,
        handler: async function (response: any) {
          Swal.fire({
            title: "Verifying Transaction...",
            text: "Activating your new subscription tier.",
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          const getCsrfToken = () => {
            if (typeof document === "undefined") return "";
            const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
            return match ? decodeURIComponent(match[1]) : "";
          };

          // Verify signature on backend
          const verifyRes = await fetch("/api/payments/verify-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
            body: JSON.stringify({
              plan: planKey,
              hotel_slug: hotelSlug,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            Swal.fire({
              title: "Upgrade Successful!",
              text: `Your hotel is now successfully upgraded to the ${planKey.toUpperCase()} tier and reactivated!`,
              icon: "success",
              confirmButtonColor: "#f97316"
            }).then(() => {
              window.location.reload();
            });
          } else {
            Swal.fire("Verification Failed", verifyData.message || "Failed to confirm payment signature.", "error");
          }
        },
        prefill: {
          name: hotelDetails?.name || "Hotel Admin",
          email: "admin@hotbyte.in"
        },
        theme: {
          color: "#f97316"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      logger.error("Upgrade checkout exception:", error);
      Swal.fire("Connection Error", "Could not reach platform billing APIs.", "error");
    }
  };

  const plans = [
    {
      name: "Free Trial",
      price: "₹0",
      period: "14 days",
      cls: "border-gray-800 bg-gray-900/20",
      badge: "Completed / Expired",
      badgeCls: "bg-red-500/10 border-red-500/20 text-red-400",
      features: ["Max 20 menu items", "1 admin manager", "QR-based ordering menu", "Basic order tracking"],
      isCurrent: hotelDetails?.plan === "trial" && !hotelDetails?.isFrozen,
      isExpired: hotelDetails?.plan === "trial" && hotelDetails?.isFrozen,
      planKey: "trial" as const
    },
    {
      name: "Basic Plan",
      price: "₹999",
      period: "/ month",
      cls: "border-orange-500/30 bg-gradient-to-b from-orange-500/5 to-transparent shadow-xl shadow-orange-500/2",
      badge: "Popular Choice",
      badgeCls: "bg-orange-500/10 border-orange-500/25 text-orange-400 animate-pulse",
      features: ["Unlimited menu items", "Up to 3 admin managers", "Razorpay Payment Gateway", "Live kitchen queue dashboard", "Customer ratings & feedback", "Daily/weekly sales reports"],
      isCurrent: hotelDetails?.plan === "basic" && !hotelDetails?.isFrozen,
      planKey: "basic" as const
    },
    {
      name: "Pro Plan",
      price: "₹2,499",
      period: "/ month",
      cls: "border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent",
      badge: "Elite Level",
      badgeCls: "bg-amber-500/10 border-amber-500/25 text-amber-400",
      features: ["Unlimited admin managers", "Razorpay + priority payment checkouts", "Advanced deep sales analytics", "Peak hour traffic insights", "Multi-table configurations", "Priority 24/7 dedicated support"],
      isCurrent: hotelDetails?.plan === "pro" && !hotelDetails?.isFrozen,
      planKey: "pro" as const
    }
  ];

  if (loading) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Loading subscription engine...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] min-h-screen text-white flex flex-col font-sans relative overflow-x-hidden selection:bg-orange-500/30">
      
      {/* Ambient background glows */}
      <div className="fixed top-0 right-0 w-[500px] aspect-square rounded-full bg-orange-600/5 filter blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-0 left-0 w-[500px] aspect-square rounded-full bg-amber-500/5 filter blur-[120px] pointer-events-none z-0"></div>

      {/* Header */}
      <header className="border-b border-gray-900 bg-[#070707]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/${hotelSlug}/menu`} className="w-8 h-8 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 flex items-center justify-center transition-all">
              <ChevronLeft size={16} className="text-gray-400" />
            </Link>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-black tracking-tight text-gray-300">
                Hot<span className="text-orange-500">Byte</span>
              </span>
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                Billing Scopes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-900/60 border border-gray-800 px-3 py-1.5 rounded-full text-gray-400 text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck size={12} className="text-orange-500" />
            <span>Active Tenant: /{hotelSlug}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 w-full space-y-12 relative z-10">
        
        {/* Banner Alert if Frozen */}
        {hotelDetails?.isFrozen ? (
          <div className="bg-red-500/5 border border-red-500/20 rounded-[24px] p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0 animate-bounce">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1 text-center md:text-left space-y-1">
              <h2 className="text-lg font-black text-red-400 uppercase tracking-tight">QR Menu Ordering is Suspended</h2>
              <p className="text-xs text-gray-450 font-semibold leading-relaxed">
                Your subscription terms for <strong className="text-gray-200">/{hotelSlug}</strong> have lapsed. To restore public dining menus, checkouts, and admin queues immediately, request an upgrade plan below.
              </p>
            </div>
            <a 
              href={`mailto:admin@hotbyte.in?subject=Restore%20Hotel%20/${hotelSlug}`}
              className="bg-red-500 hover:bg-red-650 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-red-500/10 transition-colors"
            >
              Request Restore
            </a>
          </div>
        ) : (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[24px] p-6 flex flex-col md:flex-row items-center gap-6 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Sparkles size={24} />
            </div>
            <div className="flex-1 text-center md:text-left space-y-1">
              <h2 className="text-lg font-black text-emerald-400 uppercase tracking-tight">Your Hotel is Currently Active</h2>
              <p className="text-xs text-gray-450 font-semibold leading-relaxed">
                Current Plan: <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-md font-bold uppercase text-[9px]">{hotelDetails?.plan}</span>. Upgrade at any time to unlock larger menus, online credit cards/UPI checkouts, and priority statistics.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Title */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Flexible Plans for <br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              Every Scale of Dining
            </span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 font-semibold leading-relaxed">
            Elevate guest ordering, streamline operations, and boost sales with HotByte QR networks. Choose your tier or contact super admin to customized packages.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((p, i) => (
            <div 
              key={i} 
              className={`relative rounded-3xl p-8 border flex flex-col justify-between transition-all duration-300 ${p.cls} ${
                p.isCurrent ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              {/* Badges / Status indicators */}
              {p.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${p.badgeCls}`}>
                  {p.badge}
                </div>
              )}

              {p.isCurrent && (
                <div className="absolute top-4 right-4 bg-emerald-500 text-black text-[8px] font-extrabold uppercase px-2 py-0.5 rounded">
                  Current Plan
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">{p.name}</h3>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black text-white">{p.price}</span>
                    <span className="text-gray-500 text-xs pb-1 font-semibold">{p.period}</span>
                  </div>
                </div>

                <ul className="space-y-3.5 border-t border-gray-900/60 pt-6">
                  {p.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-xs text-gray-400 font-semibold">
                      <CheckCircle2 size={14} className="text-orange-500 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 border-t border-gray-900/60 pt-6">
                {p.isExpired ? (
                  <button 
                    disabled 
                    className="w-full py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold uppercase tracking-wider"
                  >
                    Trial Lapsed
                  </button>
                ) : p.isCurrent ? (
                  <button 
                    disabled 
                    className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wider"
                  >
                    Active Tier
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgradeCheckout(p.planKey as 'basic' | 'pro')}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-orange-500/5 group cursor-pointer"
                  >
                    <span>Buy Membership</span>
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Help & Contact Options */}
        <div className="border-t border-gray-900 pt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          
          <div className="glass-card-dark p-6 rounded-2xl border border-gray-900/60 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0">
              <Mail size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold uppercase text-gray-300 tracking-wider">Email Billing Support</h4>
              <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
                For custom business plans, enterprise setups, invoices, or billing queries.
              </p>
              <a href="mailto:admin@hotbyte.in" className="inline-block text-xs font-bold text-orange-400 hover:underline pt-1">
                admin@hotbyte.in
              </a>
            </div>
          </div>

          <div className="glass-card-dark p-6 rounded-2xl border border-gray-900/60 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Phone size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold uppercase text-gray-300 tracking-wider">Call Platform Helpline</h4>
              <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
                Need urgent recovery or assistance? Contact our team directly on call.
              </p>
              <a href="tel:+919356918260" className="inline-block text-xs font-bold text-yellow-500 hover:underline pt-1">
                +91 93569 18260
              </a>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 bg-[#070707] py-6 text-center mt-12">
        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
          &copy; 2026 HotByte SaaS Technologies. Automatic Tenant Upgrades.
        </p>
      </footer>
    </div>
  );
}
