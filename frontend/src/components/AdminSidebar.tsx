"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ChefHat,
  BarChart3,
  Users,
  History,
  Settings,
  Star,
  LogOut,
  Menu,
  X,
  Lock,
} from "lucide-react";
import Swal from "sweetalert2";

interface AdminInfo {
  id: number;
  username: string;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/admin/session-check")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setAdmin(data.admin);
        } else {
          router.push("/admin/login");
        }
        setLoading(false);
      })
      .catch(() => {
        router.push("/admin/login");
        setLoading(false);
      });
  }, [router]);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Logout Admin?",
      text: "Are you sure you want to end your admin session?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#FF5A1F",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, Logout",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch("/api/auth/admin/logout", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          Swal.fire({
            title: "Logged Out",
            text: "Admin session closed successfully!",
            icon: "success",
            timer: 1200,
            showConfirmButton: false,
          });
          router.push("/admin/login");
        }
      } catch (err) {
        Swal.fire("Error", "Logout failed", "error");
      }
    }
  };

  const navItems = [
    { name: "Live Orders", href: "/admin", icon: LayoutDashboard },
    { name: "Kitchen KDS", href: "/admin/kitchen", icon: ChefHat },
    { name: "Sales Report", href: "/admin/sales-report", icon: BarChart3 },
    { name: "Customer Log", href: "/admin/users", icon: Users },
    { name: "Order History", href: "/admin/oldorders", icon: History },
    { name: "Menu & Categories", href: "/admin/settings", icon: Settings },
    { name: "Ratings & Reviews", href: "/admin/ratings", icon: Star },
  ];

  if (loading) {
    return (
      <div className="fixed inset-y-0 left-0 w-64 bg-[#121212] border-r border-gray-800 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2.5 bg-gray-900 text-white rounded-xl shadow-lg border border-gray-800 cursor-pointer hover:bg-gray-800"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Wrapper */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-[#121212] border-r border-gray-800 flex flex-col z-40 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white btn-orange shadow-lg">
            <i className="fas fa-fire text-sm"></i>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-black tracking-tighter text-white">
              Hot<span className="text-[var(--orange)]">Byte</span>
            </span>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 opacity-80">
              Admin Portal
            </span>
          </div>
        </div>

        {/* Current User Card */}
        {admin && (
          <div className="mx-4 my-4 p-4 rounded-xl bg-gray-900 border border-gray-850 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center text-[var(--orange)]">
              <Lock size={16} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-gray-400">Signed In As</span>
              <span className="text-sm font-black text-gray-200 truncate">
                {admin.username}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--orange)] text-white shadow-lg shadow-orange-500/20"
                    : "text-gray-400 hover:text-white hover:bg-gray-900"
                }`}
              >
                <Icon size={18} className={isActive ? "opacity-100" : "opacity-75"} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-400 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut size={18} className="opacity-75" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Overlay for mobile drawer */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity"
        ></div>
      )}
    </>
  );
}
