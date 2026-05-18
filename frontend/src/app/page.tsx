"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import CustomerNavbar from "@/components/CustomerNavbar";
import { Bolt, Check, Utensils, ArrowRight, UserCircle, QrCode } from "lucide-react";

export default function Home() {
  const [splashState, setSplashState] = useState<"visible" | "fading" | "hidden">("visible");
  const [embers, setEmbers] = useState<{ id: number; color: string; tx: string; ty: string; width: string }[]>([]);

  useEffect(() => {
    // Spawn initial ember burst particles (Runs exactly ONCE on mount - zero continuous React re-renders!)
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

    // Begin smooth fade-out after 2.5s (2.5 seconds active duration)
    const fadeTimer = setTimeout(() => {
      setSplashState("fading");
      
      // Fully unmount from DOM after the 1.5s CSS transition completes
      unmountTimer = setTimeout(() => {
        setSplashState("hidden");
      }, 1500);
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
    };
  }, []);

  return (
    <div className="mesh-gradient min-h-screen flex flex-col justify-between selection:bg-orange-100 selection:text-orange-700">
      {/* 1. Splash Screen Intro */}
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
                style={{
                  width: ember.width,
                  height: ember.width,
                  // @ts-ignore
                  "--tx": ember.tx,
                  "--ty": ember.ty,
                }}
              />
            ))}
          </div>
          <div className="splash-logo flex flex-col items-center gap-5">
            <div className="splash-icon-wrapper">
              <div className="splash-icon-ring"></div>
              <div className="splash-icon-ring-reverse"></div>
              <div className="splash-icon-glow"></div>
              
              {/* Upwards floating fire sparkles - GPU composited 60fps animations */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="floating-sparkle sparkle-gold" style={{ left: "10%", animationDelay: "0.2s", "--drift": "-30px", width: "5px", height: "5px" } as any}></div>
                <div className="floating-sparkle sparkle-orange" style={{ left: "22%", animationDelay: "1.2s", "--drift": "20px", width: "6px", height: "6px" } as any}></div>
                <div className="floating-sparkle sparkle-white" style={{ left: "35%", animationDelay: "0.8s", "--drift": "-15px", width: "4px", height: "4px" } as any}></div>
                <div className="floating-sparkle sparkle-gold" style={{ left: "48%", animationDelay: "2.4s", "--drift": "25px", width: "5px", height: "5px" } as any}></div>
                <div className="floating-sparkle sparkle-orange" style={{ left: "58%", animationDelay: "0.5s", "--drift": "-25px", width: "7px", height: "7px" } as any}></div>
                <div className="floating-sparkle sparkle-white" style={{ left: "68%", animationDelay: "1.9s", "--drift": "15px", width: "4px", height: "4px" } as any}></div>
                <div className="floating-sparkle sparkle-gold" style={{ left: "78%", animationDelay: "1.4s", "--drift": "-20px", width: "6px", height: "6px" } as any}></div>
                <div className="floating-sparkle sparkle-orange" style={{ left: "86%", animationDelay: "2.9s", "--drift": "30px", width: "5px", height: "5px" } as any}></div>
                <div className="floating-sparkle sparkle-white" style={{ left: "92%", animationDelay: "0.3s", "--drift": "-10px", width: "4px", height: "4px" } as any}></div>
                <div className="floating-sparkle sparkle-gold" style={{ left: "97%", animationDelay: "1.7s", "--drift": "15px", width: "5px", height: "5px" } as any}></div>
              </div>

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

      {/* 2. Sleek Navbar */}
      <CustomerNavbar />

      {/* 3. Hero Sections */}
      <main className="flex-grow flex items-center py-10 lg:py-16 px-6 lg:px-16 max-w-[1280px] mx-auto w-full">
        <div className="w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left Text Column */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start animate-fade-in-up">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide border bg-orange-50/50 border-orange-200/55 text-[var(--orange)]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                Next-Gen Digital Menu Platform
              </div>
            </div>

            <div className="space-y-4 animate-fade-in-up-delay">
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black text-gray-900 leading-[1.1] tracking-tight">
                Dining,<br />
                <span className="bg-gradient-to-r from-orange-500 to-orange-700 bg-clip-text text-transparent">
                  Reimagined
                </span>
              </h1>
              <p className="text-base lg:text-lg text-gray-500 max-w-md mx-auto lg:mx-0 leading-relaxed font-medium">
                Scan. Browse. Order. HotByte brings a seamless digital menu experience to your table – fast, intuitive, and beautifully designed.
              </p>
            </div>

            {/* CTA Triggers */}
            <div className="animate-fade-in-up-delay-2 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/menu"
                className="btn-orange px-8 py-4 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-3 cursor-pointer"
              >
                <Utensils size={18} className="opacity-90" />
                <span>View Menu & Order</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="btn-secondary-glass px-8 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCircle size={18} className="opacity-80" />
                <span>Sign In</span>
              </Link>
            </div>

            {/* Feature Badges */}
            <div className="animate-fade-in-up-delay-2 flex flex-wrap gap-2.5 justify-center lg:justify-start pt-2">
              {[
                { label: "Instant Orders", icon: "bolt" },
                { label: "QR-Based", icon: "qrcode" },
                { label: "Secure Payments", icon: "shield-alt" },
                { label: "Live Dashboard", icon: "chart-line" }
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="feature-chip inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-semibold text-gray-600 border border-gray-100 shadow-sm hover:shadow-orange-200"
                >
                  <i className={`fas fa-${badge.icon} text-orange-500 text-xs`}></i>
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Plate Visuals Column */}
          <div className="relative flex justify-center items-center">
            
            {/* Float Badge 1: Fast Service */}
            <div className="absolute top-4 right-0 sm:right-6 lg:-right-4 z-20 animate-float">
              <div className="glass-card px-4 py-3 rounded-2xl flex items-center gap-3 relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-100/40 text-[var(--orange)] text-sm">
                  <Bolt size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 leading-tight">Fast Service</p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Live Order Tracking</p>
                </div>
              </div>
            </div>

            {/* Float Badge 2: Certified */}
            <div className="absolute bottom-4 left-0 sm:left-6 lg:-left-4 z-20 animate-float-delay">
              <div className="glass-card px-4 py-3 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 text-sm">
                  <Check size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 leading-tight">Hygienic</p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Certified Kitchen</p>
                </div>
              </div>
            </div>

            {/* Central QR Code Rotating Ring Graphic */}
            <div className="relative w-full max-w-[380px] sm:max-w-[420px] aspect-square flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[10px] border-orange-500/5"></div>
              <div className="absolute inset-[28px] rounded-full plate-glow bg-gradient-to-tr from-orange-500/5 to-orange-500/0 border border-orange-500/10"></div>
              <div className="absolute inset-[14px] rounded-full animate-spin-slow opacity-25 border border-dashed border-orange-500"></div>

              {/* Central Plate Card */}
              <div
                className="relative z-10 w-[64%] h-[64%] bg-white rounded-full flex flex-col items-center justify-center shadow-2xl border-[10px] border-orange-500/10"
              >
                <div className="p-2.5 bg-white keep-light rounded-2xl shadow-md border border-gray-100">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://www.rav1.in"
                    alt="Menu QR Code"
                    className="w-28 h-28 sm:w-36 sm:h-36 opacity-95 rounded-lg"
                  />
                </div>
                {/* Decorative Dots Top */}
                <div className="absolute top-4 flex gap-1">
                  <span className="w-1 h-1 rounded-full bg-orange-500/40"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500/60"></span>
                  <span className="w-1 h-1 rounded-full bg-orange-500/40"></span>
                </div>
                {/* Decorative Dots Bottom */}
                <div className="absolute bottom-4 flex gap-1">
                  <span className="w-1 h-1 rounded-full bg-orange-500/40"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500/60"></span>
                  <span className="w-1 h-1 rounded-full bg-orange-500/40"></span>
                </div>
              </div>

              {/* Scan Badge */}
              <div className="absolute bottom-8 z-20">
                <div className="glass-card px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold text-gray-700">
                  <QrCode size={14} className="text-orange-500" />
                  <span>Scan to Order</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* 4. Elegant Footer */}
      <footer className="w-full py-6 border-t border-gray-150/40 bg-white/60 flex flex-col sm:flex-row items-center justify-between px-6 lg:px-16 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs btn-orange shadow-md">
            <i className="fas fa-fire text-[9px]"></i>
          </div>
          <span className="text-xs font-black text-gray-400 tracking-wide">HotByte</span>
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center sm:text-right">
          &copy; 2026 HotByte. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
