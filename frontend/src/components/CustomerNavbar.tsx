"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LanguageSelector from "./LanguageSelector";
import ThemeToggle from "./ThemeToggle";
import { ShoppingCart, Menu, X, LogOut, User, Utensils, ShieldAlert } from "lucide-react";
import Swal from "sweetalert2";
import { useTranslation } from 'react-i18next';
import '../i18n';

interface Customer {
  id: number;
  name: string;
  phone: string;
  hotelSlug?: string;
  avatarUrl?: string;
}

export default function CustomerNavbar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [cartCount, setCartCount] = useState(0);
  const [tableName, setTableName] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Session check
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

    // Get Table Name
    const storedTable = localStorage.getItem("hotbyte_table_name");
    setTableName(storedTable);

    // Init theme
    const savedTheme = localStorage.getItem("hotbyte_theme");
    if (savedTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }

    // Initialize & Sync Cart
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

  const toggleTheme = async (forcedTheme?: string) => {
    const newTheme = forcedTheme === "dark" || forcedTheme === "light"
      ? forcedTheme
      : (theme === "light" ? "dark" : "light");

    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
    localStorage.setItem("hotbyte_theme", newTheme);
    if (customer) {
      fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      }).catch(() => {});
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
      title: t('logout.title'),
      text: t('logout.message'),
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#FF5A1F",
      cancelButtonColor: "#3085d6",
      confirmButtonText: t('logout.confirm'),
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch("/api/auth/logout", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          setCustomer(null);
          router.push("/");
        }
      } catch (err) {
        Swal.fire(t('common.error'), t('logout.error'), "error");
      }
    }
  };

  const path = pathname || "";
  const firstSegment = path.split("/")[1];
  const isHotelSlug = firstSegment && !["admin", "super-admin", "login", "profile", ""].includes(firstSegment);
  const activeSlug = isHotelSlug ? firstSegment : (customer?.hotelSlug || "");
  const menuHref = activeSlug ? `/${activeSlug}/menu` : "/";

  const isHotelMenu = firstSegment && !["admin", "super-admin", "login", "profile", "menu"].includes(firstSegment);
  const loginHref = isHotelMenu ? `/login?hotel=${firstSegment}` : "/login";

  const isAdminRoute = firstSegment && !["admin", "super-admin", "login", "profile"].includes(firstSegment);
  const adminHref = isAdminRoute ? `/admin/login?hotel=${firstSegment}` : "/admin/login";

  return (
    <nav className="sticky top-0 z-50 glass-nav h-14 md:h-14 w-full select-none">
      <div className="container mx-auto px-4 flex items-center justify-between h-full">
        {/* Branding (Left) */}
        <Link href="/" className="flex items-center gap-2 group" aria-label="Home">
          <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500 group-hover:opacity-90 transition-opacity flex items-center gap-1.5 leading-none">
            <span className="text-lg">🔥</span>HotByte
          </span>
        </Link>
        
        {/* Mobile controls & toggle buttons (Visible only on mobile) */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle currentTheme={theme} onToggle={toggleTheme} />
          
          <button 
            onClick={handleCartClick} 
            className="nav-action-btn icon-only relative"
            aria-label="View Cart"
          >
            <ShoppingCart size={15} />
            {cartCount > 0 && (
              <span className="nav-cart-badge ring-2 ring-white dark:ring-slate-950">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="nav-action-btn icon-only"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Desktop controls & navigation links (Visible only on desktop/tablet) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Controls Cluster */}
          <div className="flex items-center gap-1.5">
            <Link
              href={menuHref}
              className={`nav-action-btn ${pathname === menuHref ? "active" : ""}`}
              title={t('nav.menu')}
            >
              <Utensils size={14} />
              <span>{t('nav.menu')}</span>
            </Link>

            <button 
              onClick={handleCartClick} 
              className="nav-action-btn icon-only relative"
              title="View Cart"
            >
              <ShoppingCart size={15} />
              {cartCount > 0 && (
                <span className="nav-cart-badge ring-2 ring-white dark:ring-slate-950">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            <ThemeToggle currentTheme={theme} onToggle={toggleTheme} />
            
            <LanguageSelector />
          </div>

          {/* Separator between Controls and Auth */}
          <div className="nav-separator" />

          {/* Auth/Profile Section */}
          <div className="flex items-center gap-1.5">
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin ml-2"></div>
            ) : customer ? (
              <>
                <Link
                  href="/profile"
                  className={`nav-action-btn ${pathname === "/profile" ? "active" : ""}`}
                >
                  {customer.avatarUrl ? (
                    <img
                      src={customer.avatarUrl}
                      alt={customer.name}
                      className="w-5 h-5 rounded-full object-cover ring-2 ring-orange-500/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center ring-2 ring-orange-500/20">
                      <span className="text-[9px] font-black text-white">{customer.name?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="max-w-[100px] truncate">{customer.name}</span>
                </Link>
                
                <button
                  onClick={handleLogout}
                  className="nav-action-btn icon-only text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                  title="Logout"
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <>
                <Link
                  href={loginHref}
                  className={`nav-action-btn ${pathname === "/login" ? "active" : ""}`}
                >
                  <User size={14} />
                  <span>{t('nav.login')}</span>
                </Link>
                
                {!isHotelSlug && (
                  <Link
                    href={adminHref}
                    className="nav-cta-btn ml-1"
                  >
                    <ShieldAlert size={14} className="opacity-95" />
                    <span>{t('nav.admin')}</span>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Slide-down mobile panel (only visible on mobile screens) */}
      {isMobileMenuOpen && (
        <div className="nav-mobile-panel md:hidden">
          {/* Language Selector row */}
          <div className="flex items-center justify-between px-3.5 py-2 hover:bg-gray-50 dark:hover:bg-slate-800/40 rounded-lg">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('nav.language')}</span>
            <LanguageSelector />
          </div>
          
          <div className="h-px bg-gray-150 dark:bg-slate-800/50 my-1" />

          {/* Menu Link */}
          <Link
            href={menuHref}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`nav-action-btn ${pathname === menuHref ? "active" : ""}`}
          >
            <Utensils size={14} />
            <span>{t('nav.menu')}</span>
          </Link>

          {loading ? (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
            </div>
          ) : customer ? (
            <>
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`nav-action-btn ${pathname === "/profile" ? "active" : ""}`}
              >
                {customer.avatarUrl ? (
                  <img
                    src={customer.avatarUrl}
                    alt={customer.name}
                    className="w-5 h-5 rounded-full object-cover ring-2 ring-orange-500/20"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center ring-2 ring-orange-500/20">
                    <span className="text-[9px] font-black text-white">{customer.name?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <span>{customer.name}</span>
              </Link>
              
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="nav-action-btn text-gray-500 hover:text-red-600 dark:hover:text-red-400"
              >
                <LogOut size={15} />
                <span>{t('nav.logout')}</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href={loginHref}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`nav-action-btn ${pathname === "/login" ? "active" : ""}`}
              >
                <User size={14} />
                <span>{t('nav.login')}</span>
              </Link>
              
              {!isHotelSlug && (
                <Link
                  href={adminHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="nav-cta-btn mt-1 text-center justify-center w-full"
                >
                  <ShieldAlert size={14} className="opacity-95" />
                  <span>{t('nav.adminPortal')}</span>
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </nav>
  );
}
