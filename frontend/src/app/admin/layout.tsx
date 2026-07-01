"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import SubscriptionExpiredCard from "@/components/SubscriptionExpiredCard";
import { AdminSessionProvider, useAdminSession } from "@/context/AdminSessionContext";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isFrozen, loading, admin, plan, trialEndsAt, subscriptionExpiryDate, daysSinceExpiry, gracePeriodRemaining } = useAdminSession();
  const isLoginPage = pathname === "/admin/login";
  const isSubscriptionPage = pathname === "/admin/subscription-plans";

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Loading Control Terminal...
        </p>
      </div>
    );
  }

  if (isFrozen && !isSubscriptionPage) {
    return (
      <SubscriptionExpiredCard
        plan={plan}
        trialEndsAt={trialEndsAt}
        subscriptionExpiryDate={subscriptionExpiryDate}
        daysSinceExpiry={daysSinceExpiry}
        gracePeriodRemaining={gracePeriodRemaining}
        isAdmin={true}
        hotelSlug={admin?.hotelSlug}
      />
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminSessionProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminSessionProvider>
  );
}
