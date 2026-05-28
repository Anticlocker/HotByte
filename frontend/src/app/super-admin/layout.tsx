"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/super-admin/login";
  const [loading, setLoading] = useState(!isLoginPage);

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    fetch("/api/auth/admin/session-check")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated || data.admin?.role !== "super_admin") {
          router.push("/super-admin/login");
          return;
        }
        setLoading(false);
      })
      .catch(() => {
        router.push("/super-admin/login");
      });
  }, [isLoginPage, router]);

  if (loading) {
    return (
      <div className="bg-[#0A0A0A] min-h-screen text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Verifying credentials...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
