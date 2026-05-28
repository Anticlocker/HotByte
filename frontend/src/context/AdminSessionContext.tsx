"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export interface AdminUser {
  username: string;
  role: string;
  hotelId: number | null;
  hotelSlug: string | null;
}

interface AdminSessionContextType {
  admin: AdminUser | null;
  authenticated: boolean;
  isFrozen: boolean;
  loading: boolean;
  mutate: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionContextType | undefined>(undefined);

export const AdminSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/admin/login";

  const fetchSession = async () => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/admin/session-check");
      const data = await res.json();
      
      if (!data.authenticated || data.admin?.role !== "admin") {
        setAuthenticated(false);
        setAdmin(null);
        router.push("/admin/login");
        return;
      }

      setAdmin(data.admin);
      setAuthenticated(true);
      if (data.isFrozen) {
        setIsFrozen(true);
      }

      // Contextual URL preservation: automatically append ?hotel=slug if missing
      const currentParams = new URLSearchParams(window.location.search);
      if (data.admin?.hotelSlug && !currentParams.has("hotel")) {
        currentParams.set("hotel", data.admin.hotelSlug);
        router.replace(`${pathname}?${currentParams.toString()}`);
      }
    } catch (err) {
      console.error("Session verification error:", err);
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [isLoginPage, pathname]);

  return (
    <AdminSessionContext.Provider
      value={{
        admin,
        authenticated,
        isFrozen,
        loading,
        mutate: fetchSession,
      }}
    >
      {children}
    </AdminSessionContext.Provider>
  );
};

export const useAdminSession = () => {
  const context = useContext(AdminSessionContext);
  if (context === undefined) {
    throw new Error("useAdminSession must be used within an AdminSessionProvider");
  }
  return context;
};
