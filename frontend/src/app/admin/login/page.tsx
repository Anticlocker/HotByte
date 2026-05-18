"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ShieldAlert, ArrowRight } from "lucide-react";
import Swal from "sweetalert2";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Redirect if already logged in as admin
    fetch("/api/auth/admin/session-check")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          router.push("/admin");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      Swal.fire("Inputs Required", "Please enter both username and password.", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          title: "Access Granted!",
          text: "Authorized session established.",
          icon: "success",
          timer: 1200,
          showConfirmButton: false,
        });
        router.push("/admin");
      } else {
        Swal.fire("Access Denied", data.message || "Invalid administrative credentials.", "error");
      }
    } catch (err) {
      Swal.fire("Connection Error", "Failed to communicate with authorization server.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen flex flex-col justify-between items-center py-12 px-6 relative overflow-hidden">
      
      {/* Glow Effect Backdrop */}
      <div className="absolute top-[20%] left-[50%] -translate-x-[50%] w-[350px] sm:w-[450px] aspect-square rounded-full bg-orange-500/5 filter blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white btn-orange shadow-lg shadow-orange-500/20">
          <i className="fas fa-fire text-sm"></i>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-lg font-black tracking-tighter text-white">
            Hot<span className="text-[var(--orange)]">Byte</span>
          </span>
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 opacity-80">
            Control Center
          </span>
        </div>
      </div>

      {/* Form Container */}
      <main className="w-full max-w-sm glass-card-dark p-8 rounded-3xl relative z-10">
        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[var(--orange)] flex items-center justify-center mx-auto text-xl shadow-inner animate-pulse">
            <ShieldAlert size={22} />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Manager Authentication</h2>
          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
            Restricted Admin Access Portal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 tracking-wide block uppercase">
              Username ID
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
                placeholder="ravi"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-900 border border-gray-800 text-sm font-semibold text-gray-200 placeholder-gray-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 tracking-wide block uppercase">
              Security Key
            </label>
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
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-gray-900 border border-gray-800 text-sm font-semibold text-gray-200 placeholder-gray-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-orange py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            ) : (
              <>
                <span>Login</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center">
        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
          &copy; 2026 HotByte. Secure TLS Encrypted.
        </p>
      </footer>
    </div>
  );
}
