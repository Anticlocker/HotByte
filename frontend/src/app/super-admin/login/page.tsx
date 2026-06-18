"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ShieldCheck, ArrowRight } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";

const getCsrfToken = () => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
};

export default function SuperAdminLogin() {
  const notif = useNotification();
  const router = useRouter();
  const [csrfToken, setCsrfToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot passkey flow states
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/csrf-token")
      .then((r) => r.json())
      .then((d) => { if (d.csrfToken) setCsrfToken(d.csrfToken); })
      .catch(() => {});
    fetch("/api/auth/admin/session-check")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.admin.role === "super_admin") {
          router.push("/super-admin/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  const csrfHeader = () => ({ "Content-Type": "application/json", "x-csrf-token": csrfToken || getCsrfToken() });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      notif.warning("Inputs Required", "Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: csrfHeader(),
        body: JSON.stringify({ username, password, role: "super_admin" }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.admin.role !== "super_admin") {
          await fetch("/api/auth/admin/logout", { method: "POST", headers: { "x-csrf-token": csrfToken || getCsrfToken() } });
          notif.error("Access Denied", "Unauthorized. You are not a global Super Admin.");
          setLoading(false);
          return;
        }

        notif.success("Super Access Granted!", "Global SaaS Control session established.");
        router.push("/super-admin/dashboard");
      } else {
        notif.error("Access Denied", data.message || "Invalid administrative credentials.");
      }
    } catch (err) {
      notif.error("Connection Error", "Failed to communicate with authorization server.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async () => {
    if (!forgotPhone.trim()) {
      notif.warning("Phone Required", "Please enter your registered phone number.");
      return;
    }
    setForgotLoading(true);
    setIsForgotOpen(true);
    setForgotStep(1);
    try {
      const res = await fetch("/api/auth/admin/forgot-otp", {
        method: "POST",
        headers: csrfHeader(),
        body: JSON.stringify({ username: "Admin", phone: forgotPhone }),
      });
      const data = await res.json();
      if (data.success) {
        notif.success("OTP Dispatched!", `Verification code sent to ${forgotPhone}.`);
        setForgotStep(2);
      } else {
        notif.error("Request Failed", data.message || "Failed to send OTP.");
        setIsForgotOpen(false);
      }
    } catch (err) {
      notif.error("Connection Error", "Could not reach the authorization server.");
      setIsForgotOpen(false);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen flex flex-col justify-between items-center py-12 px-6 relative overflow-hidden">
      
      {/* Dynamic Glow Effect Backdrop */}
      <div className="absolute top-[20%] left-[50%] -translate-x-[50%] w-[350px] sm:w-[450px] aspect-square rounded-full bg-yellow-500/5 filter blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr from-yellow-500 to-amber-600 shadow-lg shadow-yellow-500/20">
          <i className="fas fa-fire text-sm"></i>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-lg font-black tracking-tighter text-white">
            Hot<span className="text-amber-500">Byte</span>
          </span>
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 opacity-80">
            SaaS Platform Owner
          </span>
        </div>
      </div>

      {/* Form Container */}
      <main className="w-full max-w-sm glass-card-dark p-8 rounded-3xl relative z-10 border border-yellow-500/10">
        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto text-xl shadow-inner animate-pulse">
            <ShieldCheck size={22} />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Super Admin Login</h2>
          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
            SaaS Platform Operations Portal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 tracking-wide block uppercase">
              Superadmin ID
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-gray-500">
                <User size={16} />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-900 border border-gray-800 text-sm font-semibold text-gray-200 placeholder-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-gray-400 tracking-wide block uppercase">
                Secret Passkey
              </label>
              <button
                type="button"
                onClick={handleForgotRequest}
                className="text-[9px] font-bold text-yellow-500 hover:text-yellow-400 uppercase tracking-wider transition-colors outline-none cursor-pointer"
              >
                Forgot Passkey?
              </button>
            </div>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-gray-500">
                <Lock size={16} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-900 border border-gray-800 text-sm font-semibold text-gray-200 placeholder-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/25 cursor-pointer disabled:opacity-60 transition-all duration-300"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            ) : (
              <>
                <span>Enter Terminal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center">
        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
          &copy; 2026 HotByte SaaS Network. Secure TLS Encrypted.
        </p>
      </footer>

      {/* Forgot Passkey Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-sm glass-card-dark p-8 rounded-3xl border border-yellow-500/10 relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="absolute -top-[10%] -left-[10%] w-[120px] aspect-square rounded-full bg-yellow-500/5 filter blur-[30px] pointer-events-none"></div>
            
            <div className="text-center space-y-2 mb-6">
              <h3 className="text-lg font-black text-white tracking-tight">Forgot Passkey</h3>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest text-yellow-500">
                {forgotLoading ? "Sending OTP..." : forgotStep === 1 ? "Enter Your Phone" : "Enter OTP & New Passkey"}
              </p>
            </div>

            {forgotStep === 1 && !forgotLoading ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 tracking-wide block uppercase">Registered Phone</label>
                  <input
                    type="tel"
                    required
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-900 border border-gray-800 text-sm font-semibold text-gray-200 placeholder-gray-600 focus:border-yellow-500 outline-none transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleForgotRequest}
                  disabled={forgotLoading}
                  className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 py-3 rounded-2xl font-bold text-white text-sm cursor-pointer disabled:opacity-60 transition-all"
                >
                  Send OTP
                </button>
                <button
                  type="button"
                  onClick={() => { setIsForgotOpen(false); setForgotStep(1); }}
                  className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 py-3 rounded-2xl font-bold text-gray-400 text-sm cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : forgotStep === 1 && forgotLoading ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                <div className="w-10 h-10 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin"></div>
                <p className="text-xs text-gray-400 font-semibold tracking-wide animate-pulse">
                  Dispatching OTP to {forgotPhone}...
                </p>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!forgotOtp.trim() || !forgotNewPassword.trim()) {
                    notif.warning("Required Fields", "Please enter OTP and your new passkey.");
                    return;
                  }
                  if (forgotNewPassword.length < 6) {
                    notif.warning("Weak Passkey", "New passkey must be at least 6 characters.");
                    return;
                  }
                  setForgotLoading(true);
                  try {
                    const res = await fetch("/api/auth/admin/reset-password", {
                      method: "POST",
                      headers: csrfHeader(),
                      body: JSON.stringify({
                        username: "Admin",
                        phone: forgotPhone,
                        otp: forgotOtp,
                        password: forgotNewPassword,
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      notif.success("Passkey Reset!", data.message || "Your passkey has been reset successfully.");
                      setIsForgotOpen(false);
                      setForgotStep(1);
                      setForgotOtp("");
                      setForgotNewPassword("");
                    } else {
                      notif.error("Reset Failed", data.message || "Failed to reset passkey.");
                    }
                  } catch (err) {
                    notif.error("Connection Error", "Could not reach the authentication server.");
                  } finally {
                    setForgotLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 tracking-wide block uppercase">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-900 border border-gray-800 text-sm font-semibold text-gray-200 placeholder-gray-600 focus:border-yellow-500 outline-none transition-all tracking-widest text-center"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 tracking-wide block uppercase">
                    New Secret Passkey
                  </label>
                  <input
                    type="password"
                    required
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-900 border border-gray-800 text-sm font-semibold text-gray-200 placeholder-gray-600 focus:border-yellow-500 outline-none transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotOpen(false);
                      setForgotStep(1);
                    }}
                    className="w-1/2 bg-gray-900 hover:bg-gray-800 border border-gray-800 py-3 rounded-2xl font-bold text-gray-400 text-sm cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-1/2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 py-3 rounded-2xl font-bold text-white text-sm cursor-pointer disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    ) : (
                      "Reset Passkey"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
