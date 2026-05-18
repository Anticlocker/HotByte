"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import CustomerNavbar from "@/components/CustomerNavbar";
import { Phone, User, KeyRound, ArrowRight, ShieldCheck } from "lucide-react";
import Swal from "sweetalert2";

export default function Login() {
  const router = useRouter();
  
  // Tabs: 'login' or 'register'
  const [tab, setTab] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Session check to redirect logged-in users to /menu
    fetch("/api/auth/session-check")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          router.push("/menu");
        }
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "");
    
    if (cleanPhone.length !== 10) {
      Swal.fire("Invalid Input", "Please enter a valid 10-digit mobile number.", "warning");
      return;
    }
    
    if (tab === "register" && name.trim().length < 2) {
      Swal.fire("Invalid Name", "Please enter a valid name (min 2 chars).", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          type: tab,
          name: tab === "register" ? name.trim() : undefined,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setOtpSent(true);
        setTimer(60);
        Swal.fire({
          title: "OTP Sent!",
          text: `Verification code sent to +91 ${phone}`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire("Failed to Send OTP", data.message || "OTP transmission failed.", "error");
      }
    } catch (err) {
      Swal.fire("Network Error", "Unable to contact verification service.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join("");
    if (otpCode.length !== 6) {
      Swal.fire("Invalid Verification Code", "Please enter the full 6-digit code.", "warning");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: otpCode,
          type: tab,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        Swal.fire({
          title: tab === "register" ? "Registered!" : "Logged In!",
          text: data.message || "Welcome to HotByte!",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        router.push("/menu");
      } else {
        Swal.fire("Verification Failed", data.message || "Incorrect verification code.", "error");
      }
    } catch (err) {
      Swal.fire("Network Error", "Unable to contact verification server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="mesh-gradient min-h-screen flex flex-col justify-between selection:bg-orange-100 selection:text-orange-700">
      <CustomerNavbar />

      <main className="flex-grow flex items-center justify-center py-10 px-6">
        <div className="w-full max-w-md glass-card p-8 rounded-3xl animate-fade-in-up">
          
          {/* Form Header */}
          <div className="text-center space-y-2 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-orange-100/50 text-[var(--orange)] flex items-center justify-center mx-auto text-xl shadow-inner animate-pulse">
              <KeyRound size={22} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {otpSent ? "Verify Mobile Number" : tab === "login" ? "Welcome Back!" : "Join HotByte Today!"}
            </h2>
            <p className="text-xs text-gray-400 font-semibold tracking-wide uppercase">
              {otpSent ? "Enter 6-Digit OTP Sent to Device" : "Fast & Secure Passwordless Access"}
            </p>
          </div>

          {!otpSent ? (
            <>
              {/* Tab Selector */}
              <div className="flex bg-gray-100/80 p-1.5 rounded-2xl mb-8 relative">
                <button
                  onClick={() => setTab("login")}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 cursor-pointer ${
                    tab === "login"
                      ? "bg-white text-gray-950 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setTab("register")}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 cursor-pointer ${
                    tab === "register"
                      ? "bg-white text-gray-950 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Input Forms */}
              <form onSubmit={handleSendOTP} className="space-y-6">
                {tab === "register" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 tracking-wide block uppercase">
                      Your Full Name
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-gray-400">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-150 focus:border-[var(--orange)] focus:ring-2 focus:ring-orange-100 text-sm font-semibold text-gray-800 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 tracking-wide block uppercase">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-gray-400">
                      <Phone size={18} />
                    </div>
                    <span className="absolute left-12 text-sm font-bold text-gray-800 border-r border-gray-250 pr-2.5">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      required
                      className="w-full pl-24 pr-4 py-4 rounded-2xl bg-white border border-gray-150 focus:border-[var(--orange)] focus:ring-2 focus:ring-orange-100 text-sm font-bold text-gray-850 tracking-wide outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-orange py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2.5 shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  ) : (
                    <>
                      <span>Send OTP Code</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* OTP Verification Screen */
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-bold text-gray-500 tracking-wide uppercase">
                    Verification Code
                  </label>
                  <span className="text-[10px] font-bold text-gray-400">
                    Sent to +91 {phone}
                  </span>
                </div>

                {/* OTP Input Boxes Grid */}
                <div className="grid grid-cols-6 gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      ref={(el) => {
                        otpInputsRef.current[idx] = el;
                      }}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-full aspect-square text-center font-black text-xl rounded-xl bg-white border border-gray-150 focus:border-[var(--orange)] focus:ring-2 focus:ring-orange-100 text-gray-900 outline-none transition-all"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-orange py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2.5 shadow-lg shadow-orange-500/20 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Verify & Continue</span>
                  </>
                )}
              </button>

              {/* Resend Panel */}
              <div className="text-center pt-2">
                {timer > 0 ? (
                  <p className="text-xs font-semibold text-gray-400">
                    Resend code in <span className="text-orange-500 font-bold">{timer}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="text-xs font-bold text-[var(--orange)] hover:underline cursor-pointer"
                  >
                    Resend Verification OTP
                  </button>
                )}
              </div>

              {/* Change Phone Option */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpDigits(["", "", "", "", "", ""]);
                  }}
                  className="text-xs font-semibold text-gray-450 hover:text-gray-700 cursor-pointer"
                >
                  Change Phone Number
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="w-full py-4 border-t border-gray-150/40 bg-white/60 text-center">
        <p className="text-[10px] font-bold text-gray-450 uppercase tracking-[0.2em]">
          &copy; 2026 HotByte. Secure OTP Verification.
        </p>
      </footer>
    </div>
  );
}
