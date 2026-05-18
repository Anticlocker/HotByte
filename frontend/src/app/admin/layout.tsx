"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-gray-150 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <AdminSidebar />

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
