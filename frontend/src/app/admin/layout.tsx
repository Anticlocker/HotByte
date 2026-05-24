"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [isFrozen, setIsFrozen] = useState(false);

  useEffect(() => {
    if (isLoginPage) return;
    
    fetch("/api/auth/admin/session-check")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || data.admin?.role !== "admin") {
          router.push("/admin/login");
          return;
        }
        if (data.isFrozen) {
          setIsFrozen(true);
        }
        // Contextual URL preservation: automatically append ?hotel=slug if missing
        const currentParams = new URLSearchParams(window.location.search);
        if (data.admin?.hotelSlug && !currentParams.has("hotel")) {
          currentParams.set("hotel", data.admin.hotelSlug);
          router.replace(`${pathname}?${currentParams.toString()}`);
        }
      })
      .catch(() => {});
  }, [isLoginPage, router, pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isFrozen) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Abstract luxury glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-[120px] animate-pulse"></div>
        
        {/* Glassmorphic Lockbox card */}
        <div className="relative w-full max-w-lg bg-[#0e0e0e]/85 backdrop-blur-xl border border-gray-900/60 rounded-[32px] p-8 md:p-12 text-center shadow-2xl flex flex-col items-center">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 text-3xl mb-6 shadow-lg shadow-red-500/5 animate-bounce">
            🥶
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-100 uppercase tracking-tight mb-3">
            Hotel Account Frozen
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mb-6"></div>
          <p className="text-sm font-semibold text-gray-400 leading-relaxed mb-8">
            Your hotel&apos;s free trial or subscription period has expired. Please buy a subscription or contact the platform super administrator to continue accessing the administrative dashboard.
          </p>
          <div className="w-full bg-[#141414]/80 border border-gray-900 rounded-2xl py-4 px-6 mb-8 flex flex-col items-center justify-center gap-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact System Administrator</span>
            <span className="text-xs font-black text-yellow-500 font-mono tracking-widest uppercase">support@hotbyte.in</span>
          </div>
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
            &copy; 2026 HotByte SaaS Technologies
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-gray-150 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <Suspense fallback={
        <div className="fixed inset-y-0 left-0 w-64 bg-[#121212] border-r border-gray-800 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
        </div>
      }>
        <AdminSidebar />
      </Suspense>

      {/* Control Console Page Content */}
      <div className="flex-grow lg:pl-64 min-h-screen flex flex-col justify-between relative">
        <div className="w-full">{children}</div>
        
        <footer className="w-full py-4 text-center border-t border-gray-800/30 bg-[#0e0e0e]/50 mt-8">
          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.25em]">
            &copy; 2026 HotByte. Control Terminal v2.1.
          </p>
        </footer>
      </div>
    </div>
  );
}
