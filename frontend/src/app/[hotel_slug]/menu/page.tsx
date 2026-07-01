"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import CustomerNavbar from "@/components/CustomerNavbar";
import { useTranslation } from "react-i18next";
import SubscriptionExpiredCard from "@/components/SubscriptionExpiredCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useNotification } from "@/context/NotificationContext";
import "@/i18n";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Sparkles,
  Utensils,
  Leaf,
  X,
  ArrowRight,
} from "lucide-react";
import Swal from "sweetalert2";
import confetti from "canvas-confetti";
import SearchBar from "@/components/SearchBar";
import MenuItemCard from "@/components/MenuItemCard";
import { useCart, type CartItem } from "./useCart";

interface MenuItem {
  item_id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category_name: string;
  is_available: boolean;
  is_veg: boolean;
  avg_rating?: string;
  reviews_count?: string;
  variants?: { id: number; variant_name: string; price: number }[];
}

// Fallback for broken images
const FOOD_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%23FF5A1F' stroke-width='1.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M8 14s1.5 2 4 2 4-2 4-2'/%3E%3Cline x1='9' y1='9' x2='9.01' y2='9'/%3E%3Cline x1='15' y1='9' x2='15.01' y2='9'/%3E%3C/svg%3E";
const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.src = FOOD_FALLBACK;
  e.currentTarget.style.objectFit = "contain";
  e.currentTarget.style.padding = "12px";
  e.currentTarget.style.background = "#1a1a1a";
};

