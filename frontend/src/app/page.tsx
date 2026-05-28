"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  QrCode, Utensils, Play, ChevronDown, Check, ArrowRight, ShieldCheck,
  Sparkles, Star, Smartphone, ChefHat, BarChart3, Clock, Flame,
  HelpCircle, ShieldAlert, BadgeCheck, CheckCircle2, ChevronRight, Mail
} from "lucide-react";
import Swal from "sweetalert2";

export default function Home() {
  const router = useRouter();
  // Navigation & Splash Screen
  const [splashState, setSplashState] = useState<"visible" | "fading" | "hidden">("visible");
  const [embers, setEmbers] = useState<{ id: number; color: string; tx: string; ty: string; width: string }[]>([]);
  const [scrolled, setScrolled] = useState(false);

  // SaaS Dynamic States
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [activeDemoTab, setActiveDemoTab] = useState<"menu" | "kitchen" | "analytics">("menu");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscriptionPurchase = async (rawPlanName: string) => {
    const planName = rawPlanName.toLowerCase().replace(" plan", "").replace(" free trial", "").trim();

    if (planName === "trial") {
      // Sandbox Free Trial launching
      Swal.fire({
        title: "Launch Sandbox?",
        text: "Redirecting you to our Admin login portal to setup your sandbox trial account.",
        icon: "info",
        showCancelButton: true,
        confirmButtonColor: "#ff5a1f",
        confirmButtonText: "Let's Go"
      }).then((result) => {
        if (result.isConfirmed) {
          router.push("/admin/login");
        }
      });
      return;
    }

    if (processingPayment) return;

    try {
      setProcessingPayment(true);

      Swal.fire({
        title: "Verifying Session...",
        text: "Checking for active administrator session.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // 1. Check if authenticated as a hotel admin
      const sessionRes = await fetch("/api/auth/admin/session-check");
      const sessionData = await sessionRes.json();
      let activeSlug = "";
      let hotelName = "";

      if (sessionData.authenticated && sessionData.admin?.role === "admin") {
        activeSlug = sessionData.admin.hotelSlug;
        hotelName = sessionData.admin.hotelName;
      } else {
        // Not logged in! Show inline auth modal
        Swal.close();

        const { value: loginValues } = await Swal.fire({
          title: "Hotel Authentication Required",
          html: `
            <div class="space-y-4 text-left">
              <p class="text-xs text-gray-400 font-semibold mb-4 leading-normal">
                To link the subscription to your hotel, please log in using your Administrator credentials:
              </p>
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Hotel Slug</label>
                <input id="login-slug" placeholder="e.g. hotbyte" class="w-full p-3 bg-gray-900 border border-gray-800 rounded-xl outline-none focus:border-orange-500 text-sm font-bold text-white" />
              </div>
              <div class="mt-3">
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Username</label>
                <input id="login-user" placeholder="e.g. ravi" class="w-full p-3 bg-gray-900 border border-gray-800 rounded-xl outline-none focus:border-orange-500 text-sm font-bold text-white" />
              </div>
              <div class="mt-3">
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
                <input id="login-pass" type="password" placeholder="••••••••" class="w-full p-3 bg-gray-900 border border-gray-800 rounded-xl outline-none focus:border-orange-500 text-sm font-bold text-white" />
              </div>
            </div>
          `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: "Sign In & Subscribe",
          confirmButtonColor: "#ff5a1f",
          preConfirm: () => {
            return {
              // @ts-ignore
              hotelSlug: document.getElementById("login-slug").value.trim().toLowerCase(),
              // @ts-ignore
              username: document.getElementById("login-user").value.trim(),
              // @ts-ignore
              password: document.getElementById("login-pass").value
            };
          }
        });

        if (!loginValues) {
          setProcessingPayment(false);
          return;
        }

        if (!loginValues.hotelSlug || !loginValues.username || !loginValues.password) {
          Swal.fire("Authentication Error", "All credential fields are required.", "error");
          setProcessingPayment(false);
          return;
        }

        Swal.fire({
          title: "Authenticating...",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Try to log in dynamically
        const loginRes = await fetch("/api/auth/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: loginValues.username,
            password: loginValues.password,
            hotelSlug: loginValues.hotelSlug,
            role: "admin"
          })
        });

        const loginData = await loginRes.json();
        if (!loginData.success) {
          Swal.fire("Authentication Failed", loginData.message || "Invalid credentials.", "error");
          setProcessingPayment(false);
          return;
        }

        activeSlug = loginValues.hotelSlug;
        hotelName = loginData.admin?.hotelName || "Your Hotel";
      }

      Swal.fire({
        title: "Initializing Checkout...",
        text: "Connecting to Razorpay secure payment gateway.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // 2. Create Razorpay order from backend
      const orderRes = await fetch("/api/payments/create-subscription-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planName,
          hotel_slug: activeSlug,
          billing_cycle: billingCycle
        })
      });
      const orderData = await orderRes.json();

      if (!orderData.success) {
        Swal.fire("Checkout Failed", orderData.message || "Could not prepare subscription order.", "error");
        setProcessingPayment(false);
        return;
      }

      // 3. Fetch admin Razorpay key
      const keyRes = await fetch("/api/payments/admin-razorpay-key");
      const keyData = await keyRes.json();

      if (!keyData.success) {
        Swal.fire("Billing Error", "Failed to retrieve billing credentials.", "error");
        setProcessingPayment(false);
        return;
      }

      const razorpayKey = window.atob(keyData.key);

      // 4. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        Swal.fire("Billing Error", "Failed to load Razorpay payment runtime.", "error");
        setProcessingPayment(false);
        return;
      }

      Swal.close();

      // 5. Open Razorpay widget immediately
      const options = {
        key: razorpayKey,
        amount: orderData.razorpay_order.amount,
        currency: orderData.razorpay_order.currency,
        name: "HotByte SaaS",
        description: `Upgrade ${hotelName} to ${planName.toUpperCase()} (${billingCycle})`,
        order_id: orderData.razorpay_order.id,
        handler: async function (response: any) {
          Swal.fire({
            title: "Confirming Transaction...",
            text: "Securing your active database subscription ledger.",
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          // Verify subscription on backend
          const verifyRes = await fetch("/api/payments/verify-subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan: planName,
              hotel_slug: activeSlug,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              billing_cycle: billingCycle
            })
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            Swal.fire({
              title: "Subscription Activated! 🎉",
              text: `Success! ${hotelName} is now fully upgraded and active on the ${planName.toUpperCase()} plan.`,
              icon: "success",
              confirmButtonColor: "#ff5a1f",
              confirmButtonText: "Enter Dashboard"
            }).then(() => {
              router.push(`/admin?hotel=${activeSlug}`);
            });
          } else {
            Swal.fire("Verification Failed", verifyData.message || "Failed to confirm payment signature.", "error");
          }
          setProcessingPayment(false);
        },
        modal: {
          ondismiss: function () {
            Swal.fire("Cancelled", "Payment session was cancelled by user.", "info");
            setProcessingPayment(false);
          }
        },
        prefill: {
          name: "Hotel Admin",
          email: "billing@hotbyte.in"
        },
        theme: {
          color: "#ff5a1f"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error("Subscription checkout failed:", error);
      Swal.fire("Billing Error", "A network error occurred during your payment checkout.", "error");
      setProcessingPayment(false);
    }
  };

  // Simulated Live App States
  const [demoCart, setDemoCart] = useState<{ id: number; name: string; price: number; quantity: number }[]>([]);
  const [demoKitchenOrders, setDemoKitchenOrders] = useState([
    { id: "109", table: "T-3", items: "Paneer Tikka x1, Garlic Naan x2", total: 390, status: "pending", time: "2 mins ago" },
    { id: "110", table: "T-1", items: "Butter Chicken x1, Tandoori Roti x3", total: 470, status: "preparing", time: "Just now" }
  ]);
  const [demoRevenue, setDemoRevenue] = useState(14850);
  const [demoOrderCount, setDemoOrderCount] = useState(48);

  useEffect(() => {
    // Spawn Embers for splash
    const colors = ["gold", "orange", "red", "white"];
    const spawnedEmbers = Array.from({ length: 45 }).map((_, idx) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 320;
      const tx = Math.cos(angle) * distance + "px";
      const ty = Math.sin(angle) * distance + "px";
      const width = (Math.random() * 6 + 2) + "px";
      const color = colors[Math.floor(Math.random() * colors.length)];
      return { id: idx, color, tx, ty, width };
    });
    setEmbers(spawnedEmbers);

    let unmountTimer: NodeJS.Timeout;
    const fadeTimer = setTimeout(() => {
      setSplashState("fading");
      unmountTimer = setTimeout(() => setSplashState("hidden"), 1500);
    }, 2500);

    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);

    return () => {
      clearTimeout(fadeTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Demo actions: Menu Simulator
  const handleDemoAddToCart = (item: { id: number; name: string; price: number }) => {
    const existing = demoCart.find(i => i.id === item.id);
    if (existing) {
      setDemoCart(demoCart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setDemoCart([...demoCart, { ...item, quantity: 1 }]);
    }
  };

  const handleDemoClear = () => {
    setDemoCart([]);
  };

  const handleDemoCheckout = () => {
    if (demoCart.length === 0) return;
    Swal.fire({
      title: "Simulated Payment Success!",
      html: `<div class="text-xs text-gray-400">Order successfully sent to simulated Kitchen Display System (KDS)!</div>`,
      icon: "success",
      background: "#0d0f14",
      color: "#fff",
      confirmButtonColor: "#ff5a1f",
      confirmButtonText: "Awesome"
    });

    // Add to kitchen display simulation
    const nextId = Math.floor(Math.random() * 50) + 111;
    const itemsText = demoCart.map(i => `${i.name} x${i.quantity}`).join(", ");
    const totalCost = demoCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    setDemoKitchenOrders([
      ...demoKitchenOrders,
      { id: String(nextId), table: "T-2", items: itemsText, total: totalCost, status: "pending", time: "Just now" }
    ]);

    // Increment simulated metrics
    setDemoRevenue(prev => prev + totalCost);
    setDemoOrderCount(prev => prev + 1);
    setDemoCart([]);
  };

  // Demo actions: Kitchen Simulator
  const handleKitchenStatusUpdate = (orderId: string, nextStatus: "preparing" | "ready" | "served") => {
    if (nextStatus === "served") {
      setDemoKitchenOrders(demoKitchenOrders.filter(o => o.id !== orderId));
      Swal.fire({
        title: "Order Served!",
        text: `Simulated table notification sent successfully!`,
        icon: "success",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
        background: "#0d0f14",
        color: "#fff"
      });
    } else {
      setDemoKitchenOrders(demoKitchenOrders.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    }
  };

  const pricingPlans = [
    {
      name: "Free Trial",
      monthlyPrice: 0,
      period: "14 days",
      badge: "Sandbox Access",
      badgeCls: "bg-gray-800 text-gray-400 border-gray-700/50",
      features: ["Max 20 menu items", "1 admin manager", "QR-based dining station menu", "Basic checkout & orders dashboard"],
      cta: "Launch Sandbox",
      ctaCls: "bg-white/10 hover:bg-white/15 text-white border border-white/10"
    },
    {
      name: "Basic Plan",
      monthlyPrice: 999,
      yearlyPrice: 799,
      period: "/ month",
      badge: "Most Popular",
      badgeCls: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      features: ["Unlimited menu items", "Up to 3 admin managers", "Razorpay Payment Gateway Integration", "Live kitchen display system (KDS)", "Dynamic QR codes per table", "Daily PDF sales reports"],
      cta: "Start 14-Day Free Trial",
      ctaCls: "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-transform"
    },
    {
      name: "Pro Plan",
      monthlyPrice: 2499,
      yearlyPrice: 1999,
      period: "/ month",
      badge: "Enterprise Ready",
      badgeCls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      features: ["Everything in Basic Plan", "Unlimited managers & staff logins", "Advanced sales metrics & analytics charts", "Hourly peak occupancy tracking", "Priority 24/7 developer hotline", "Dedicated menu setup assistant"],
      cta: "Start Pro Free Trial",
      ctaCls: "bg-gradient-to-r from-amber-500 to-yellow-600 text-black shadow-lg shadow-amber-500/10 hover:scale-[1.02] transition-transform font-extrabold"
    }
  ];

  const faqs = [
    { q: "How long does the setup take?", a: "Setup takes less than 10 minutes. Once you request your unique slug (e.g., hotbyte.in/spicy-treats), our super-admin assigns your logins instantly. You can upload categories, add your items, and print your dining station QR codes immediately!" },
    { q: "Can guests pay online directly from the table?", a: "Yes! With our Basic and Pro plans, customers can scan the QR code, select their dishes, enter table numbers, and complete checkout instantly using Razorpay (UPI, Google Pay, Credit/Debit cards). Cash checkout tracking is also fully integrated." },
    { q: "What happens when the 14-day free trial ends?", a: "Once your trial ends, the system automatically checks subscription statuses. If no paid plan is selected, the hotel menu resolution resolves to a premium suspended page, notifying guests elegantly. No data is lost, and you can upgrade at any time to freeze/unfreeze." },
    { q: "Can I configure custom tables?", a: "Absolutely. Super-admins configure table counts per hotel (e.g. 5, 20, or 100 tables). The dining menu and kitchen dashboard automatically scale the options dynamically in the UI so table routing is seamless." }
  ];

  const demoItems = [
    { id: 1, name: "Paneer Tikka Double", price: 249, desc: "Smoky cottage cheese cubes grilled to golden perfection.", veg: true },
    { id: 2, name: "Crispy Spring Rolls", price: 189, desc: "Golden fried skins loaded with glazed seasonal vegetables.", veg: true },
    { id: 3, name: "Butter Chicken Masala", price: 299, desc: "Tender chicken chunks cooked in rich creamy tomato broth.", veg: false }
  ];

  const cartTotal = demoCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="bg-[#050507] min-h-screen text-white font-sans selection:bg-orange-500/30 overflow-x-hidden antialiased">

      {/* Splash Entrance Screen */}
      {splashState !== "hidden" && (
        <div className={`splash-screen ${splashState === "fading" ? "fade-out" : ""}`}>
          <div className="flame-wave"></div>
          <div className="flame-wave"></div>
          <div className="flame-wave"></div>
          <div className="flame-glow"></div>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {embers.map((ember) => (
              <div
                key={ember.id}
                className={`ember ${ember.color}`}
                style={{ width: ember.width, height: ember.width, "--tx": ember.tx, "--ty": ember.ty } as any}
              />
            ))}
          </div>
          <div className="splash-logo flex flex-col items-center gap-5">
            <div className="splash-icon-wrapper">
              <div className="splash-icon-ring"></div>
              <div className="splash-icon-ring-reverse"></div>
              <div className="splash-icon-glow"></div>
              <div className="splash-icon">
                <i className="fas fa-fire animate-pulse-fast"></i>
              </div>
            </div>
            <div className="flex flex-col items-center leading-none text-center">
              <div className="splash-text text-white">
                <span className="hot-part">Hot</span>
                <span className="byte-part">Byte</span>
              </div>
              <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-3 tagline-fade">
                Serve with Love
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Background Effects */}
      <div className="fixed top-0 right-0 w-[600px] aspect-square rounded-full bg-orange-600/5 filter blur-[150px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[600px] aspect-square rounded-full bg-amber-600/5 filter blur-[150px] pointer-events-none z-0" />

      {/* ── HEADER NAVIGATION ── */}
      <header className={`sticky top-0 z-40 transition-all duration-500 ${scrolled
          ? "bg-[#050507]/80 backdrop-blur-xl border-b border-gray-900/60 shadow-2xl shadow-black/80"
          : "bg-transparent border-b border-transparent"
        }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-all">
              <Flame size={18} className="text-white fill-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-tight">
                Hot<span className="text-orange-500">Byte</span>
              </span>
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                Saas System
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#interactive-demo" className="hover:text-white transition-colors">Live App Demo</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors hover:scale-105">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="text-xs font-bold text-gray-400 hover:text-white transition-colors px-4 py-2 border border-transparent hover:border-gray-800 rounded-xl"
            >
              Partner Sign-In
            </Link>
            <a
              href="#pricing"
              className="bg-white text-black px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-orange-500 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Get Onboarded
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-28 text-center space-y-8">

        {/* Glow pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-orange-500/20 bg-orange-500/5 text-orange-400 text-[10px] font-black uppercase tracking-widest shadow-inner shadow-orange-500/5 animate-pulse">
          <Sparkles size={11} className="animate-spin-slow" />
          <span>Next-Generation Dining Operations</span>
        </div>

        <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black leading-[1.1] tracking-tighter max-w-4xl mx-auto">
          The Smartest Way to <br />
          <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent hover:scale-[1.03] hover:brightness-110 active:scale-[0.98] transition-all duration-300 cursor-default select-none inline-block py-1">
            Serve & Scale Your Restaurant
          </span>
        </h1>

        <p className="text-gray-400 text-sm md:text-base max-w-3xl mx-auto leading-relaxed font-semibold">
          Empower your hotel with an integrated ecosystem — dynamic table QR menus, secure Razorpay checkout gateway, live kitchen display dashboards (KDS), and deep revenue statistics. Set up in less than 10 minutes.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <a
            href="#pricing"
            className="w-full sm:w-auto bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-2xl shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all group"
          >
            <Flame size={14} className="fill-white" />
            <span>Start Free Trial</span>
            <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform" />
          </a>
          <a
            href="#interactive-demo"
            className="w-full sm:w-auto border border-gray-800 bg-gray-900/10 backdrop-blur-sm text-gray-300 hover:text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-gray-900/40 transition-all hover:border-gray-700"
          >
            <Play size={12} className="text-orange-500 fill-orange-500 animate-pulse" />
            <span>Interactive Demo</span>
          </a>
        </div>

        {/* Mini stats */}
        <div className="pt-16 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
          {[
            { value: "50+", label: "Hotels Live" },
            { value: "10K+", label: "Orders Logged" },
            { value: "99.99%", label: "System Uptime" },
            { value: "₹45L+", label: "Revenue Processed" }
          ].map((s, idx) => (
            <div key={idx} className="glass-card-dark p-6 rounded-2xl border border-gray-900/50 text-center flex flex-col justify-center">
              <div className="text-2xl md:text-3xl font-black text-white bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">{s.value}</div>
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOTEL BRAND CAROUSEL (Cool Infinite Loop) ── */}
      <section className="border-y border-gray-900 bg-[#07070a]/40 py-8 relative z-10 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#050507] to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#050507] to-transparent z-20 pointer-events-none" />

        <div className="flex gap-16 whitespace-nowrap animate-[marquee_25s_linear_infinite] w-max items-center">
          {[1, 2].map((loop) => (
            <div key={loop} className="flex gap-16 items-center">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2"><Utensils size={14} className="text-orange-500" /> Grand Palace Resort</span>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2"><Star size={14} className="text-amber-500 fill-amber-500" /> Spicy Grill Restaurant</span>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2"><QrCode size={14} className="text-yellow-500" /> Royal Feast Banquet</span>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2"><Utensils size={14} className="text-orange-500" /> The Golden Crust Cafe</span>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2"><Star size={14} className="text-amber-500 fill-amber-500" /> Midnight Food Hub</span>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2"><QrCode size={14} className="text-yellow-500" /> Imperial Delicacies</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── HIGH-FIDELITY INTERACTIVE DEMO (THE WOW COMPONENT) ── */}
      <section id="interactive-demo" className="relative z-10 max-w-7xl mx-auto px-6 py-28 space-y-12">
        <div className="text-center space-y-3">
          <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Experience HotByte</p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">Interactive Live App Simulator</h2>
          <p className="text-xs md:text-sm text-gray-500 max-w-xl mx-auto font-semibold">
            Click the tabs below to play with customer menus, active kitchen KDS pipelines, and metrics in real-time.
          </p>
        </div>

        {/* Demo Core Wrapper */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">

          {/* Left Selector Tabs (L-Span-4) */}
          <div className="lg:col-span-4 flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 scrollbar-none justify-between lg:justify-start">
            {[
              { id: "menu", title: "Customer Menu", subtitle: "Dynamic guest QR scanner & checkout", icon: Smartphone, color: "text-orange-500 bg-orange-500/10" },
              { id: "kitchen", title: "Kitchen Display (KDS)", subtitle: "Real-time ticket queue for cooks", icon: ChefHat, color: "text-yellow-500 bg-yellow-500/10" },
              { id: "analytics", title: "Analytics Hub", subtitle: "Super-admin revenue trends", icon: BarChart3, color: "text-amber-500 bg-amber-500/10" }
            ].map((t) => {
              const IconComp = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveDemoTab(t.id as any)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer min-w-[240px] md:min-w-0 ${activeDemoTab === t.id
                      ? "border-orange-500 bg-gradient-to-r from-orange-500/10 to-transparent shadow-lg shadow-orange-500/2 scale-[1.01]"
                      : "border-gray-900 bg-gray-900/10 hover:bg-gray-900/30 text-gray-400 hover:text-gray-250"
                    }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.color}`}>
                    <IconComp size={18} className="fill-transparent" />
                  </div>
                  <div className="leading-tight hidden sm:block">
                    <div className="font-extrabold text-sm text-white">{t.title}</div>
                    <div className="text-[10px] text-gray-500 font-semibold mt-0.5">{t.subtitle}</div>
                  </div>
                  <div className="sm:hidden font-extrabold text-xs text-white">{t.title}</div>
                </button>
              );
            })}
          </div>

          {/* Right Simulated Terminal (L-Span-8) */}
          <div className="lg:col-span-8 glass-card-dark rounded-3xl border border-gray-900/60 p-6 flex flex-col justify-between min-h-[440px] relative overflow-hidden shadow-2xl">

            {/* Terminal Window Header Bar */}
            <div className="flex items-center justify-between border-b border-gray-900/60 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-mono text-gray-500 uppercase font-bold ml-2">hotbyte-demo-sandbox.sh</span>
              </div>
              <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded text-[8px] font-black text-orange-400 uppercase tracking-wider">
                <span className="w-1 h-1 rounded-full bg-orange-500 animate-ping"></span>
                <span>Active Simulator</span>
              </div>
            </div>

            {/* TAB CONTENT: 1. Customer Menu */}
            {activeDemoTab === "menu" && (
              <div className="flex-1 flex flex-col justify-between space-y-4 animate-fade-in-up">
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs">
                    <span className="font-bold text-gray-300">Station / Table: <strong className="text-orange-400">T-2</strong></span>
                    <span className="font-extrabold text-[10px] text-gray-500 uppercase">Customer View</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {demoItems.map((item) => (
                      <div key={item.id} className="bg-gray-900/40 border border-gray-900 rounded-xl p-3.5 flex flex-col justify-between gap-3 text-left">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white truncate max-w-[100px]">{item.name}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${item.veg ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{item.veg ? 'V' : 'N'}</span>
                          </div>
                          <p className="text-[9px] text-gray-500 font-semibold mt-1 leading-normal line-clamp-2">{item.desc}</p>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-black text-yellow-500">₹{item.price}</span>
                          <button
                            onClick={() => handleDemoAddToCart(item)}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-black text-[9px] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulated Basket Footer */}
                <div className="border-t border-gray-900/60 pt-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Basket Items</span>
                      <span className="text-sm font-black text-white">{demoCart.reduce((sum, i) => sum + i.quantity, 0)} Items</span>
                    </div>
                    <div className="flex flex-col border-l border-gray-900/60 pl-3">
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Simulated Total</span>
                      <span className="text-sm font-black text-yellow-500">₹{cartTotal}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {demoCart.length > 0 && (
                      <button
                        onClick={handleDemoClear}
                        className="bg-transparent hover:text-red-400 text-gray-500 font-bold text-[10px] uppercase px-3 py-2 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      onClick={handleDemoCheckout}
                      disabled={demoCart.length === 0}
                      className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${demoCart.length > 0
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-90 active:scale-95 shadow-md"
                          : "bg-gray-900 text-gray-600 border border-gray-800"
                        }`}
                    >
                      <span>Checkout Order</span>
                      <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. Kitchen Display */}
            {activeDemoTab === "kitchen" && (
              <div className="flex-1 flex flex-col justify-between space-y-4 animate-fade-in-up text-left">
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs">
                    <span className="font-bold text-gray-300">Live KDS monitor: <strong className="text-orange-400">{demoKitchenOrders.length} active tickets</strong></span>
                    <span className="font-extrabold text-[10px] text-gray-500 uppercase">Back of House</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto scrollbar-none">
                    {demoKitchenOrders.length === 0 ? (
                      <div className="col-span-2 py-8 text-center text-gray-500 text-xs font-semibold uppercase tracking-wider">
                        🍳 Kitchen clear! All tickets served.
                      </div>
                    ) : (
                      demoKitchenOrders.map((ord) => (
                        <div key={ord.id} className="bg-gray-900/30 border border-gray-900 rounded-xl p-4 flex flex-col justify-between gap-3 text-left">
                          <div>
                            <div className="flex items-center justify-between border-b border-gray-900/60 pb-1.5">
                              <span className="text-xs font-extrabold text-white">Table: <strong className="text-orange-400">{ord.table}</strong></span>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${ord.status === 'pending' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                }`}>
                                {ord.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-300 font-bold mt-2 leading-relaxed h-[36px] line-clamp-2">{ord.items}</p>
                          </div>

                          <div className="flex justify-end gap-2 border-t border-gray-900/60 pt-2">
                            {ord.status === 'pending' ? (
                              <button
                                onClick={() => handleKitchenStatusUpdate(ord.id, "preparing")}
                                className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-black text-[9px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Accept Prep
                              </button>
                            ) : (
                              <button
                                onClick={() => handleKitchenStatusUpdate(ord.id, "served")}
                                className="bg-emerald-500 text-black font-black text-[9px] px-3 py-1.5 rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Check size={10} strokeWidth={3} />
                                Serve Order
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 font-semibold border-t border-gray-900/60 pt-4 flex items-center gap-1.5">
                  <ChefHat size={12} className="text-orange-500" />
                  <span>Interactive Tip: Add dishes from <strong>Customer Menu</strong> tab first, then see them reflect in KDS!</span>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. Analytics Hub */}
            {activeDemoTab === "analytics" && (
              <div className="flex-1 flex flex-col justify-between space-y-4 animate-fade-in-up text-left">
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs">
                    <span className="font-bold text-gray-300">Super-Admin Insights Dashboard</span>
                    <span className="font-extrabold text-[10px] text-gray-500 uppercase">Management metrics</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-900/40 border border-gray-900 rounded-xl p-4 flex flex-col justify-center">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Network Revenue</span>
                      <h4 className="text-xl font-black text-emerald-400 mt-1">₹{demoRevenue.toLocaleString("en-IN")}</h4>
                      <p className="text-[8px] text-gray-600 font-bold mt-1 uppercase">Updates in Real-Time</p>
                    </div>
                    <div className="bg-gray-900/40 border border-gray-900 rounded-xl p-4 flex flex-col justify-center">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Total Orders</span>
                      <h4 className="text-xl font-black text-white mt-1">{demoOrderCount} Orders</h4>
                      <p className="text-[8px] text-gray-600 font-bold mt-1 uppercase">Uptime operational</p>
                    </div>
                  </div>
                </div>

                {/* Simulated Chart */}
                <div className="h-[120px] bg-[#0c0d12] border border-gray-900 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Hourly Sales Trend</span>
                    <span className="text-[8px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      100% active
                    </span>
                  </div>

                  {/* Styled Mock SVG Line Chart */}
                  <div className="absolute inset-x-0 bottom-0 h-[70px] pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff5a1f" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#ff5a1f" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M 0 80 Q 20 40 40 60 T 80 15 T 100 20 L 100 100 L 0 100 Z" fill="url(#chartGlow)" />
                      <path d="M 0 80 Q 20 40 40 60 T 80 15 T 100 20" fill="none" stroke="#ff5a1f" strokeWidth="2.5" strokeLinecap="round" className="animate-[dash_2s_ease-in-out_infinite]" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ── CORE SAAS FEATURES SECTION ── */}
      <section id="features" className="relative z-10 bg-white/[0.01] border-y border-gray-900 py-28">
        <div className="max-w-7xl mx-auto px-6">

          <div className="text-center mb-20 space-y-3">
            <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Architectural Pillars</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Engineered for Hospitality Excellence</h2>
            <p className="text-xs md:text-sm text-gray-500 max-w-xl mx-auto font-semibold">
              A comprehensive system built on PostgreSQL reliability and optimized Next.js speeds to transform guest ordering workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: QrCode, color: "text-orange-400 bg-orange-400/10", title: "Dynamic QR Routing", desc: "Print unique QR codes per table. Guests scan, browse, and order instantly. No app installation or logins required." },
              { icon: ChefHat, color: "text-yellow-400 bg-yellow-400/10", title: "Kitchen Display Queue", desc: "Replace messy paper tickets. Real-time ticket queues for kitchen crews to prepare, timer count, and mark ready dynamically." },
              { icon: ShieldCheck, color: "text-emerald-400 bg-emerald-400/10", title: "Razorpay Native Checkout", desc: "UPI, Google Pay, Credit/Debit cards integrated natives. Direct hotel billing support, transaction security, and cash support." },
              { icon: BarChart3, color: "text-amber-400 bg-amber-400/10", title: "SaaS Sales Insights", desc: "Identify peak dining hours, track best-selling dishes, monitor revenue margins, and export unified analytics reporting." },
              { icon: Clock, color: "text-sky-400 bg-sky-400/10", title: "Subscription Auto-Freeze", desc: "Automatic cron trackers verify trial limits. Unpaid/suspended tenants are locked elegantly, unfreezing immediately upon upgrade." },
              { icon: BadgeCheck, color: "text-purple-400 bg-purple-400/10", title: "Secure Staff Role Scopes", desc: "Isolated accounts for super-admins, managers, and servers. Ensure zero data leakage and stable hotel tenant isolation." }
            ].map((f, i) => {
              const IconComp = f.icon;
              return (
                <div
                  key={i}
                  className="glass-card-dark p-8 rounded-3xl border border-gray-900/60 hover:border-orange-500/20 transition-all duration-300 group hover:scale-[1.01]"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform ${f.color}`}>
                    <IconComp size={20} className="fill-transparent" />
                  </div>
                  <h3 className="text-base font-extrabold text-white mb-2">{f.title}</h3>
                  <p className="text-xs text-gray-500 font-semibold leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── ONBOARDING WORKFLOW (HOW IT WORKS) ── */}
      <section id="how-it-works" className="relative z-10 py-28">
        <div className="max-w-5xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-3">
            <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Onboarding Workflow</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Active In 3 Steps</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting horizontal border */}
            <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-[1px] bg-gradient-to-r from-transparent via-gray-800 to-transparent z-0" />

            {[
              { step: "01", title: "Register Tenant Space", desc: "Contact HotByte super-admins. We configure your space with a custom URL slug (e.g. /punebyte) and assign credentials." },
              { step: "02", title: "Configure Menu & Tables", desc: "Log in to your hotel panel. Add dishes, categorize, host images securely, and set dynamic dining station tables count." },
              { step: "03", title: "Place QRs & Go Live", desc: "Print generated dynamic QR tables. Display them on dining tables. Customers browse and pay instantly!" }
            ].map((s, idx) => (
              <div key={idx} className="glass-card-dark border border-gray-900/60 p-6 rounded-3xl flex flex-col items-center text-center gap-4 relative z-10 group hover:border-orange-500/20 transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-[#0c0d12] border border-gray-800 flex items-center justify-center text-xl font-black text-orange-500 shadow-inner group-hover:scale-105 transition-transform">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white mb-2">{s.title}</h3>
                  <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── PREMIUM PRICING SECTION ── */}
      <section id="pricing" className="relative z-10 bg-white/[0.01] border-y border-gray-900 py-28">
        <div className="max-w-6xl mx-auto px-6 space-y-16">

          <div className="text-center space-y-4">
            <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Straightforward Pricing</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">Flexible Subscriptions for High Margins</h2>
            <p className="text-xs md:text-sm text-gray-500 max-w-lg mx-auto font-semibold">
              Select monthly or annual billing cycles. Save up to 20% on all premium plans with full setup guidance.
            </p>

            {/* Billing cycle toggler */}
            <div className="inline-flex items-center gap-1 bg-[#0c0d12] border border-gray-900 rounded-2xl p-1 mt-4">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${billingCycle === "monthly" ? "bg-orange-500 text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
              >
                Monthly Plan
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 ${billingCycle === "yearly" ? "bg-orange-500 text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
              >
                <span>Yearly Saver</span>
                <span className="px-1.5 py-0.5 bg-yellow-500/15 text-yellow-400 text-[8px] font-black rounded-md uppercase tracking-normal">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {pricingPlans.map((plan, idx) => {
              const displayPrice = billingCycle === "yearly" && plan.yearlyPrice ? plan.yearlyPrice : plan.monthlyPrice;
              const hasOldPrice = billingCycle === "yearly" && plan.yearlyPrice;

              return (
                <div
                  key={idx}
                  className={`glass-card-dark p-8 rounded-[32px] border flex flex-col justify-between transition-all duration-300 ${idx === 1
                      ? "border-orange-500/40 bg-gradient-to-b from-orange-500/5 to-transparent scale-[1.01]"
                      : "border-gray-900/60"
                    } hover:border-orange-500/30 relative`}
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">{plan.name}</h3>
                      <span className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider ${plan.badgeCls}`}>
                        {plan.badge}
                      </span>
                    </div>

                    <div className="border-b border-gray-900/60 pb-6">
                      <div className="flex items-end gap-1.5">
                        {hasOldPrice && (
                          <span className="text-xs text-gray-600 line-through pb-1 font-semibold">₹{plan.monthlyPrice}</span>
                        )}
                        <span className="text-4xl font-black text-white">₹{displayPrice}</span>
                        <span className="text-gray-500 text-xs pb-1 font-bold">{plan.period}</span>
                      </div>
                    </div>

                    <ul className="space-y-4">
                      {plan.features.map((feat, fidx) => (
                        <li key={fidx} className="flex items-start gap-2.5 text-xs text-gray-400 font-semibold">
                          <CheckCircle2 size={13} className="text-orange-500 flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 border-t border-gray-900/60 pt-6">
                    <button
                      onClick={() => handleSubscriptionPurchase(plan.name)}
                      disabled={processingPayment}
                      className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        processingPayment ? "opacity-50 cursor-not-allowed" : ""
                      } ${plan.ctaCls}`}
                    >
                      <span>{processingPayment ? "Processing..." : plan.cta}</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── ACCORDION FAQ SECTION ── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-28 space-y-12">
        <div className="text-center space-y-3">
          <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Platform FAQ</p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">Frequently Answered Queries</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="glass-card-dark border border-gray-900/60 rounded-2xl overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-6 py-5 text-left flex items-center justify-between font-bold text-xs md:text-sm text-gray-200 cursor-pointer"
              >
                <span className="flex items-center gap-3">
                  <HelpCircle size={16} className="text-orange-500 flex-shrink-0" />
                  <span>{faq.q}</span>
                </span>
                <ChevronDown
                  size={14}
                  className={`text-gray-500 transition-transform duration-300 ${openFaq === idx ? 'rotate-180 text-orange-500' : ''}`}
                />
              </button>

              {openFaq === idx && (
                <div className="px-6 pb-5 text-xs text-gray-500 leading-relaxed font-semibold animate-fade-in-up border-t border-gray-900/40 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CONVERTING STRIP (CTA BLOCK) ── */}
      <section className="relative z-10 py-24 bg-gradient-to-t from-[#040406] to-transparent text-center space-y-8">
        <div className="max-w-3xl mx-auto px-6 space-y-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center mx-auto shadow-2xl shadow-orange-500/20">
            <Flame size={28} className="text-white fill-white animate-pulse" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
            Ready to Digitalize Your Dining?
          </h2>
          <p className="text-gray-400 text-xs md:text-sm max-w-lg mx-auto font-semibold leading-relaxed">
            Onboard your hotel and start serving immediately. Cancel or change plans at any time. Direct developer assistance included.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <a
              href="mailto:admin@hotbyte.in?subject=I%20want%20to%20join%20HotByte"
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:opacity-95 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl shadow-orange-500/20 hover:scale-[1.01] active:scale-95 transition-all"
            >
              <Mail size={14} />
              Onboard My Hotel
            </a>
            <a
              href="https://instagram.com/hotbyte.in"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:brightness-110 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 shadow-xl shadow-pink-500/10 transition-all border-0"
              style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              Follow Us
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-gray-900 bg-[#040406] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center">
              <Flame size={14} className="text-white fill-white" />
            </div>
            <span className="text-sm font-black">Hot<span className="text-orange-500">Byte</span></span>
          </div>

          <nav className="flex items-center gap-6 text-[10px] text-gray-500 font-extrabold uppercase tracking-widest">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="mailto:admin@hotbyte.in" className="hover:text-white transition-colors">Developer Contact</a>
            <Link href="/admin/login" className="hover:text-white transition-colors">Partner Dashboard</Link>
          </nav>

          <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
            &copy; 2026 HotByte Systems. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
