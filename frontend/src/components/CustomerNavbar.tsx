"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, User, Utensils, ShieldAlert, Sun, Moon, ShoppingCart } from "lucide-react";
import Swal from "sweetalert2";

interface Customer {
  id: number;
  name: string;
  phone: string;
  hotelSlug?: string;
}

export default function CustomerNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // 1. Scoped session check: fetch with hotel_slug parameter if browsing menu
    const pathParts = window.location.pathname.split("/");
    const hotelSlug = pathParts[1];
    const isHotelMenu = hotelSlug && !["admin", "super-admin", "login", "profile", "menu"].includes(hotelSlug);
    const sessionUrl = isHotelMenu ? `/api/auth/session-check?hotel_slug=${hotelSlug}` : "/api/auth/session-check";

    fetch(sessionUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setCustomer(data.customer);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // 2. Initialize Theme
    const savedTheme = localStorage.getItem("hotbyte_theme");
    if (savedTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }

    // 3. Initialize & Sync Cart
    const updateCartCount = () => {
      const savedCart = localStorage.getItem("hotbyte_cart");
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          const totalCount = parsed.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
          setCartCount(totalCount);
        } catch {
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }
    };

    updateCartCount();

    window.addEventListener("storage", updateCartCount);
    window.addEventListener("cartUpdated", updateCartCount);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      localStorage.setItem("hotbyte_theme", "dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("hotbyte_theme", "light");
    }
  };

  const handleCartClick = () => {
    const isMenuPage = pathname?.endsWith("/menu");
    if (isMenuPage) {
      window.dispatchEvent(new Event("openMenuCart"));
    } else {
      const slug = pathname?.split("/")[1];
      const menuPath =
        slug && !["admin", "super-admin", "login", "profile"].includes(slug)
          ? `/${slug}/menu?openCart=true`
          : "/";
      router.push(menuPath);
    }
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Logout?",
      text: "Are you sure you want to sign out?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#FF5A1F",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, Logout",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch("/api/auth/logout", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          Swal.fire({
            title: "Logged Out",
            text: "Signed out successfully!",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          });
          setCustomer(null);
          router.push("/");
        }
      } catch (err) {
        Swal.fire("Error", "Logout failed", "error");
      }
    }
  };

  return (
    <nav className="glass-nav sticky top-0 z-50 px-5 lg:px-16 py-3.5 flex items-center justify-between">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-3 cursor-pointer group">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all duration-300 group-hover:scale-105 btn-orange">
          <i className="fas fa-fire text-base"></i>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-xl font-black tracking-tighter text-gray-900 dark:text-white">
            Hot<span className="text-[var(--orange)]">Byte</span>
          </span>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5 opacity-80">
            Serve with Love
          </span>
        </div>
      </Link>

      {/* Nav Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Cart Icon Link */}
        <button
          onClick={handleCartClick}
          className="relative p-2.5 text-gray-600 dark:text-gray-450 hover:text-[var(--orange)] hover:bg-orange-50 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer flex items-center justify-center group"
          title="View Shopping Cart"
        >
          <ShoppingCart size={18} className="group-hover:scale-110 transition-transform duration-200" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[var(--orange)] text-white text-[9.5px] font-black flex items-center justify-center shadow-lg border-2 border-white dark:border-[#141821] animate-pulse">
              {cartCount}
            </span>
          )}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2.5 text-gray-600 dark:text-gray-450 hover:text-[var(--orange)] hover:bg-orange-50 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer flex items-center justify-center group"
          title="Toggle Dark/Light Mode"
        >
          {theme === "dark" ? (
            <Sun size={18} className="text-amber-400 animate-spin-slow group-hover:scale-110 transition-transform" />
          ) : (
            <Moon size={18} className="text-gray-600 group-hover:scale-110 transition-transform" />
          )}
        </button>

        {(() => {
          const path = pathname || "";
          const hotelSlug = path.split("/")[1];
          const isHotelMenu = hotelSlug && !["admin", "super-admin", "login", "profile", "menu"].includes(hotelSlug);
          const resolvedMenuSlug = isHotelMenu ? hotelSlug : (customer?.hotelSlug || "hotbyte");
          const menuHref = `/${resolvedMenuSlug}/menu`;

          return (
          <Link
            key="menu-link"
            href={menuHref}
            className={`nav-link px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
              pathname === menuHref
                ? "text-[var(--orange)] bg-[var(--orange-light)]"
                : "text-gray-600 hover:text-[var(--orange)] hover:bg-orange-50"
            }`}
          >
            <Utensils size={16} />
            <span>Menu</span>
          </Link>
        );
      })()}

        {loading ? (
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
        ) : customer ? (
          <>
            <Link
              href="/profile"
              className={`nav-link px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                pathname === "/profile"
                  ? "text-[var(--orange)] bg-[var(--orange-light)]"
                  : "text-gray-600 hover:text-[var(--orange)] hover:bg-orange-50"
              }`}
            >
              <User size={16} />
              <span className="hidden sm:inline">{customer.name}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="nav-link px-3 py-2 text-sm font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </>
        ) : (
          <>
            {(() => {
              const path = pathname || "";
              const hotelSlug = path.split("/")[1];
              const isHotelMenu = hotelSlug && !["admin", "super-admin", "login", "profile", "menu"].includes(hotelSlug);
              const loginHref = isHotelMenu ? `/login?hotel=${hotelSlug}` : "/login";
              return (
                <Link
                  href={loginHref}
                  className={`nav-link px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    pathname === "/login"
                      ? "text-[var(--orange)] bg-[var(--orange-light)]"
                      : "text-gray-600 hover:text-[var(--orange)] hover:bg-orange-50"
                  }`}
                >
                  <User size={16} />
                  <span>Login</span>
                </Link>
              );
            })()}
            {(() => {
              const path = pathname || "";
              const firstSegment = path.split("/")[1];
              const isAdminRoute = firstSegment && !["admin", "super-admin", "login", "profile"].includes(firstSegment);
              const adminHref = isAdminRoute ? `/admin/login?hotel=${firstSegment}` : "/admin/login";
              return (
                <Link
                  href={adminHref}
                  className="nav-link px-4 py-2 text-white text-sm font-bold rounded-xl flex items-center gap-1.5 btn-orange"
                >
                  <ShieldAlert size={14} className="opacity-95" />
                  <span>Admin</span>
                </Link>
              );
            })()}
          </>
        )}
      </div>
    </nav>
  );
}
