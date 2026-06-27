"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Building2, UserCheck, ShieldCheck, Mail, Lock, Phone, MapPin, 
  ArrowRight, ArrowLeft, Loader2, Star, CheckCircle, Sparkles, Flame,
  CreditCard, UploadCloud, Globe, Landmark, Eye, EyeOff
} from "lucide-react";
import Swal from "sweetalert2";
import { logger } from "@/lib/utils/logger";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL params on startup
  const urlPlan = searchParams.get("plan") || "basic";
  const urlBilling = searchParams.get("billing") || "monthly";
  const urlToken = searchParams.get("token");

  // CSRF token for API requests
  const [csrfToken, setCsrfToken] = useState("");

  // Helper to make state-changing API calls with CSRF protection
  const apiPost = async (url: string, body: any) => {
    let token = csrfToken;
    if (!token) {
      const res = await fetch("/api/auth/csrf-token");
      const data = await res.json();
      token = data.csrfToken;
      if (token) setCsrfToken(token);
    }
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": token,
      },
      body: JSON.stringify(body),
    });
  };

  // Onboarding wizard steps: 1 = Account, 2 = Payment, 3 = Hotel Details, 4 = Ready
  const [step, setStep] = useState(1);
  const [sessionToken, setSessionToken] = useState(urlToken || "");
  const [loading, setLoading] = useState(false);
  const [planPrice, setPlanPrice] = useState(0);

  // --- Step 1: Account Creation State ---
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validatingAccount, setValidatingAccount] = useState(false);

  // --- Step 2: Payment State ---
  const [razorpayOrderId, setRazorpayOrderId] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // --- Step 3: Hotel Details State ---
  const [hotelName, setHotelName] = useState("");
  const [hotelSlug, setHotelSlug] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [hotelType, setHotelType] = useState<"veg" | "nonveg" | "both">("both");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // --- Step 4: Completion State ---
  const [provisioning, setProvisioning] = useState(false);

  // Pre-load session if returning with a token
  useEffect(() => {
    // Fetch CSRF token on mount for all state-changing API calls
    fetch("/api/auth/csrf-token")
      .then((r) => r.json())
      .then((d) => { if (d.csrfToken) setCsrfToken(d.csrfToken); })
      .catch(() => {});
    if (urlToken) {
      const fetchSession = async () => {
        try {
          setLoading(true);
          const res = await fetch(`/api/payments/onboarding-session/${urlToken}`);
          const data = await res.json();
          if (data.success) {
            setSessionToken(urlToken);
            setPlanPrice(data.price);
            if (data.status === "paid") {
              setStep(3); // Jump directly to hotel details
            } else if (data.status === "pending_payment") {
              setStep(2); // Resume at checkout
            }
          }
        } catch (err) {
          logger.error("Error pre-loading onboarding session:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchSession();
    }
  }, [urlToken]);

  // Load Razorpay Script Helper
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Live auto-slugification for hotel name
  const handleHotelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHotelName(val);
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setHotelSlug(generated);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, "");
    setHotelSlug(val);
  };

  // Browser Geolocation integration
  const detectLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire("Not Supported", "Your browser does not support geolocation.", "info");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setDetectingLocation(false);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Location detected automatically!",
          timer: 3000,
          showConfirmButton: false,
        });
      },
      (error) => {
        logger.error("Geolocation error:", error);
        setDetectingLocation(false);
        // Fallback to randomized coordinates in major region
        setLatitude(22.5726 + (Math.random() - 0.5) * 0.1);
        setLongitude(88.3639 + (Math.random() - 0.5) * 0.1);
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: "Using approximate region coordinates.",
          timer: 3000,
          showConfirmButton: false,
        });
      }
    );
  };

  // Trigger geolocation detection as soon as they reach step 3
  useEffect(() => {
    if (step === 3) {
      detectLocation();
    }
  }, [step]);

  // Step 1: Submit and validate account details
  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !username.trim() || !password || !confirmPassword) {
      Swal.fire("Validation Error", "All fields are required.", "warning");
      return;
    }

    if (password !== confirmPassword) {
      Swal.fire("Mismatch", "Passwords do not match.", "warning");
      return;
    }

    if (password.length < 6) {
      Swal.fire("Weak Password", "Password must be at least 6 characters.", "warning");
      return;
    }

    try {
      setValidatingAccount(true);
      
      // Pre-validate account uniqueness and create inactive session
      const res = await apiPost("/api/payments/create-inactive-session", {
          plan: urlPlan,
          billing_cycle: urlBilling,
          username,
          email,
          password
        });

      const data = await res.json();
      
      if (data.success) {
        setSessionToken(data.token);
        setPlanPrice(data.amount);
        setRazorpayOrderId(data.razorpay_order.id);
        setStep(2);
      } else {
        Swal.fire("Setup Blocked", data.message || "Username or email is already registered.", "error");
      }
    } catch (err) {
      logger.error("Account creation validation error:", err);
      Swal.fire("Network Error", "Failed to connect to billing validator.", "error");
    } finally {
      setValidatingAccount(false);
    }
  };

  // Step 2: Pay via Razorpay
  const handlePayment = async () => {
    if (processingPayment) return;

    try {
      setProcessingPayment(true);

      // Load Razorpay keys and script
      const keyRes = await fetch("/api/payments/public-razorpay-key");
      const keyData = await keyRes.json();
      
      if (!keyData.success) {
        Swal.fire("Billing Error", "Failed to fetch secure credentials.", "error");
        setProcessingPayment(false);
        return;
      }

      const razorpayKey = window.atob(keyData.key);
      const scriptLoaded = await loadRazorpayScript();
      
      if (!scriptLoaded) {
        Swal.fire("Billing Error", "Could not load Razorpay SDK.", "error");
        setProcessingPayment(false);
        return;
      }

      // Order Amount in paise is calculated backend, we fetch details
      const options = {
        key: razorpayKey,
        amount: Math.round(planPrice * 100),
        currency: "INR",
        name: "HotByte SaaS",
        description: `${urlPlan.toUpperCase()} Plan Registration (${urlBilling})`,
        order_id: razorpayOrderId,
        handler: async function (response: any) {
          Swal.fire({
            title: "Securing Transaction...",
            text: "Please hold while we verify payment signatures.",
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });

          const verifyRes = await apiPost("/api/payments/verify-onboarding-payment", {
              token: sessionToken,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            Swal.fire({
              title: "Payment Confirmed! 🎉",
              text: "Transaction secured. Let's finish setting up your Hotel profile.",
              icon: "success",
              confirmButtonColor: "#ff5a1f",
              confirmButtonText: "Configure Hotel Details"
            }).then(() => {
              setStep(3); // Advance to Step 3: Hotel Setup
            });
          } else {
            Swal.fire("Verification Error", verifyData.message || "Failed to confirm transaction.", "error");
          }
          setProcessingPayment(false);
        },
        modal: {
          ondismiss: function () {
            Swal.fire("Payment Cancelled", "Registration payment cancelled. You can try checkout again when ready.", "info");
            setProcessingPayment(false);
          }
        },
        prefill: {
          name: username,
          email: email
        },
        theme: {
          color: "#ff5a1f"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err) {
      logger.error("Razorpay widget error:", err);
      Swal.fire("Payment Window Failed", "Unable to open billing gateway.", "error");
      setProcessingPayment(false);
    }
  };

  // Step 3: Finalize Hotel Profile and provisioning
  const handleHotelSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hotelName.trim() || !hotelSlug.trim()) {
      Swal.fire("Validation Error", "Hotel Name and Custom URL Slug are required.", "warning");
      return;
    }

    try {
      setProvisioning(true);

      Swal.fire({
        title: "Provisioning Workspace...",
        text: "Setting up database instances, custom tables, and seeding dynamic digital menu.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const res = await apiPost("/api/payments/complete-onboarding", {
          token: sessionToken,
          hotelName,
          hotelSlug,
          hotelPhone,
          hotelAddress,
          latitude,
          longitude,
          logoUrl,
          hotelType
        });

      const data = await res.json();

      if (data.success) {
        setStep(4); // Advance to Step 4 Success!
        Swal.fire({
          title: "SaaS Space Provisioned! 🚀",
          text: `Welcome! "${hotelName}" is now fully live with isolated database structure.`,
          icon: "success",
          confirmButtonColor: "#ff5a1f",
          confirmButtonText: "Launch Admin Dashboard"
        }).then(() => {
          router.push(`/admin?hotel=${hotelSlug}`);
        });
      } else {
        Swal.fire("Onboarding Failed", data.message || "Failed to configure tenant. Check slug constraints.", "error");
      }
    } catch (err) {
      logger.error("Hotel onboarding submission error:", err);
      Swal.fire("Network Error", "Failed to complete SaaS configurations.", "error");
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div className="bg-[#050507] min-h-screen text-white font-sans selection:bg-orange-500/30 overflow-x-hidden antialiased flex flex-col justify-between">
      
      {/* Decorative Orbs */}
      <div className="fixed top-[-10%] right-[-10%] w-[50vw] aspect-square rounded-full bg-orange-600/5 filter blur-[150px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[50vw] aspect-square rounded-full bg-amber-600/5 filter blur-[150px] pointer-events-none z-0" />

      {/* Header bar */}
      <header className="z-40 bg-[#050507]/80 backdrop-blur-xl border-b border-gray-900/60 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center">
              <Flame size={14} className="text-white fill-white" />
            </div>
            <span className="text-base font-black tracking-tight">
              Hot<span className="text-orange-500">Byte</span> Onboarding
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-900/20 px-3 py-1.5 rounded-lg border border-gray-900">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span>Redesigned SaaS Wizard</span>
          </div>
        </div>
      </header>

      {/* Wizard Progress Steps Indicator */}
      <div className="w-full max-w-3xl mx-auto px-6 pt-10 z-10">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gray-900 -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-[2px] bg-gradient-to-r from-orange-500 to-amber-500 -translate-y-1/2 z-0 transition-all duration-500" 
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />

          {[
            { num: 1, label: "Account Setup", icon: UserCheck },
            { num: 2, label: "Secure Payment", icon: CreditCard },
            { num: 3, label: "Hotel Profile", icon: Building2 },
            { num: 4, label: "Provisioning", icon: Sparkles }
          ].map((s) => {
            const IconComponent = s.icon;
            const isCompleted = step > s.num;
            const isActive = step === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center z-10">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted 
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white scale-110 shadow-lg shadow-orange-500/20" 
                      : isActive 
                        ? "bg-orange-500/20 border-2 border-orange-500 text-orange-400 scale-110 shadow-lg shadow-orange-500/10" 
                        : "bg-gray-950 border border-gray-900 text-gray-500"
                  }`}
                >
                  {isCompleted ? <CheckCircle size={16} /> : <IconComponent size={16} />}
                </div>
                <span 
                  className={`text-[9px] font-black uppercase tracking-wider mt-2 transition-all ${
                    isActive ? "text-orange-400 font-bold" : isCompleted ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form container */}
      <main className="z-10 max-w-4xl w-full mx-auto px-6 py-10 flex-grow flex items-center justify-center">
        
        {/* STEP 1: Account Creation */}
        {step === 1 && (
          <form 
            onSubmit={handleAccountCreation}
            className="glass-card-dark rounded-3xl border border-gray-900/60 p-8 w-full max-w-xl space-y-6 shadow-2xl relative overflow-hidden transition-all duration-500 transform hover:scale-[1.01]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 filter blur-xl rounded-full" />
            
            <div className="space-y-1">
              <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck size={12} />
                Step 1 of 4 • Inactive Partner registration
              </span>
              <h2 className="text-2xl font-black tracking-tight uppercase">Create Partner Account</h2>
              <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                Choose your credentials to secure your HotByte dashboard. We will validate uniqueness and hold your session pending checkout.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. manager@hotel.com"
                    className="w-full p-3.5 pl-11 bg-[#090b0e] border border-gray-900 rounded-xl outline-none focus:border-orange-500/50 text-sm font-bold text-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Username</label>
                <div className="relative">
                  <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
                    placeholder="e.g. grandadmin"
                    className="w-full p-3.5 pl-11 bg-[#090b0e] border border-gray-900 rounded-xl outline-none focus:border-orange-500/50 text-sm font-bold text-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[9px] font-black text-orange-500 hover:text-orange-400 uppercase tracking-wider flex items-center gap-1 cursor-pointer select-none"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff size={11} />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye size={11} />
                          <span>Show</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full p-3.5 pl-11 pr-11 bg-[#090b0e] border border-gray-900 rounded-xl outline-none focus:border-orange-500/50 text-sm font-bold text-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full p-3.5 pl-11 pr-11 bg-[#090b0e] border border-gray-900 rounded-xl outline-none focus:border-orange-500/50 text-sm font-bold text-white transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-900/60 flex justify-end">
              <button
                type="submit"
                disabled={validatingAccount}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black py-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-orange-500/10 cursor-pointer disabled:opacity-50"
              >
                {validatingAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Secure Payment</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Payment Checkout */}
        {step === 2 && (
          <div className="glass-card-dark rounded-3xl border border-gray-900/60 p-8 w-full max-w-md space-y-6 shadow-2xl relative overflow-hidden transition-all duration-500 transform hover:scale-[1.01]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 filter blur-xl rounded-full" />

            <div className="space-y-1 text-center">
              <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 mx-auto">
                <CreditCard size={12} />
                Step 2 of 4 • Razorpay payment portal
              </span>
              <h2 className="text-2xl font-black tracking-tight uppercase">SaaS License Payment</h2>
              <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                Activate subscription features instantly. Pay securely using dynamic Razorpay integrations.
              </p>
            </div>

            {/* Price Ledger Card */}
            <div className="bg-[#090b0e] border border-gray-900 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-950 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                    <Star size={14} className="fill-orange-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block capitalize">
                      {urlPlan === "trial" ? "14-Day Trial" : `${urlPlan} Plan`}
                    </span>
                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider block mt-0.5">
                      {urlPlan === "trial" ? "Verification Checkout" : `${urlBilling} cycle`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-yellow-500">₹{planPrice.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <span>Account Status:</span>
                <span className="text-amber-500">Pending Checkout</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button
                onClick={handlePayment}
                disabled={processingPayment}
                className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white font-black py-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-orange-500/20 cursor-pointer disabled:opacity-50"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing Secure Gateway...</span>
                  </>
                ) : (
                  <>
                    <Landmark size={14} />
                    <span>Authorize Razorpay checkout</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <button
                onClick={() => setStep(1)}
                className="w-full border border-gray-900 bg-transparent text-gray-400 hover:text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:bg-gray-900/30"
              >
                <ArrowLeft size={12} />
                <span>Modify Credentials</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Hotel Profile Setup */}
        {step === 3 && (
          <form 
            onSubmit={handleHotelSetupSubmit}
            className="glass-card-dark rounded-3xl border border-gray-900/60 p-8 w-full max-w-2xl space-y-6 shadow-2xl relative overflow-hidden transition-all duration-500 transform hover:scale-[1.01]"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 filter blur-xl rounded-full" />
            
            <div className="space-y-1">
              <span className="text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Building2 size={12} />
                Step 3 of 4 • Hotel Workspace configuration
              </span>
              <h2 className="text-2xl font-black tracking-tight uppercase">Setup Hotel Profile</h2>
              <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                Payment verified successfully! Enter your physical hotel details below to seed default menus and establish geofenced tracking.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Hotel Name <strong className="text-red-500">*</strong></label>
                <input
                  type="text"
                  required
                  value={hotelName}
                  onChange={handleHotelNameChange}
                  placeholder="e.g. Spicy Treat Buffet"
                  className="w-full p-3.5 bg-[#090b0e] border border-gray-900 rounded-xl outline-none focus:border-orange-500/50 text-sm font-bold text-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Custom Public Link URL <strong className="text-red-500">*</strong></label>
                <div className="flex items-stretch bg-[#090b0e] border border-gray-900 rounded-xl overflow-hidden focus-within:border-orange-500/50 transition-colors">
                  <span className="bg-[#0e1116] border-r border-gray-900 px-3.5 flex items-center text-xs font-bold text-gray-500 select-none">
                    /menu/
                  </span>
                  <input
                    type="text"
                    required
                    value={hotelSlug}
                    onChange={handleSlugChange}
                    placeholder="spicy-treat"
                    className="w-full p-3.5 bg-transparent outline-none text-sm font-bold text-white"
                  />
                </div>
                <span className="text-[10px] font-semibold text-gray-500 block mt-1">
                  Preview URL: <strong className="text-orange-500 font-bold">hotbyte.in/{hotelSlug || "slug"}</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    value={hotelPhone}
                    onChange={(e) => setHotelPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="e.g. 9876543210"
                    className="w-full p-3.5 pl-11 bg-[#090b0e] border border-gray-900 rounded-xl outline-none focus:border-orange-500/50 text-sm font-bold text-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Hotel Logo URL (optional)</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="e.g. https://domain.com/logo.png"
                    className="w-full p-3.5 pl-11 bg-[#090b0e] border border-gray-900 rounded-xl outline-none focus:border-orange-500/50 text-sm font-bold text-white transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Hotel Address</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  value={hotelAddress}
                  onChange={(e) => setHotelAddress(e.target.value)}
                  placeholder="e.g. Sector-5, Salt Lake, Kolkata"
                  className="w-full p-3.5 pl-11 bg-[#090b0e] border border-gray-900 rounded-xl outline-none focus:border-orange-500/50 text-sm font-bold text-white transition-colors"
                />
              </div>
            </div>

            {/* Hotel Type Selector */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Hotel Dining Type <strong className="text-red-500">*</strong></label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  {
                    value: "veg",
                    emoji: "🌱",
                    label: "Veg Only",
                    sub: "Pure Veg",
                    activeClass: "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_12px_rgba(16,185,129,0.12)]",
                    iconActiveBg: "bg-emerald-500/10 text-emerald-400",
                    titleActiveColor: "text-emerald-400",
                    badgeBg: "bg-emerald-500",
                    badgeText: "text-black"
                  },
                  {
                    value: "nonveg",
                    emoji: "🍗",
                    label: "Non-Veg Only",
                    sub: "Non-Veg",
                    activeClass: "border-red-500/40 bg-red-500/5 shadow-[0_0_12px_rgba(239,68,68,0.12)]",
                    iconActiveBg: "bg-red-500/10 text-red-400",
                    titleActiveColor: "text-red-400",
                    badgeBg: "bg-red-500",
                    badgeText: "text-white"
                  },
                  {
                    value: "both",
                    emoji: "🍽️",
                    label: "Veg & Non-Veg",
                    sub: "Both categories",
                    activeClass: "border-orange-500/40 bg-orange-500/5 shadow-[0_0_12px_rgba(255,90,31,0.12)]",
                    iconActiveBg: "bg-orange-500/10 text-orange-400",
                    titleActiveColor: "text-orange-400",
                    badgeBg: "bg-[#ff5a1f]",
                    badgeText: "text-white"
                  }
                ] as const).map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setHotelType(type.value)}
                    className={`relative flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                      hotelType === type.value
                        ? type.activeClass
                        : "border-gray-900 bg-[#090b0e] text-gray-400 hover:border-gray-800 hover:bg-[#0c0f14]"
                    }`}
                  >
                    {/* Compact Icon Wrap */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-colors ${
                      hotelType === type.value ? type.iconActiveBg : "bg-[#10141b] text-gray-500"
                    }`}>
                      {type.emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className={`block text-[10px] font-black uppercase tracking-wider ${
                        hotelType === type.value ? type.titleActiveColor : "text-gray-300"
                      }`}>
                        {type.label}
                      </span>
                      <span className="block text-[8px] text-gray-500 font-semibold mt-0.5">
                        {type.sub}
                      </span>
                    </div>

                    {/* Elegant micro checkmark */}
                    {hotelType === type.value && (
                      <span className={`absolute top-2.5 right-2.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black ${type.badgeBg} ${type.badgeText}`}>
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Location mapping dashboard info */}
            <div className="bg-[#090b0e] border border-gray-900 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Geofence Coords Auto-detected</span>
                <span className="text-xs font-extrabold text-white block">
                  {latitude && longitude ? `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}` : "Detecting browser location..."}
                </span>
              </div>
              <button
                type="button"
                onClick={detectLocation}
                disabled={detectingLocation}
                className="bg-orange-500/10 border border-orange-500/25 text-orange-400 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-lg hover:bg-orange-500/20 active:scale-95 transition-all cursor-pointer"
              >
                {detectingLocation ? "Detecting..." : "Re-detect"}
              </button>
            </div>

            <div className="pt-2 border-t border-gray-900/60 flex justify-end">
              <button
                type="submit"
                disabled={provisioning}
                className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white font-black py-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all shadow-xl shadow-orange-500/20 cursor-pointer disabled:opacity-50"
              >
                {provisioning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Provisioning SaaS space...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="fill-white" />
                    <span>Complete SaaS Activation</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Complete/Ready Provisioning */}
        {step === 4 && (
          <div className="glass-card-dark rounded-3xl border border-gray-900/60 p-10 w-full max-w-md text-center space-y-6 shadow-2xl relative overflow-hidden transition-all duration-500">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 filter blur-xl rounded-full" />
            
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <Sparkles className="w-10 h-10 fill-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-2">
              <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Setup Successful 🎉</span>
              <h2 className="text-3xl font-black tracking-tight uppercase">Dashboard Ready!</h2>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                Your secure space has been created, active subscription enabled, and Super Admin logs populated. Launching dashboard...
              </p>
            </div>

            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          </div>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="z-10 py-6 text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest border-t border-gray-950 bg-[#050507]">
        © 2026 HotByte SaaS Platform. Secure isolated workspaces.
      </footer>
    </div>
  );
}

export default function Onboarding() {
  return (
    <Suspense fallback={
      <div className="bg-[#050507] min-h-screen text-white flex flex-col justify-center items-center gap-4 font-sans">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Loading onboarding session...</p>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