export default function MenuPage({ params }: { params: Promise<{ hotel_slug: string }> }) {
  const router = useRouter();
  const { t } = useTranslation();
  const notify = useNotification();
  const { hotel_slug } = use(params);
  const hotelSlug = hotel_slug || "hotbyte";

  const [categories, setCategories] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenData, setFrozenData] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [hotelName, setHotelName] = useState("HotByte");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  
  // Custom Branding States
  const [tagline, setTagline] = useState("Served with Love ❤️");
  const [showLogo, setShowLogo] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#FF5A1F");
  const [secondaryColor, setSecondaryColor] = useState("#FF5A1F");
  const [enableOnlineOrders, setEnableOnlineOrders] = useState(true);
  const [enableQrOrdering, setEnableQrOrdering] = useState(true);

  // Hotel geofence data
  const [hotelLatitude, setHotelLatitude] = useState<number | null>(null);
  const [hotelLongitude, setHotelLongitude] = useState<number | null>(null);
  const [orderRadius, setOrderRadius] = useState(30);
  const [hotelType, setHotelType] = useState<"veg" | "nonveg" | "both">("both");
  const [requireCustomerAuth, setRequireCustomerAuth] = useState(false);
  const [suspiciousActivityMode, setSuspiciousActivityMode] = useState(false);

  // Birthday Confetti and Inline DOB States
  const [confettiTriggered, setConfettiTriggered] = useState(false);
  const [dobInput, setDobInput] = useState("");
  const [updatingDob, setUpdatingDob] = useState(false);

  // Cart hook with stable callbacks
  const {
    cart,
    cartTotal,
    cartCount,
    restoreCart,
    handleAddToCart,
    handleDecreaseQuantity,
    handleRemoveFromCart,
    handleClearCart,
  } = useCart(hotelSlug, isOpen);
  const isBirthdayToday = (() => {
    if (!customer || !customer.dob) return false;
    const dob = new Date(customer.dob);
    const today = new Date();
    return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
  })();

  const greeting = (() => {
    const defaultGreeting = {
      text: t('greetings.welcome', 'Welcome'),
      sub: t('greetings.welcomeSub', 'We hope you are having an exceptional dining experience!'),
      icon: "✨",
      bg: "bg-white/80 dark:bg-zinc-900/65 border-gray-100/40 dark:border-zinc-800/40 text-gray-900 dark:text-gray-100"
    };
    if (!customer) return defaultGreeting;
    
    if (isBirthdayToday) {
      return {
        text: t('greetings.birthday', '🎉 Happy Birthday, {{name}}! 🎂').replace('{{name}}', customer.name || t('common.customer', 'Customer')),
        sub: t('greetings.birthdaySub', 'Wishing you a fantastic day and delicious meals ahead! Enjoy your special birthday dining.'),
        icon: "🎈",
        bg: "bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 border-pink-500/35 text-gray-900 dark:text-gray-100 dark:shadow-[0_0_20px_rgba(236,72,153,0.15)] animate-pulse"
      };
    }

    const hour = new Date().getHours();
    let text = "";
    let sub = t('greetings.welcomeSub', 'We hope you are having an exceptional dining experience!');
    let icon = "✨";

    if (hour >= 5 && hour < 12) {
      text = t('greetings.morning', 'Good Morning, {{name}} ☀️').replace('{{name}}', customer.name || t('common.customer', 'Customer'));
      sub = t('greetings.morningSub', 'Start your day with a delightful and fresh breakfast spread!');
      icon = "🌅";
    } else if (hour >= 12 && hour < 17) {
      text = t('greetings.afternoon', 'Good Afternoon, {{name}} 🌤️').replace('{{name}}', customer.name || t('common.customer', 'Customer'));
      sub = t('greetings.afternoonSub', 'Treat yourself to our exquisite lunch specials and refreshing coolers!');
      icon = "🥗";
    } else if (hour >= 17 && hour < 21) {
      text = t('greetings.evening', 'Good Evening, {{name}} 🌇').replace('{{name}}', customer.name || t('common.customer', 'Customer'));
      sub = t('greetings.eveningSub', 'Unwind with our premium curated dinner items and chef specials!');
      icon = "🍛";
    } else {
      text = t('greetings.night', 'Good Night, {{name}} 🌙').replace('{{name}}', customer.name || t('common.customer', 'Customer'));
      sub = t('greetings.nightSub', 'Craving a late night bite or dessert? We\'ve got your sweet tooth covered!');
      icon = "🍰";
    }

    return {
      text,
      sub,
      icon,
      bg: "bg-white/80 dark:bg-zinc-900/65 border-gray-100/40 dark:border-zinc-800/40 text-gray-900 dark:text-gray-100"
    };
  })();

  useEffect(() => {
    if (isBirthdayToday && !confettiTriggered) {
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        setConfettiTriggered(true);
      } catch (err) {}
    }
  }, [isBirthdayToday, confettiTriggered]);

  const getCsrfToken = () => {
    if (typeof document === "undefined") return "";
    const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
  };

  const handleInlineDobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dobInput) return;

    setUpdatingDob(true);
    try {
      const res = await fetch("/api/profile/dob", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken()
        },
        body: JSON.stringify({ dob: dobInput }),
      });
      const data = await res.json();

      if (data.success) {
        setCustomer((prev: any) => ({
          ...prev,
          dob: dobInput,
          hasDob: true
        }));
        
        notify.success("Profile Updated!", "Date of Birth saved successfully! Celebrate your birthday with special rewards.");
      } else {
        notify.error("Validation Error", data.message || "Invalid Date.");
      }
    } catch (err) {
      notify.error("Error", "Failed to update Date of Birth");
    } finally {
      setUpdatingDob(false);
    }
  };


  useEffect(() => {
    if (primaryColor) {
      document.documentElement.style.setProperty("--orange", primaryColor);
      document.documentElement.style.setProperty("--orange-light", `${primaryColor}15`);
    }
  }, [primaryColor]);
  
  const [locationOrderingEnabled, setLocationOrderingEnabled] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("T-1");
  const [tableCount, setTableCount] = useState<number>(5);
  const [qrTableLocked, setQrTableLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [lastOrderQr, setLastOrderQr] = useState<string | null>(null);
  const [lastOrderQrUpi, setLastOrderQrUpi] = useState<string | null>(null);
  const [lastOrderMerchant, setLastOrderMerchant] = useState<string | null>(null);
  const [lastOrderPlaced, setLastOrderPlaced] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const saveQrImage = useCallback((url: string) => {
    fetch(url).then(r => r.blob()).then(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "payment-qr.png";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }, []);

  // ─── QR Table Detection ────────────────────────────────────────────────
  useEffect(() => {
    // Check for new format: sessionStorage set by /menu/[hotelId]/table/[tableNo] redirect
    const qrDataRaw = sessionStorage.getItem("hotbyte_qr_table");
    if (qrDataRaw) {
      try {
        const qrData = JSON.parse(qrDataRaw);
        if (qrData.hotel_slug === hotelSlug && qrData.table_number) {
          setTableNumber(qrData.table_number);
          setQrTableLocked(true);
          sessionStorage.removeItem("hotbyte_qr_table");
          return;
        }
      } catch {}
      sessionStorage.removeItem("hotbyte_qr_table");
    }

    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get("table");
    if (tableParam) {
      setTableNumber(tableParam);
      setQrTableLocked(true);
      return;
    }

    // Legacy: check for QR slug
    const qrSlug = params.get("qr_slug");
    if (!qrSlug) return;

    const stored = sessionStorage.getItem(`hotbyte_table_${hotelSlug}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.qr_slug === qrSlug) {
          setTableNumber(parsed.table_number);
          setQrTableLocked(true);
          return;
        }
      } catch {}
    }

    fetch(`/api/tables/validate/${qrSlug}?hotel_slug=${hotelSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const tn = data.table.table_number;
          setTableNumber(tn);
          setQrTableLocked(true);
          sessionStorage.setItem(`hotbyte_table_${hotelSlug}`, JSON.stringify({ qr_slug: qrSlug, table_number: tn }));
        } else {
          const directTn = qrSlug.replace(/^0+/, "") || qrSlug;
          setTableNumber(directTn);
          setQrTableLocked(true);
        }
      })
      .catch(() => {
        const directTn = qrSlug.replace(/^0+/, "") || qrSlug;
        setTableNumber(directTn);
        setQrTableLocked(true);
      });
  }, [hotelSlug]);

  useEffect(() => {
    // Fetch CSRF token to set cookie
    fetch(`/api/auth/csrf-token`).catch((e) => console.error('CSRF token fetch failed:', e));

    // Parallel fetch: session, categories, items
    const loadData = async () => {
      try {
        const [sessionRes, categoriesRes, itemsRes] = await Promise.all([
          fetch(`/api/auth/session-check?hotel_slug=${hotelSlug}`),
          fetch(`/api/menu/categories?hotel_slug=${hotelSlug}`),
          fetch(`/api/menu/items?hotel_slug=${hotelSlug}`),
        ]);

        // Session
        try {
          const sessionData = await sessionRes.json();
          if (sessionData.authenticated) {
            setCustomer(sessionData.customer);
          }
        } catch (e) { console.error('Session parse failed:', e); }

        // Categories
        try {
          const data = await categoriesRes.json();
          if (data.isFrozen) {
            setIsFrozen(true);
            setFrozenData(data);
          } else if (data.success) {
            setCategories(["All", ...data.categories.map((c: any) => c.category_name || c.name || "")]);
            setIsOpen(data.isOpen !== false);
            if (data.hotelName) setHotelName(data.hotelName);
            if (data.logoUrl) setLogoUrl(data.logoUrl);
            if (data.bannerUrl) setBannerUrl(data.bannerUrl);
            if (data.tagline) setTagline(data.tagline);
            setShowLogo(data.showLogo !== false);
            setShowBanner(data.showBanner !== false);
            if (data.primaryColor) setPrimaryColor(data.primaryColor);
            if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
            setEnableOnlineOrders(data.enableOnlineOrders !== false);
            setEnableQrOrdering(data.enableQrOrdering !== false);
            if (data.tableCount) setTableCount(data.tableCount);
            if (data.hotelLatitude !== null && data.hotelLatitude !== undefined) setHotelLatitude(data.hotelLatitude);
            if (data.hotelLongitude !== null && data.hotelLongitude !== undefined) setHotelLongitude(data.hotelLongitude);
            if (data.orderRadius) setOrderRadius(data.orderRadius);
            if (data.locationOrderingEnabled !== undefined) setLocationOrderingEnabled(data.locationOrderingEnabled);
            if (data.hotelType) setHotelType(data.hotelType);
            if (data.hotelType === "veg") setIsVegOnly(true);
            setRequireCustomerAuth(data.requireCustomerAuth || false);
            setSuspiciousActivityMode(data.suspiciousActivityMode || false);
          }
        } catch (e) { console.error('Categories parse failed:', e); }

        // Items
        try {
          const itemsData = await itemsRes.json();
          if (itemsData.isFrozen) {
            setIsFrozen(true);
            setFrozenData(itemsData);
          } else if (itemsData.success) {
            const mappedItems = itemsData.items.map((item: any) => ({
              ...item,
              name: item.item_name || item.name || "",
            }));
            setMenuItems(mappedItems);
          }
          } catch (e) { console.error('Items parse failed:', e); }
      } catch (e) { console.error('Menu data load failed:', e); }
      setLoading(false);
    };
    loadData();

    restoreCart();

    // 5. Dynamic Cart Opening & Event Observers
    const handleOpenMenuCart = () => {
      setIsCartOpen(true);
    };
    window.addEventListener("openMenuCart", handleOpenMenuCart);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("openCart") === "true") {
      setIsCartOpen(true);
      // Clean up the URL search params so it doesn't reopen on subsequent reloads
      router.replace(`/${hotelSlug}/menu`);
    }

    // 5-second interval poll for real-time status propagation (pauses when page is hidden)
    const intervalId = setInterval(() => {
      if (document.hidden) return;
      fetch(`/api/menu/status?hotel_slug=${hotelSlug}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setIsOpen(data.isOpen !== false);
            if (data.hotelName) setHotelName(data.hotelName);
            if (data.logoUrl) setLogoUrl(data.logoUrl);
            if (data.bannerUrl) setBannerUrl(data.bannerUrl);
            if (data.tagline) setTagline(data.tagline);
            setShowLogo(data.showLogo !== false);
            setShowBanner(data.showBanner !== false);
            if (data.primaryColor) setPrimaryColor(data.primaryColor);
            if (data.secondaryColor) setSecondaryColor(data.secondaryColor);
            setEnableOnlineOrders(data.enableOnlineOrders !== false);
            setEnableQrOrdering(data.enableQrOrdering !== false);
            if (data.isFrozen) {
              setIsFrozen(true);
              setFrozenData(data);
            }
          }
        })
        .catch((e) => console.error('Status poll failed:', e));
    }, 5000);

    // Back-to-top scroll listener
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("openMenuCart", handleOpenMenuCart);
      window.removeEventListener("scroll", handleScroll);
      clearInterval(intervalId);
    };
  }, [router, hotelSlug]);

  // ─── Cart handlers now live in useCart() hook ───────────────────────

  // Dynamic filter
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" || item.category_name === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVeg = !isVegOnly || item.is_veg;
    return matchesCategory && matchesSearch && matchesVeg;
  });

  // Haversine distance (returns meters)
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleCheckout = async () => {
    let currentCustomer = customer;
    
    if (isPlacingOrder) return;
    setIsPlacingOrder(true);
    
    if (!isOpen) {
      notify.warning("Hotel Closed", "This hotel is currently closed and not accepting new orders.");
      setIsPlacingOrder(false);
      return;
    }
    if (cart.length === 0) {
      notify.toast("info", "Cart Empty", "Please add items to your cart before checking out.");
      setIsPlacingOrder(false);
      return;
    }

    if (!customer) {
      if (requireCustomerAuth) {
        const loginResult = await notify.confirm(
          t('login.loginRequiredTitle', "🔐 Login Required"),
          t('login.loginRequiredDesc', 'This hotel requires you to sign in before placing an order. Please login with Google to continue.'),
          t('login.loginRequiredBtn', "Login with Google"),
          t('common.cancel', "Cancel")
        );
        if (loginResult.isConfirmed) {
          router.push(`/login?hotel=${hotelSlug}`);
        } else {
          setIsPlacingOrder(false);
        }
        return;
      } else {
        const guestName = await notify.prompt(
          t('login.guestNameTitle', "👋 What's your name?"),
          t('login.guestNameDesc', 'Enter your name to place the order as a guest'),
          ""
        );
        if (!guestName || guestName.trim().length < 2) {
          setIsPlacingOrder(false);
          return;
        }

        try {
          const gcRes = await fetch("/api/auth/guest-checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
            body: JSON.stringify({ name: guestName.trim(), hotel_slug: hotelSlug })
          });
          const gcData = await gcRes.json();
          if (!gcData.success) {
            if (gcData.requireAuth) {
              notify.info(t('login.loginRequiredTitle', "Login Required"), t('login.signInRequiredMsg', "This hotel requires Google authentication."));
              router.push(`/login?hotel=${hotelSlug}`);
            } else {
              notify.error(t('common.error', "Error"), gcData.message || t('login.guestCheckinFailed', "Guest checkin failed."));
              setIsPlacingOrder(false);
            }
            return;
          }
          setCustomer(gcData.customer);
          currentCustomer = gcData.customer;
        } catch {
          notify.error(t('login.networkError', "Network Error"), t('errors.networkError', "Unable to complete guest checkin."));
          setIsPlacingOrder(false);
          return;
        }
      }
    }

    // ── Frontend GPS proximity check ──────────────────────────────
    let customerLat: number | null = null;
    let customerLng: number | null = null;

    if (locationOrderingEnabled && hotelLatitude !== null && hotelLongitude !== null) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        customerLat = position.coords.latitude;
        customerLng = position.coords.longitude;
        const dist = haversineDistance(customerLat, customerLng, hotelLatitude, hotelLongitude);
        if (dist > orderRadius) {
          await notify.alert(
            t('checkout.gpsProximityTitle', "Too Far Away 📍"),
            t('checkout.gpsProximityDesc', 'You must be within {{radius}} meters of the hotel to place an order. Your current distance: {{distance}}m away')
              .replace('{{radius}}', String(orderRadius))
              .replace('{{distance}}', String(Math.round(dist))),
            "error"
          );
          setIsPlacingOrder(false);
          return;
        }
      } catch (err: any) {
        await notify.alert(
          t('checkout.gpsRequiredTitle', "Location Required 📍"),
          err?.code === 1
            ? t('checkout.gpsBlockedDesc', "Location access is blocked. Please enable GPS in your browser settings and try again.")
            : t('checkout.gpsRequiredDesc', "Could not get your GPS location. Please ensure location services are enabled."),
          "warning"
        );
        setIsPlacingOrder(false);
        return;
      }
    }

      // ═══ Customer Name Collection (only once per session) ═══
      let finalName = customerName || currentCustomer?.name || "";
      if (!finalName) {
        const nameResult = await Swal.fire({
          title: "Your Name",
          input: "text",
          inputValue: "",
          inputPlaceholder: "Enter your name",
          showCancelButton: true,
          confirmButtonText: "Continue",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#FF5A1F",
          cancelButtonColor: "#374151",
          background: "#0d0f14",
          color: "#fff",
          inputValidator: (value) => {
            if (!value || value.trim().length < 2) {
              return "Please enter your name";
            }
            return null;
          },
          customClass: {
            popup: "rounded-2xl border border-gray-800/80 shadow-2xl backdrop-blur-xl bg-gray-950/95 p-6",
            title: "text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500 tracking-wide pb-1"
          },
        });

        if (!nameResult.isConfirmed) {
          setIsPlacingOrder(false);
          return;
        }
        finalName = nameResult.value.trim();
        setCustomerName(finalName);
      }

      // ═══ Payment method selection popup ═══
      const paymentChoice = await Swal.fire({
        title: "Select Payment Method",
        html: `
          <div style="padding:4px 0;">
            <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0 0 14px;font-weight:500;">Choose how you'd like to pay</p>
            <button onclick="window.chooseCash()" style="width:100%;cursor:pointer;background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.03));border:1.5px solid rgba(16,185,129,0.25);border-radius:16px;padding:16px;display:flex;align-items:center;gap:14px;transition:all 0.25s;margin-bottom:10px;text-align:left;" onmouseenter="this.style.borderColor='rgba(16,185,129,0.6)';this.style.background='linear-gradient(135deg,rgba(16,185,129,0.14),rgba(16,185,129,0.06))'" onmouseleave="this.style.borderColor='rgba(16,185,129,0.25)';this.style.background='linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.03))'">
              <div style="width:44px;height:44px;border-radius:13px;background:rgba(16,185,129,0.12);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">💵</div>
              <div style="flex:1;">
                <div style="font-size:14px;font-weight:800;color:#e5e7eb;letter-spacing:-0.01em;">Pay After Meal</div>
                <div style="font-size:11px;font-weight:500;color:#6b7280;margin-top:2px;">Cash on table — settle at the end</div>
              </div>
              <span style="font-size:11px;font-weight:700;color:#34d399;background:rgba(16,185,129,0.1);padding:3px 9px;border-radius:20px;flex-shrink:0;">SELECT</span>
            </button>
            <button onclick="window.chooseOnline()" style="width:100%;cursor:pointer;background:linear-gradient(135deg,rgba(255,90,31,0.1),rgba(255,90,31,0.04));border:1.5px solid rgba(255,90,31,0.3);border-radius:16px;padding:16px;display:flex;align-items:center;gap:14px;transition:all 0.25s;text-align:left;" onmouseenter="this.style.borderColor='#FF5A1F';this.style.background='linear-gradient(135deg,rgba(255,90,31,0.18),rgba(255,90,31,0.08))'" onmouseleave="this.style.borderColor='rgba(255,90,31,0.3)';this.style.background='linear-gradient(135deg,rgba(255,90,31,0.1),rgba(255,90,31,0.04))'">
              <div style="width:44px;height:44px;border-radius:13px;background:rgba(255,90,31,0.12);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">⚡</div>
              <div style="flex:1;">
                <div style="font-size:14px;font-weight:800;color:#e5e7eb;letter-spacing:-0.01em;">Pay Online</div>
                <div style="font-size:11px;font-weight:500;color:#6b7280;margin-top:2px;">Scan QR & pay via GPay / PhonePe / Paytm</div>
              </div>
              <span style="font-size:11px;font-weight:700;color:#FF5A1F;background:rgba(255,90,31,0.12);padding:3px 9px;border-radius:20px;flex-shrink:0;">SELECT</span>
            </button>
          </div>
        `,
        showCancelButton: true,
        cancelButtonText: "Cancel",
        cancelButtonColor: "#374151",
        confirmButtonText: " ",
        confirmButtonColor: "transparent",
        background: "#0d0f14",
        color: "#fff",
        customClass: { popup: "rounded-2xl border border-gray-800/80 shadow-2xl backdrop-blur-xl bg-gray-950/95 p-6", title: "text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500 tracking-wide pb-1" },
        didOpen: () => {
          (window as any).chooseCash = () => Swal.clickConfirm();
          (window as any).chooseOnline = () => Swal.clickDeny();
        }
      });

      if (paymentChoice.isDenied) {
        // ═══ Online Payment — go directly to QR payment ═══
        notify.loading(
          t('checkout.initializingPayment', "Creating Order"),
          t('checkout.connectingGateway', "Preparing QR payment...")
        );

        try {
          const res = await fetch("/api/orders/create-qr-order", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-csrf-token": getCsrfToken()
            },
            body: JSON.stringify({
              table_number: tableNumber,
              hotel_slug: hotelSlug,
              customer_name: finalName,
              customerLat,
              customerLng,
              items: cart.map((i) => ({
                item_id: i.item_id,
                price: i.price,
                quantity: i.quantity,
                selectedVariant: i.selectedVariant,
              })),
            }),
          });
          const data = await res.json();

          if (!data.success) {
            notify.error("Checkout Error", data.message || "Failed to create order.");
            setIsPlacingOrder(false);
            return;
          }

          const { order, qrInfo, payment_reference, upi_deep_link } = data;
          const orderDisplayId = order?.order_display_id || `HB${order?.order_id}`;
          notify.close();

          const upiLink = upi_deep_link || (() => {
            const id = qrInfo?.upiId;
            if (!id) return "";
            const amt = typeof cartTotal === 'number' ? cartTotal.toFixed(2) : cartTotal;
            return `upi://pay?pa=${encodeURIComponent(id)}&pn=${encodeURIComponent(qrInfo?.merchantName || '')}&am=${amt}&cu=INR&tn=${encodeURIComponent(payment_reference || `Order${order?.order_id || ''}`)}`;
          })();

          const fullHtml = `
            <div style="display:flex;flex-direction:column;gap:0;">
              <!-- Header: Order ID + Amount -->
              <div style="display:flex;justify-content:space-between;align-items:center;padding:0 0 12px;border-bottom:1px solid rgba(75,85,99,0.2);margin-bottom:12px;">
                <div>
                  <span style="font-size:11px;color:#9ca3af;font-weight:600;display:block;">Order</span>
                  <span style="font-size:15px;font-weight:900;color:#fbbf24;">${orderDisplayId}</span>
                </div>
                <div style="text-align:right;">
                  <span style="font-size:11px;color:#9ca3af;font-weight:600;display:block;">Total</span>
                  <span style="font-size:18px;font-weight:900;color:#34d399;">₹${cartTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <!-- QR Code -->
              ${qrInfo.qrUrl ? `
              <div style="display:flex;justify-content:center;margin-bottom:14px;">
                <div style="background:#fff;border-radius:14px;padding:6px;box-shadow:0 4px 24px rgba(0,0,0,0.25);">
                  <img src="${qrInfo.qrUrl}" alt="QR" style="width:150px;height:150px;border-radius:10px;display:block;" />
                </div>
              </div>` : ""}

              <!-- Merchant + Table + Customer row -->
              <div style="display:flex;gap:8px;margin-bottom:10px;">
                ${qrInfo.merchantName ? `<div style="flex:1;background:rgba(31,41,55,0.4);border-radius:10px;padding:8px 10px;text-align:center;">
                  <span style="font-size:9px;color:#9ca3af;font-weight:600;display:block;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2px;">Merchant</span>
                  <span style="font-size:11px;font-weight:800;color:#e5e7eb;">${qrInfo.merchantName}</span>
                </div>` : ""}
                <div style="flex:1;background:rgba(31,41,55,0.4);border-radius:10px;padding:8px 10px;text-align:center;">
                  <span style="font-size:9px;color:#9ca3af;font-weight:600;display:block;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2px;">Table</span>
                  <span style="font-size:11px;font-weight:800;color:#e5e7eb;">${tableNumber}</span>
                </div>
                <div style="flex:1;background:rgba(31,41,55,0.4);border-radius:10px;padding:8px 10px;text-align:center;">
                  <span style="font-size:9px;color:#9ca3af;font-weight:600;display:block;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2px;">Customer</span>
                  <span style="font-size:11px;font-weight:800;color:#e5e7eb;">${finalName}</span>
                </div>
              </div>

              <!-- Payment Reference -->
              ${payment_reference ? `
              <div style="background:rgba(255,90,31,0.07);border:1px solid rgba(255,90,31,0.2);border-radius:10px;padding:8px 12px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <span style="font-size:8px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;display:block;">Payment Ref</span>
                  <span id="payment-ref-text" style="font-size:11px;font-weight:800;color:#FF5A1F;font-family:monospace;letter-spacing:0.2px;">${payment_reference}</span>
                </div>
                <button onclick="navigator.clipboard.writeText('${payment_reference}').then(() => { const b = document.getElementById('copy-ref-btn'); if(b) { b.textContent = 'Copied!'; b.style.borderColor = '#10B981'; b.style.color = '#10B981'; setTimeout(() => { b.textContent = 'Copy'; b.style.borderColor = 'rgba(255,90,31,0.2)'; b.style.color = '#FF5A1F'; }, 2000); } })" id="copy-ref-btn" style="border:1px solid rgba(255,90,31,0.2);background:transparent;color:#FF5A1F;font-size:9px;font-weight:700;padding:4px 10px;border-radius:7px;cursor:pointer;white-space:nowrap;">Copy</button>
              </div>` : ""}

              <!-- UPI ID -->
              ${qrInfo?.upiId ? `
              <div style="background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.12);border-radius:10px;padding:8px 12px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:9px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;">UPI ID</span>
                <span style="font-size:11px;font-weight:700;color:#93c5fd;font-family:monospace;">${qrInfo.upiId}</span>
              </div>` : ""}

              <!-- Steps -->
              <div style="background:rgba(31,41,55,0.3);border-radius:10px;padding:10px 12px;margin-bottom:10px;">
                <span style="font-size:8px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;display:block;margin-bottom:6px;">How to Pay</span>
                <div style="display:flex;flex-direction:column;gap:3px;">
                  <div style="display:flex;align-items:center;gap:7px;font-size:10px;color:#9ca3af;">
                    <span style="width:15px;height:15px;border-radius:50%;background:rgba(255,90,31,0.15);color:#FF5A1F;font-size:7px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</span>
                    <span>Open UPI app or scan QR</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:7px;font-size:10px;color:#9ca3af;">
                    <span style="width:15px;height:15px;border-radius:50%;background:rgba(255,90,31,0.15);color:#FF5A1F;font-size:7px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</span>
                    <span>Pay <strong style="color:#fbbf24;">₹${cartTotal.toLocaleString('en-IN')}</strong> & verify reference</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:7px;font-size:10px;color:#9ca3af;">
                    <span style="width:15px;height:15px;border-radius:50%;background:rgba(16,185,129,0.15);color:#10B981;font-size:7px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;">3</span>
                    <span>Come back & tap <strong style="color:#10B981;">"I Have Paid"</strong></span>
                  </div>
                </div>
              </div>

              <!-- Buttons -->
              <div style="display:flex;gap:8px;">
                ${qrInfo?.upiId ? `<button onclick="window.payNowAction()" style="flex:1;padding:11px 8px;border-radius:12px;border:none;background:linear-gradient(135deg,#FF5A1F,#e04e1a);color:#fff;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;box-shadow:0 4px 14px rgba(255,90,31,0.25);">⚡ Pay Now</button>` : ""}
                <button onclick="window.switchToPayLaterAction()" style="flex:${qrInfo?.upiId ? "0.5" : "1"};padding:11px 8px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#9ca3af;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;">📋 Pay Later</button>
              </div>
              <p style="font-size:8px;color:#6b7280;margin-top:8px;font-weight:500;text-align:center;">Pay in UPI app, then come back to confirm</p>
            </div>
          `;

          const qrResult = await Swal.fire({
              title: "Scan & Pay",
              html: fullHtml,
            showCancelButton: true,
            confirmButtonText: "I Have Completed Payment",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#10B981",
            cancelButtonColor: "#374151",
            background: "#0d0f14",
            color: "#fff",
            customClass: {
              popup: "rounded-2xl border border-gray-800/80 shadow-2xl backdrop-blur-xl bg-gray-950/95 p-6",
              title: "text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-500 tracking-wide pb-1"
            },
            didOpen: () => {
              const qrContainer = document.querySelector<HTMLElement>(".swal2-html-container");
              if (qrContainer) {
                qrContainer.style.overflow = "auto";
              }
              (window as any).payNowAction = () => {
                const link = upi_deep_link || (() => {
                  const upiId = qrInfo?.upiId;
                  if (!upiId) return "";
                  const amt = typeof cartTotal === 'number' ? cartTotal.toFixed(2) : cartTotal;
                  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(qrInfo?.merchantName || '')}&am=${amt}&cu=INR&tn=${encodeURIComponent(payment_reference || `Order${order?.order_id || ''}`)}`;
                })();
                if (!link) return;
                const apps = [
                  { name: "Google Pay", icon: "G", color: "#4285F4", bg: "rgba(66,133,244,0.12)", border: "rgba(66,133,244,0.3)" },
                  { name: "PhonePe", icon: "P", color: "#5F259F", bg: "rgba(95,37,159,0.12)", border: "rgba(95,37,159,0.3)" },
                  { name: "Paytm", icon: "T", color: "#00BAF2", bg: "rgba(0,186,242,0.12)", border: "rgba(0,186,242,0.3)" },
                  { name: "BHIM", icon: "B", color: "#008C3E", bg: "rgba(0,140,62,0.12)", border: "rgba(0,140,62,0.3)" },
                  { name: "Amazon Pay", icon: "A", color: "#FF9900", bg: "rgba(255,153,0,0.12)", border: "rgba(255,153,0,0.3)" },
                  { name: "Other", icon: "⚡", color: "#6b7280", bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.3)" },
                ];
                const appButtons = apps.map((app, i) => `
                  <button onclick="window.openUpiApp(${i})" style="flex:1;min-width:80px;padding:12px 8px;border-radius:14px;border:1px solid ${app.border};background:${app.bg};color:#e5e7eb;font-size:11px;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;transition:all 0.2s;">
                    <span style="width:36px;height:36px;border-radius:10px;background:${app.color};color:#fff;font-size:14px;font-weight:900;display:flex;align-items:center;justify-content:center;">${app.icon}</span>
                    <span>${app.name}</span>
                  </button>
                `).join("");
                (window as any).openUpiApp = (index: number) => {
                  Swal.close();
                  try {
                    const a = document.createElement('a');
                    a.href = link;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.click();
                  } catch (e) {
                    window.open(link, '_blank');
                  }
                };
                Swal.fire({
                  title: "Pay with",
                  html: `<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:4px;">${appButtons}</div>`,
                  showCancelButton: true,
                  cancelButtonText: "Cancel",
                  confirmButtonText: " ",
                  confirmButtonColor: "transparent",
                  cancelButtonColor: "#374151",
                  background: "#0d0f14",
                  color: "#fff",
                  customClass: {
                    popup: "rounded-2xl border border-gray-800/80 shadow-2xl backdrop-blur-xl bg-gray-950/95 p-5",
                    title: "text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500 tracking-wide pb-1"
                  },
                });
              };
              (window as any).switchToPayLaterAction = async () => {
                Swal.close();
                notify.loading(t('checkout.processingOrder', "Processing Order"), t('checkout.sendingToKitchen', "Sending your order to the kitchen..."));
                try {
                  const res = await fetch("/api/orders/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
                    body: JSON.stringify({
                      table_number: tableNumber,
                      hotel_slug: hotelSlug,
                      customer_name: finalName,
                      customerLat,
                      customerLng,
                      items: cart.map((i) => ({ item_id: i.item_id, price: i.price, quantity: i.quantity, selectedVariant: i.selectedVariant })),
                    }),
                  });
                  const data = await res.json();
                  notify.close();
                  if (data.success) {
                    setLastOrderQr(data.qrInfo?.qrUrl || null);
                    setLastOrderQrUpi(data.qrInfo?.upiId || null);
                    setLastOrderMerchant(data.qrInfo?.merchantName || null);
                    setLastOrderPlaced(true);
                    handleClearCart();
                    setIsCartOpen(false);
                    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
                    notify.success(t('checkout.orderPlacedSuccess', "Order Placed!"), t('checkout.orderPlacedCashMsg', "Your order for table {{tableNumber}} has been received.").replace('{{tableNumber}}', tableNumber));
                    router.push("/profile");
                  } else {
                    notify.error(t('checkout.checkoutFailed', "Checkout Failed"), data.message || t('checkout.checkoutFailed', "Checkout failed."));
                    setIsPlacingOrder(false);
                  }
                } catch (err) {
                  notify.close();
                  notify.error(t('login.networkError', "Network Error"), t('errors.networkError', "Unable to send checkout request."));
                  setIsPlacingOrder(false);
                }
              };
            }
          });

          if (qrResult.isConfirmed) {
            notify.loading("Submitting Payment...", "Please wait while we update your order.");

            try {
              const submitRes = await fetch("/api/orders/qr-payment-submitted", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "x-csrf-token": getCsrfToken()
                },
                body: JSON.stringify({ order_id: order.order_id }),
              });
              const submitData = await submitRes.json();
              notify.close();

              if (submitData.success) {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
                handleClearCart();
                setIsCartOpen(false);
                notify.success("Payment Submitted!", "Your payment is being verified by the hotel. We'll notify you once confirmed.");
                router.push("/profile");
              } else {
                notify.close();
                notify.error("Submission Error", submitData.message || "Failed to submit payment.");
                setIsPlacingOrder(false);
              }
            } catch (err) {
              notify.close();
              notify.error("Network Error", "Could not submit payment confirmation.");
              setIsPlacingOrder(false);
            }
          } else {
            setIsPlacingOrder(false);
          }
        } catch (err) {
          notify.close();
          notify.error("QR Payment Error", (err as any).message || "Failed to initialize QR payment.");
          setIsPlacingOrder(false);
        }
    } else if (paymentChoice.isConfirmed) {
      // ═══ Cash on Table — Pay After Meal ═══
      notify.loading(
        t('checkout.processingOrder', "Processing Order"),
        t('checkout.sendingToKitchen', "Sending your order to the kitchen...")
      );

      try {
        const res = await fetch("/api/orders/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken()
          },
          body: JSON.stringify({
            table_number: tableNumber,
            hotel_slug: hotelSlug,
            customer_name: finalName,
            customerLat,
            customerLng,
            items: cart.map((i) => ({
              item_id: i.item_id,
              price: i.price,
              quantity: i.quantity,
              selectedVariant: i.selectedVariant,
            })),
          }),
        });
        const data = await res.json();

        if (data.success) {
          setLastOrderQr(data.qrInfo?.qrUrl || null);
          setLastOrderQrUpi(data.qrInfo?.upiId || null);
          setLastOrderMerchant(data.qrInfo?.merchantName || null);
          setLastOrderPlaced(true);
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          handleClearCart();
          setIsCartOpen(false);
          notify.close();
          notify.success(
            t('checkout.orderPlacedSuccess', "Order Placed!"),
            t('checkout.orderPlacedCashMsg', "Your order for table {{tableNumber}} has been received.").replace('{{tableNumber}}', tableNumber)
          );
          router.push("/profile");
        } else {
          notify.close();
          notify.error(t('checkout.checkoutFailed', "Checkout Failed"), data.message || t('checkout.checkoutFailed', "Checkout failed."));
          setIsPlacingOrder(false);
        }
      } catch (err) {
        notify.close();
        notify.error(t('login.networkError', "Network Error"), t('errors.networkError', "Unable to send checkout request."));
        setIsPlacingOrder(false);
      }
    } else {
      setIsPlacingOrder(false);
    }
  };

  if (isFrozen) {
    return <ErrorBoundary><SubscriptionExpiredCard
        plan={frozenData?.plan || "trial"}
        trialEndsAt={frozenData?.trialEndsAt || null}
        subscriptionExpiryDate={frozenData?.subscriptionExpiryDate || null}
        daysSinceExpiry={frozenData?.daysSinceExpiry !== undefined ? frozenData.daysSinceExpiry : 0}
        gracePeriodRemaining={frozenData?.gracePeriodRemaining !== undefined ? frozenData.gracePeriodRemaining : null}
        isAdmin={false}
        hotelSlug={hotelSlug}
      /></ErrorBoundary>
  }

  const getCategoryEmoji = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower === "all") return "✨";
    if (lower.includes("pizza")) return "🍕";
    if (lower.includes("burger")) return "🍔";
    if (lower.includes("sandwich")) return "🥪";
    if (lower.includes("noodle") || lower.includes("pasta") || lower.includes("chinese")) return "🍜";
    if (lower.includes("drink") || lower.includes("beverage") || lower.includes("cold")) return "🥤";
    if (lower.includes("dessert") || lower.includes("sweet") || lower.includes("cake") || lower.includes("ice")) return "🍰";
    if (lower.includes("salad") || lower.includes("veg")) return "🥗";
    if (lower.includes("biryani") || lower.includes("rice")) return "🍛";
    if (lower.includes("chicken") || lower.includes("meat") || lower.includes("non")) return "🍗";
    if (lower.includes("starter") || lower.includes("soup")) return "🍲";
    if (lower.includes("paneer") || lower.includes("curry") || lower.includes("main")) return "🍛";
    if (lower.includes("roti") || lower.includes("bread") || lower.includes("naan")) return "🫓";
    return "🍽️";
  };

  return <ErrorBoundary><div className="relative z-0 min-h-screen flex flex-col justify-between selection:bg-orange-100 selection:text-orange-700 bg-white dark:bg-[#0b0d11] transition-colors duration-300 pt-14">
      
      {/* ── Lightweight Premium Background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-white dark:bg-[#0b0d11]">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 30%, #FF5A1F 0%, transparent 50%), radial-gradient(circle at 80% 20%, #f59e0b 0%, transparent 50%)'
          }}
        />
      </div>

      <CustomerNavbar hotelName={hotelName} />

      {!isOpen && (
        <div className="w-full bg-gradient-to-r from-red-650 via-rose-600 to-red-700 text-white py-3 px-6 font-sans border-b border-red-800 shadow-md z-20">
          <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg animate-pulse">
                🏪
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider">{t('menu.hotelClosedTitle', 'Hotel is Currently Closed')}</span>
                <span className="text-[10px] font-semibold opacity-90 mt-0.5">{t('menu.hotelClosedDesc', 'We are not accepting new orders at the moment. You can still browse.')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {suspiciousActivityMode && (
        <div className="w-full bg-gradient-to-r from-amber-900/80 via-yellow-900/80 to-amber-900/80 border-b border-amber-700/50 py-2 px-6 z-20 backdrop-blur-sm">
          <div className="max-w-[1280px] mx-auto flex items-center justify-center gap-2">
            <span className="text-sm">🔐</span>
            <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest">{t('login.verificationActive', 'Google Login Required')}</span>
          </div>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="relative">
        <div className="relative w-full h-32 md:h-36 overflow-hidden rounded-b-[24px]">
          {showBanner ? (
            <div className="w-full h-full" style={{ backgroundColor: primaryColor + '22' }}>
              <img
                src={bannerUrl || undefined}
                alt={hotelName ?? ''}
                loading="eager"
                className="w-full h-full object-cover transition-transform duration-700"
                style={{ transform: 'scale(1.02)' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-orange-600/90 to-amber-600/90"></div>
          )}
        </div>
        
        {/* Dark radial overlay to ensure readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-black/40 to-black/35 dark:from-[#0b0d11] transition-colors duration-300" />
        
        {/* Floating Brand Elements Container */}
        <div className="absolute inset-0 left-6 right-6 max-w-[1280px] mx-auto flex flex-col md:flex-row items-center md:items-end justify-center md:justify-between gap-4 z-10">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4 text-center md:text-left w-full">
            {showLogo && (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white dark:bg-zinc-900 p-1 border-2 border-orange-500 shadow-lg flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300 transform hover:scale-105">
                {logoUrl ? (
                  <img
                    src={logoUrl ?? ''}
                    alt={`${hotelName} Logo`}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="text-base font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                    {hotelName ? hotelName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : "HB"}
                  </span>
                )}
              </div>
            )}
            
            <div className="space-y-1.5 md:pb-1 select-none">
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <h1 className="text-xl md:text-3xl font-black tracking-tight text-white dark:text-zinc-100 drop-shadow-md">
                  {hotelName || "HotByte"}
                </h1>
                {/* Status Badges inside Hero */}
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white ${isOpen ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' : 'bg-rose-500'}`}>
                    {isOpen ? 'Open' : 'Closed'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-black/55 text-amber-400">
                    ★ 4.6
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-black/55 text-zinc-200">
                    ⏱️ 15m
                  </span>
                </div>
              </div>
              <p className="text-[10px] md:text-xs font-black tracking-widest text-orange-400 dark:text-orange-300 flex items-center justify-center md:justify-start gap-1 drop-shadow-sm uppercase">
                <span>{tagline || "Served with Love"}</span>
                <span className="text-red-500 animate-pulse text-xs">❤️</span>
              </p>
              
              {/* Hotel Type Badges */}
              <div className="flex items-center justify-center md:justify-start gap-1.5">
                {hotelType === "veg" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    🌱 100% Pure Veg
                  </span>
                )}
                {hotelType === "nonveg" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/15 border border-red-500/30 text-red-400">
                    🍗 Non-Veg Speciality
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Browse Section */}
      <main className="flex-grow max-w-[1280px] mx-auto w-full px-6 py-4 flex flex-col gap-4 bg-transparent z-10 relative">
        
        {/* Prominent Premium Table Badge */}
        <div className="flex justify-center my-1 select-none">
          <div className="flex flex-col items-center justify-center bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-orange-500/10 border border-orange-500/20 py-3.5 px-10 text-center rounded-3xl shadow-sm min-w-[220px]">
            <span className="text-[9px] font-black text-orange-500/80 tracking-[0.25em] uppercase mb-0.5">Dining Station</span>
            <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-wide flex items-center gap-2">
              <span>🍽️</span> {t('checkout.tableNumber', 'TABLE')} {tableNumber.replace("T-", "").padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Unified Greet Bar */}
        {!customer ? (
          <div className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150/40 dark:border-zinc-800/40 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-sm">👋</span>
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-355 tracking-tight">
                {t('greetings.welcome', 'Welcome')}, <span className="text-orange-500 font-extrabold">{t('common.guest', 'Guest')}</span>
              </span>
            </div>
          </div>
        ) : (
          /* For logged in customers */
          <div className={`w-full rounded-2xl p-[1px] shadow-sm transition-all duration-500 relative overflow-hidden group ${isBirthdayToday ? 'bg-gradient-to-r from-pink-500/40 via-purple-500/30 to-amber-500/40' : 'bg-gradient-to-r from-orange-500/20 via-amber-400/10 to-orange-500/20'}`}>
            <div className={`w-full rounded-[15px] p-4 backdrop-blur-xl relative overflow-hidden bg-white/95 dark:bg-zinc-950`}>
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-45" style={{ background: isBirthdayToday ? 'radial-gradient(circle, rgba(236,72,153,0.25), transparent)' : 'radial-gradient(circle, rgba(249,115,22,0.15), transparent)' }}></div>
              
              <div className="flex flex-col relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`relative shrink-0 ${isBirthdayToday ? 'animate-pulse' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl p-[2px] ${isBirthdayToday ? 'bg-gradient-to-br from-pink-500 via-purple-500 to-amber-500' : 'bg-gradient-to-br from-orange-500 to-amber-500'}`}>
                      {customer.avatarUrl ? (
                        <img 
                          src={customer.avatarUrl} 
                          alt={customer.name || "User"} 
                          className="w-full h-full rounded-[8px] object-cover bg-white dark:bg-zinc-900 ring-1 ring-white/20"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full rounded-[8px] bg-white dark:bg-zinc-900 flex items-center justify-center">
                          <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-amber-600">
                            {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-px -right-px w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900"></div>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                      {greeting.text}
                    </span>
                    <span className="text-[10px] text-zinc-550 dark:text-zinc-400 font-semibold truncate mt-0.5">
                      {greeting.sub}
                    </span>
                  </div>
                </div>

                {!customer.hasDob && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
                    <form onSubmit={handleInlineDobSubmit} className="flex flex-row items-center gap-2">
                      <span className="text-xs">🎁</span>
                      <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 whitespace-nowrap uppercase tracking-wider">
                        {t('login.birthdayRewardPrompt', 'Add DOB to celebrate!')}
                      </span>
                      <input
                        type="date"
                        required
                        value={dobInput}
                        onChange={(e) => setDobInput(e.target.value)}
                        className="flex-grow min-w-0 max-w-[130px] px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-black text-zinc-700 dark:text-zinc-200 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={updatingDob}
                        className="shrink-0 px-3 py-1.5 text-white font-black text-[10px] uppercase tracking-wider rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 cursor-pointer disabled:opacity-50 transition-all duration-200 active:scale-[0.97]"
                      >
                        {updatingDob ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Full-width Redesigned Search Bar */}
        <div className="w-full mt-1.5">
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            hotelType={hotelType}
            isVegOnly={isVegOnly}
            setIsVegOnly={setIsVegOnly}
          />
        </div>

        {/* Sticky Category Selector Scroll */}
        {categories.length > 0 && (
          <div className="sticky top-[56px] z-30 -mx-6 px-6 py-3 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-150/40 dark:border-zinc-800/40 flex gap-3 overflow-x-auto pb-3.5 scrollbar-none select-none transition-all duration-200">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    const element = document.getElementById("menu-food-grid");
                    if (element) {
                      const yOffset = -120; // navbar + category selector height
                      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      window.scrollTo({ top: y, behavior: "smooth" });
                    }
                  }}
                  className={`px-4.5 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap tracking-wider transition-all duration-300 cursor-pointer shadow-sm flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 active:scale-95"
                      : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <span className="text-sm shrink-0">{getCategoryEmoji(cat)}</span>
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Skeleton Loading Grid */}
        {loading ? (
          <div id="menu-food-grid" className="menu-grid grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-150/40 dark:border-zinc-800/55 rounded-3xl overflow-hidden animate-pulse flex flex-col gap-3 pb-4">
                <div className="pt-[68%] bg-zinc-150 dark:bg-zinc-800" />
                <div className="px-3.5 space-y-2">
                  <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-3/4" />
                  <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg w-full" />
                  <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg w-2/3" />
                  <div className="flex items-center justify-between pt-3">
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-14" />
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-zinc-900 text-orange-500 flex items-center justify-center text-2xl mx-auto shadow-inner">
              <Search size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">{t('menu.noItems', 'No Menu Items Found')}</h3>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                {t('menu.noItemsDesc', 'No items match your search or filter. Try a different keyword or category.')}
              </p>
            </div>
          </div>
        ) : (
          /* Food Card Listing Grid */
          <div id="menu-food-grid" className="menu-grid grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 animate-fade-in">
            {filteredItems.map(item => (
              <MenuItemCard
                key={item.item_id}
                item={item}
                cart={cart}
                isOpen={isOpen}
                handleAddToCart={handleAddToCart}
                handleDecreaseQuantity={handleDecreaseQuantity}
                handleImgError={handleImgError}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Smart Cart Toggle Button */}
      {cartCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className={`cart-float-btn fixed z-40 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white font-extrabold text-sm sm:text-base flex items-center gap-3 sm:gap-3.5 shadow-[0_15px_40px_rgba(255,90,31,0.4)] px-4.5 sm:px-6 py-3.5 sm:py-4 rounded-2xl cursor-pointer touch-action-manipulation transition-all duration-300 active:scale-95 group overflow-hidden border border-white/10 ${
            (!customer && requireCustomerAuth)
              ? "bottom-[92px] right-4 sm:right-6 md:bottom-[104px] md:right-6"
              : "bottom-6 right-4 sm:right-6"
          }`}
        >
          <div className="relative w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shadow-inner">
            <ShoppingCart size={18} className="text-white" />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 border-2 border-orange-500 text-[10px] font-black flex items-center justify-center shadow-lg">
              {cartCount}
            </span>
          </div>
          <div className="flex flex-col items-start leading-none gap-0.5">
            <span className="text-[10px] text-orange-200 uppercase tracking-widest font-black">{t('cart.title', 'Your Order')}</span>
            <span className="text-sm font-black">₹{cartTotal}</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowRight size={14} />
          </div>
        </button>
      )}

      {/* Stateful Slide-out Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsCartOpen(false)}
            className="cart-drawer-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
          ></div>

          {/* Drawer Panel */}
          <div className="cart-drawer relative w-full max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-150/40 dark:border-zinc-800/40 h-full shadow-2xl flex flex-col z-10 animate-fade-in-up">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-orange-500" />
                <h2 className="text-lg font-black text-zinc-900 dark:text-white">{t('cart.title', 'Your Basket')}</h2>
                <span className="px-2.5 py-0.5 bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 rounded-lg text-xs font-black">
                  {cartCount} {t('cart.items', 'Items')}
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Table Number & Selection Dropdown */}
            <div className="p-5 bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/55 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t('checkout.dineIn', 'Dining Station')}</span>
                <div className="inline-flex items-center gap-1.5 mt-1 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-xl w-fit">
                  <span className="text-xs">🍽️</span>
                  <span className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                    {t('checkout.tableNumber', 'TABLE')} {tableNumber.replace("T-", "").padStart(2, "0")}
                  </span>
                  {qrTableLocked && (
                    <span className="text-[8px] font-black text-white bg-orange-500 px-1.5 py-0.5 rounded-md">QR LOCKED</span>
                  )}
                </div>
              </div>
              <select
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                disabled={qrTableLocked}
                className={`px-4.5 py-2.5 bg-white dark:bg-zinc-900 rounded-xl border text-xs font-extrabold outline-none shadow-sm transition-all ${
                  qrTableLocked
                    ? "border-orange-500/30 text-orange-500 dark:text-orange-400 cursor-not-allowed opacity-80"
                    : "border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-zinc-300 focus:border-orange-500"
                }`}
              >
                {qrTableLocked ? (
                  <option value={tableNumber}>{t('checkout.tableNumber', 'Table')} {tableNumber}</option>
                ) : (
                  Array.from({ length: tableCount }, (_, i) => `T-${i + 1}`).map((tableId) => (
                    <option key={tableId} value={tableId}>
                      {t('checkout.tableNumber', 'Table')} {tableId.replace("T-", "")}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Basket Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                    <Utensils size={22} />
                  </div>
                  <h3 className="font-extrabold text-zinc-900 dark:text-white">{t('cart.empty', 'Empty Basket')}</h3>
                  <p className="text-xs text-zinc-500 max-w-[200px]">
                    {t('cart.emptyDesc', 'Add some delicious items from the menu to get started!')}
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const uniqueKey = item.selectedVariant ? `${item.item_id}_${item.selectedVariant.id}` : `${item.item_id}`;
                  return (
                    <div
                      key={uniqueKey}
                      className="flex items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800/40 pb-4 last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={handleImgError}
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                              <Utensils size={18} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-sm text-zinc-905 dark:text-zinc-50 leading-tight truncate">
                            {item.name}
                          </h4>
                          {item.selectedVariant && (
                            <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{item.selectedVariant.variant_name}</p>
                          )}
                          <p className="text-xs font-bold text-orange-500 mt-0.5 font-mono">₹{item.price}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Quantity controls */}
                        <div className="flex items-center bg-orange-500 text-white rounded-xl shadow-sm border border-orange-600/10 p-0.5">
                          <button
                            onClick={() => handleDecreaseQuantity(item.item_id, item.selectedVariant)}
                            disabled={!isOpen}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
                              isOpen ? "hover:bg-white/10 cursor-pointer touch-action-manipulation" : "opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <Minus size={11} strokeWidth={3} />
                          </button>
                          <span className="text-xs font-black min-w-[16px] text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleAddToCart(item, item.selectedVariant)}
                            disabled={!isOpen}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
                              isOpen ? "hover:bg-white/10 cursor-pointer touch-action-manipulation" : "opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <Plus size={11} strokeWidth={3} />
                          </button>
                        </div>

                        {/* Total Price */}
                        <span className="text-sm font-black text-zinc-900 dark:text-white w-14 text-right font-mono">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Checkout Footer */}
            <div className="p-5 border-t border-zinc-100 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 space-y-4">
              <div className="space-y-2 border-b border-zinc-100 dark:border-zinc-800/40 pb-3">
                <div className="flex justify-between items-center text-xs font-semibold text-zinc-500">
                  <span>Subtotal</span>
                  <span className="font-mono">₹{cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-end pt-1">
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-wider">{t('cart.grandTotal', 'Grand Total')}</span>
                    <span className="text-2xl font-black text-zinc-900 dark:text-white mt-1.5 font-mono">₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleClearCart}
                    className="text-xs font-black text-red-500 hover:underline uppercase tracking-wide cursor-pointer"
                  >
                    {t('cart.clear', 'Clear Basket')}
                  </button>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isPlacingOrder || !(isOpen && (enableQrOrdering || enableOnlineOrders))}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-white flex items-center justify-center gap-2 transition-all ${
                  isOpen && (enableQrOrdering || enableOnlineOrders) && !isPlacingOrder
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25 cursor-pointer active:scale-[0.98]" 
                    : "bg-zinc-500/30 border border-zinc-600/20 text-zinc-400 cursor-not-allowed"
                }`}
              >
                {isPlacingOrder ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    <span>{t('cart.processing', 'Processing...')}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {!isOpen 
                        ? t('menu.closed', 'Closed - Cannot Order') 
                        : (!enableQrOrdering && !enableOnlineOrders)
                          ? t('menu.disabled', 'Ordering is Disabled')
                          : t('cart.checkout', 'Place Order')
                      }
                    </span>
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Sticky Required Login Prompt (Zero-Overlap Stacked Design) */}
      {!customer && requireCustomerAuth && (
        <div className="fixed bottom-0 left-0 right-0 z-45 md:bottom-6 md:right-6 md:left-auto md:w-full md:max-w-md p-0 bg-transparent pointer-events-none">
          <div className="w-full bg-white/95 dark:bg-zinc-950/95 border border-orange-500/10 dark:border-orange-500/20 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] md:shadow-2xl md:rounded-2xl p-4 flex items-center justify-between gap-4 pointer-events-auto animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-lg shadow-inner shrink-0 animate-pulse">
                🔐
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white leading-tight">
                  {t('errors.unauthorized', 'Sign In Required')}
                </h4>
                <p className="text-[10px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {t('login.signInRequiredMsg', 'Please sign in with Google to place your order.')}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => router.push(`/login?hotel=${hotelSlug}`)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold tracking-tight shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none active:scale-95 shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.336 0 3.327 2.673 1.345 6.573L5.266 9.765z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.273c0-.818-.073-1.609-.209-2.373H12v4.509h6.464a5.53 5.53 0 0 1-2.4 3.627l3.864 3c2.264-2.09 3.564-5.173 3.564-8.763z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.266 14.235L1.345 17.427C3.327 21.327 7.336 24 12 24c3.1 0 5.7-.991 7.6-2.691l-3.864-3c-1.036.709-2.391 1.145-3.736 1.145-2.882 0-5.327-1.945-6.2-4.545l-3.918 3.19z"
                />
                <path
                  fill="#34A853"
                  d="M12 19.455c-1.345 0-2.7-.436-3.736-1.145l-3.864 3C6.3 23.009 9 24 12 24c4.664 0 8.673-2.673 10.655-6.573l-3.918-3.19c-.873 2.6-3.318 4.545-6.2 4.545z"
                />
              </svg>
              <span>Google</span>
            </button>
          </div>
        </div>
      )}

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-4 sm:right-6 z-40 w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg flex items-center justify-center text-zinc-650 dark:text-zinc-400 hover:text-orange-500 hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 cursor-pointer touch-action-manipulation animate-fade-in"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
      )}

      {/* Footer */}
      <footer className="w-full py-6 border-t border-zinc-150/40 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/20 text-center transition-colors">
        <p className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase tracking-[0.2em]">
          {t('common.copyrightQR', '© 2026 {{hotelName}}. Tables QR Integrated.').replace('{{hotelName}}', hotelName || "HotByte")}
        </p>
      </footer>
    </div></ErrorBoundary>
}
