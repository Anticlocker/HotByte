"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import CustomerNavbar from "@/components/CustomerNavbar";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Sparkles,
  Utensils,
  Leaf,
  X,
  CreditCard,
  Banknote,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import Swal from "sweetalert2";
import confetti from "canvas-confetti";

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
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface PageProps {
  params: Promise<{
    hotel_slug: string;
  }>;
}

// Fallback for broken images
const FOOD_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%23FF5A1F' stroke-width='1.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M8 14s1.5 2 4 2 4-2 4-2'/%3E%3Cline x1='9' y1='9' x2='9.01' y2='9'/%3E%3Cline x1='15' y1='9' x2='15.01' y2='9'/%3E%3C/svg%3E";
const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.src = FOOD_FALLBACK;
  e.currentTarget.style.objectFit = "contain";
  e.currentTarget.style.padding = "12px";
  e.currentTarget.style.background = "#1a1a1a";
};

export default function MenuPage({ params }: PageProps) {
  const router = useRouter();
  const { hotel_slug } = use(params);
  const hotelSlug = hotel_slug || "hotbyte";

  const [categories, setCategories] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [isFrozen, setIsFrozen] = useState(false);
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

  const isBirthdayToday = (() => {
    if (!customer || !customer.dob) return false;
    const dob = new Date(customer.dob);
    const today = new Date();
    return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
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

  const handleInlineDobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dobInput) return;

    setUpdatingDob(true);
    try {
      const res = await fetch("/api/profile/dob", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dob: dobInput }),
      });
      const data = await res.json();

      if (data.success) {
        setCustomer((prev: any) => ({
          ...prev,
          dob: dobInput,
          hasDob: true
        }));
        
        Swal.fire({
          title: "Profile Updated!",
          text: "Date of Birth saved successfully! Celebrate your birthday with special rewards.",
          icon: "success",
          confirmButtonColor: "#FF5A1F",
        });
      } else {
        Swal.fire("Validation Error", data.message || "Invalid Date.", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Failed to update Date of Birth", "error");
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
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("T-1");
  const [tableCount, setTableCount] = useState<number>(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Session Info (Public access: do not redirect if not logged in!)
    fetch(`/api/auth/session-check?hotel_slug=${hotelSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setCustomer(data.customer);
        }
      })
      .catch(() => {});

    // 2. Fetch Categories
    fetch(`/api/menu/categories?hotel_slug=${hotelSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.isFrozen) {
          setIsFrozen(true);
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
          if (data.hotelType) setHotelType(data.hotelType);
          // Veg-only hotels: auto-enable veg filter
          if (data.hotelType === "veg") setIsVegOnly(true);
          setRequireCustomerAuth(data.requireCustomerAuth || false);
          setSuspiciousActivityMode(data.suspiciousActivityMode || false);
        }
      })
      .catch(() => {});

    // 3. Fetch Menu Items
    fetch(`/api/menu/items?hotel_slug=${hotelSlug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.isFrozen) {
          setIsFrozen(true);
        } else if (data.success) {
          const mappedItems = data.items.map((item: any) => ({
            ...item,
            name: item.item_name || item.name || "",
          }));
          setMenuItems(mappedItems);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // 4. Restore Cart from LocalStorage
    const savedCart = localStorage.getItem(`hotbyte_cart_${hotelSlug}`);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {}
    }

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

    // 5-second interval poll for real-time status propagation
    const intervalId = setInterval(() => {
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
            }
          }
        })
        .catch(() => {});
    }, 5000);

    return () => {
      window.removeEventListener("openMenuCart", handleOpenMenuCart);
      clearInterval(intervalId);
    };
  }, [router, hotelSlug]);

  // Synchronize cart to localStorage and dispatch update events
  const saveCartToStorage = (updatedCart: CartItem[]) => {
    setCart(updatedCart);
    localStorage.setItem(`hotbyte_cart_${hotelSlug}`, JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const handleAddToCart = (item: MenuItem) => {
    if (!isOpen) {
      Swal.fire({
        title: "Hotel Closed",
        text: "This hotel is currently closed and not accepting new orders.",
        icon: "warning",
        confirmButtonColor: "#FF5A1F",
      });
      return;
    }
    if (!item.is_available) return;
    const existing = cart.find((i) => i.item_id === item.item_id);
    if (existing) {
      const updated = cart.map((i) =>
        i.item_id === item.item_id ? { ...i, quantity: i.quantity + 1 } : i
      );
      saveCartToStorage(updated);
    } else {
      saveCartToStorage([...cart, { ...item, quantity: 1 }]);
    }
    
    // Light vibration/sparkles feel
    navigator.vibrate?.(50);
  };

  const handleDecreaseQuantity = (itemId: number) => {
    if (!isOpen) {
      Swal.fire({
        title: "Hotel Closed",
        text: "This hotel is currently closed and not accepting new orders.",
        icon: "warning",
        confirmButtonColor: "#FF5A1F",
      });
      return;
    }
    const existing = cart.find((i) => i.item_id === itemId);
    if (!existing) return;
    if (existing.quantity === 1) {
      const filtered = cart.filter((i) => i.item_id !== itemId);
      saveCartToStorage(filtered);
    } else {
      const updated = cart.map((i) =>
        i.item_id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
      saveCartToStorage(updated);
    }
  };

  const handleRemoveFromCart = (itemId: number) => {
    const filtered = cart.filter((i) => i.item_id !== itemId);
    saveCartToStorage(filtered);
  };

  const handleClearCart = () => {
    saveCartToStorage([]);
  };

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

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

  // Razorpay script load helper
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

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
    if (!isOpen) {
      Swal.fire({
        title: "Hotel Closed",
        text: "This hotel is currently closed and not accepting new orders.",
        icon: "warning",
        confirmButtonColor: "#FF5A1F",
      });
      return;
    }
    if (cart.length === 0) {
      Swal.fire("Cart Empty", "Please add items to your cart before checking out.", "info");
      return;
    }

    if (!customer) {
      if (requireCustomerAuth) {
        // Hotel requires Google login
        const result = await Swal.fire({
          title: "🔐 Login Required",
          html: `<div style="color:#aaa;font-size:14px">This hotel requires you to sign in before placing an order.<br/><span style="color:#FF5A1F;font-weight:bold">Please login with Google to continue.</span></div>`,
          icon: "info",
          showCancelButton: true,
          confirmButtonColor: "#FF5A1F",
          cancelButtonColor: "#6b7280",
          confirmButtonText: "Login with Google",
        });
        if (result.isConfirmed) router.push(`/login?hotel=${hotelSlug}`);
        return;
      } else {
        // Guest mode: just ask for name
        const nameResult = await Swal.fire({
          title: "👋 What's your name?",
          html: `<div style="color:#aaa;font-size:13px;margin-bottom:8px">Enter your name to place the order as a guest</div>`,
          input: "text",
          inputPlaceholder: "Your name (e.g. Rahul)",
          inputAttributes: { autocomplete: "name", maxlength: "60" },
          showCancelButton: true,
          confirmButtonText: "Continue",
          confirmButtonColor: "#FF5A1F",
          cancelButtonColor: "#6b7280",
          background: "#0d0f14",
          color: "#fff",
          customClass: {
            popup: "rounded-2xl border border-gray-800/80",
            input: "rounded-xl bg-gray-900 border border-gray-700 text-white px-4 py-2 focus:border-orange-500"
          },
          inputValidator: (value) => {
            if (!value || value.trim().length < 2) return "Please enter your name (at least 2 characters)";
          }
        });
        if (!nameResult.isConfirmed || !nameResult.value) return;

        // Guest checkin
        try {
          const gcRes = await fetch("/api/auth/guest-checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: nameResult.value.trim(), hotel_slug: hotelSlug })
          });
          const gcData = await gcRes.json();
          if (!gcData.success) {
            if (gcData.requireAuth) {
              Swal.fire("Login Required", "This hotel requires Google authentication.", "info");
              router.push(`/login?hotel=${hotelSlug}`);
            } else {
              Swal.fire("Error", gcData.message || "Guest checkin failed.", "error");
            }
            return;
          }
          setCustomer(gcData.customer);
        } catch {
          Swal.fire("Network Error", "Unable to complete guest checkin.", "error");
          return;
        }
      }
    }

    // ── Frontend GPS proximity check ──────────────────────────────
    let customerLat: number | null = null;
    let customerLng: number | null = null;

    if (hotelLatitude !== null && hotelLongitude !== null) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        customerLat = position.coords.latitude;
        customerLng = position.coords.longitude;
        const dist = haversineDistance(customerLat, customerLng, hotelLatitude, hotelLongitude);
        if (dist > orderRadius) {
          await Swal.fire({
            title: "Too Far Away 📍",
            html: `<div style="font-size:13px;color:#aaa;line-height:1.7">
              You must be within <b style="color:#FF5A1F">${orderRadius} meters</b> of the hotel to place an order.<br/>
              Your current distance: <b style="color:#ef4444">${Math.round(dist)}m away</b>
            </div>`,
            icon: "error",
            confirmButtonColor: "#FF5A1F",
          });
          return;
        }
      } catch (err: any) {
        await Swal.fire({
          title: "Location Required 📍",
          html: `<div style="font-size:13px;color:#aaa">${err?.code === 1 ? "Location access is blocked. Please enable GPS in your browser settings and try again." : "Could not get your GPS location. Please ensure location services are enabled."}</div>`,
          icon: "warning",
          confirmButtonColor: "#FF5A1F",
        });
        return;
      }
    }

    const result = await Swal.fire({
      title: "Place Order",
      html: `
        <div class="text-gray-400 mb-5 text-sm text-center">Select your preferred payment method for table <span class="text-orange-500 font-bold font-mono">${tableNumber}</span>:</div>
        <div class="flex flex-col gap-3 mt-2 text-left">
          ${enableQrOrdering ? `
          <button id="pay-cash-btn" class="flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-850 hover:border-orange-500 transition-all duration-300 text-left w-full group focus:outline-none">
            <div class="flex items-center gap-4">
              <div class="p-3 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wallet"><path d="M21 12V7H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14v2"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
              </div>
              <div>
                <div class="font-bold text-white text-base tracking-wide">Cash / Pay At Table</div>
                <div class="text-xs text-gray-400 mt-0.5">Pay directly with cash or card at your table</div>
              </div>
            </div>
            <div class="w-5 h-5 rounded-full border-2 border-gray-700 flex items-center justify-center group-hover:border-orange-500 group-hover:bg-orange-500/20 transition-all duration-300">
              <div class="w-2.5 h-2.5 rounded-full bg-transparent group-hover:bg-orange-500 transition-all duration-300"></div>
            </div>
          </button>
          ` : ''}
          
          ${enableOnlineOrders ? `
          <button id="pay-online-btn" class="flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-850 hover:border-orange-500 transition-all duration-300 text-left w-full group focus:outline-none">
            <div class="flex items-center gap-4">
              <div class="p-3 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              </div>
              <div>
                <div class="font-bold text-white text-base tracking-wide">Online Payment (UPI / Card)</div>
                <div class="text-xs text-gray-400 mt-0.5">Instant online payment using Razorpay gateway</div>
              </div>
            </div>
            <div class="w-5 h-5 rounded-full border-2 border-gray-700 flex items-center justify-center group-hover:border-orange-500 group-hover:bg-orange-500/20 transition-all duration-300">
              <div class="w-2.5 h-2.5 rounded-full bg-transparent group-hover:bg-orange-500 transition-all duration-300"></div>
            </div>
          </button>
          ` : ''}
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "Cancel",
      cancelButtonColor: "#374151",
      background: "#0d0f14",
      color: "#fff",
      customClass: {
        popup: "rounded-2xl border border-gray-800/80 shadow-2xl backdrop-blur-xl bg-gray-950/95 p-6",
        title: "text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-500 tracking-wide pb-1",
        cancelButton: "px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 hover:bg-gray-600 focus:outline-none"
      },
      didOpen: () => {
        const cashBtn = document.getElementById("pay-cash-btn");
        const onlineBtn = document.getElementById("pay-online-btn");
        
        if (cashBtn) {
          cashBtn.addEventListener("click", () => {
            (Swal as any).selectedPaymentMethod = "CASH";
            Swal.clickConfirm();
          });
        }
        if (onlineBtn) {
          onlineBtn.addEventListener("click", () => {
            (Swal as any).selectedPaymentMethod = "ONLINE";
            Swal.clickConfirm();
          });
        }
      },
      preConfirm: () => {
        return (Swal as any).selectedPaymentMethod;
      }
    });

    const paymentMethod = result.value;

    if (!paymentMethod) return;

    if (paymentMethod === "CASH") {
      // Cash Order Placement
      Swal.fire({
        title: "Processing Order",
        text: "Sending your order to the kitchen...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const res = await fetch("/api/orders/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table_number: tableNumber,
            hotel_slug: hotelSlug,
            customerLat,
            customerLng,
            items: cart.map((i) => ({
              item_id: i.item_id,
              price: i.price,
              quantity: i.quantity,
            })),
          }),
        });
        const data = await res.json();

        if (data.success) {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          handleClearCart();
          setIsCartOpen(false);
          await Swal.fire({
            title: "Order Placed!",
            text: `Your cash order for table ${tableNumber} has been received.`,
            icon: "success",
            confirmButtonColor: "#FF5A1F",
          });
          router.push("/profile");
        } else {
          Swal.fire("Occupied Table", data.message || "Checkout failed.", "error");
        }
      } catch (err) {
        Swal.fire("Network Error", "Unable to send checkout request.", "error");
      }
    } else {
      // Online Razorpay Payment
      Swal.fire({
        title: "Initializing Payment",
        text: "Connecting to payment gateway...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        // 1. Get Key ID
        const keyRes = await fetch("/api/payments/razorpay-key");
        const keyData = await keyRes.json();
        if (!keyData.success) throw new Error("Could not retrieve payment parameters");
        const razorpayKey = Buffer.from(keyData.key, "base64").toString("ascii");

        // 2. Load script
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          Swal.fire("Integration Error", "Failed to load payment portal script.", "error");
          return;
        }

        // 3. Create Razorpay order
        const orderCreateRes = await fetch("/api/payments/create-razorpay-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: cartTotal }),
        });
        const orderCreateData = await orderCreateRes.json();
        if (!orderCreateData.success) throw new Error(orderCreateData.message || "Failed to create payment order");

        const rzpOrder = orderCreateData.razorpay_order;

        Swal.close();

        // 4. Open Razorpay Widget
        const options = {
          key: razorpayKey,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          name: "HotByte Digital Menu",
          description: `Table ${tableNumber} Dining Bill`,
          order_id: rzpOrder.id,
          handler: async (response: any) => {
            Swal.fire({
              title: "Verifying Transaction",
              text: "Please wait while we log your order...",
              allowOutsideClick: false,
              didOpen: () => Swal.showLoading(),
            });

            try {
              const verifyRes = await fetch("/api/orders/create-after-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  table_number: tableNumber,
                  hotel_slug: hotelSlug,
                  customerLat,
                  customerLng,
                  items: cart.map((i) => ({
                    item_id: i.item_id,
                    price: i.price,
                    quantity: i.quantity,
                  })),
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();

              if (verifyData.success) {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
                handleClearCart();
                setIsCartOpen(false);
                await Swal.fire({
                  title: "Payment Successful!",
                  text: "Your order is now being prepared in the kitchen.",
                  icon: "success",
                  confirmButtonColor: "#FF5A1F",
                });
                router.push("/profile");
              } else {
                Swal.fire("Verification Error", verifyData.message || "Signature checks failed.", "error");
              }
            } catch (err) {
              Swal.fire("Verification Error", "Failed to confirm payment signature.", "error");
            }
          },
          prefill: {
            name: customer?.name || "",
            contact: customer?.phone || "",
          },
          theme: {
            color: "#FF5A1F",
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } catch (err: any) {
        Swal.fire("Gateway Offline", err.message || "Failed to initialize payment gateway.", "error");
      }
    }
  };

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
            Your free trial or subscription period for this digital menu has expired. Please buy a subscription or contact the hotel administration to continue accessing services.
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
    <div className="mesh-gradient min-h-screen flex flex-col justify-between selection:bg-orange-100 selection:text-orange-700 bg-white dark:bg-[#0b0d11] transition-colors duration-300">
      <CustomerNavbar />

      {!isOpen && (
        <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white py-3.5 px-6 font-sans border-b border-red-800 shadow-md z-20">
          <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-lg animate-pulse">
                🏪
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-extrabold uppercase tracking-wide">Hotel is Currently Closed</span>
                <span className="text-xs font-semibold opacity-90 mt-0.5">We are not accepting new orders at the moment. You can still browse our menu.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {suspiciousActivityMode && (
        <div className="w-full bg-gradient-to-r from-amber-900/80 via-yellow-900/80 to-amber-900/80 border-b border-amber-700/50 py-2.5 px-6 z-20 backdrop-blur-sm">
          <div className="max-w-[1280px] mx-auto flex items-center justify-center gap-3">
            <span className="text-lg">🔐</span>
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Identity Verification Active — Google Login Required</span>
          </div>
        </div>
      )}

      {/* Visual Masterpiece Full-Bleed Cover & Brand Header */}
      {showBanner ? (
        <div className="relative w-full h-[200px] sm:h-[240px] md:h-[300px] overflow-hidden select-none border-b border-gray-150/40 dark:border-zinc-800/40">
          {/* Cover Banner Image */}
          {bannerUrl ? (
            <img 
              src={bannerUrl} 
              alt={hotelName} 
              loading="eager"
              className="w-full h-full object-cover transition-transform duration-700"
              style={{ transform: 'scale(1.02)' }}
            />
          ) : (
            /* Aesthetic Fallback Cover Image (stunning high-res dining spread) */
            <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
          )}
          
          {/* Modern dark radial overlay to ensure readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1017] via-black/45 to-black/35 dark:from-[#0b0d11] transition-colors duration-300" />
          
          {/* Floating Brand Elements Container */}
          <div className="absolute bottom-6 left-6 right-6 lg:left-16 lg:right-16 max-w-[1280px] mx-auto flex flex-col md:flex-row items-center md:items-end justify-between gap-4 md:gap-6 z-10">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 text-center md:text-left w-full">
              {/* Elegant overlapping brand logo badge */}
              {showLogo && (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white dark:bg-zinc-900 p-1 border-2 border-orange-500 shadow-xl flex-shrink-0 flex items-center justify-center overflow-hidden transition-all duration-300 transform hover:scale-105 animate-fade-in">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt={`${hotelName} Logo`} 
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    /* Sleek Monogram Initials Fallback if no logo is available */
                    <span className="text-xl md:text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                      {hotelName ? hotelName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : "HB"}
                    </span>
                  )}
                </div>
              )}
              
              {/* Typography block */}
              <div className="space-y-1 md:pb-1">
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-md">
                  {hotelName || "HotByte"}
                </h1>
                <p className="text-xs md:text-sm font-bold tracking-widest text-orange-400 flex items-center justify-center md:justify-start gap-1.5 drop-shadow-sm uppercase">
                  <span>{tagline || "Served with Love"}</span>
                  <span className="text-red-500 animate-pulse text-[13px] md:text-base">❤️</span>
                </p>
                {/* Hotel Type Badge */}
                {hotelType === "veg" && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    🌱 100% Pure Veg Restaurant
                  </span>
                )}
                {hotelType === "nonveg" && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/15 border border-red-500/30 text-red-400">
                    🍗 Non-Veg Speciality
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Dynamic premium compact header area when banner is hidden */
        <div className="bg-white dark:bg-zinc-900/60 border-b border-gray-150/40 dark:border-zinc-800/40 py-6 px-6 lg:px-16 animate-fade-in">
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            {showLogo && (
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800 p-1 border-2 border-orange-500 shadow-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt={`${hotelName} Logo`} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span className="text-lg font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
                    {hotelName ? hotelName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : "HB"}
                  </span>
                )}
              </div>
            )}
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
                {hotelName || "HotByte"}
              </h1>
              <p className="text-xs font-bold tracking-widest text-orange-500 flex items-center justify-center sm:justify-start gap-1 uppercase">
                <span>{tagline || "Served with Love"}</span>
                <span className="text-red-500 animate-pulse text-xs">❤️</span>
              </p>
              {/* Hotel Type Badge (no-banner header) */}
              {hotelType === "veg" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400">
                  🌱 100% Pure Veg Restaurant
                </span>
              )}
              {hotelType === "nonveg" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400">
                  🍗 Non-Veg Speciality
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Browse Section */}
      <main className="flex-grow max-w-[1280px] mx-auto w-full px-6 py-8 flex flex-col gap-8 bg-transparent">
        
        {/* Dynamic Personalized Greeting Card */}
        {(() => {
          if (!customer) {
            return null;
          }

          const getGreetingMessage = () => {
            if (isBirthdayToday) {
              return {
                text: `🎉 Happy Birthday, ${customer.name || "Customer"}! 🎂`,
                sub: "Wishing you a fantastic day and delicious meals ahead! Enjoy your special birthday dining.",
                icon: "🎈",
                bg: "bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 border-pink-500/35 text-gray-900 dark:text-gray-100 dark:shadow-[0_0_20px_rgba(236,72,153,0.15)] animate-pulse"
              };
            }

            const hour = new Date().getHours();
            let text = "";
            let sub = "We hope you are having an exceptional dining experience!";
            let icon = "✨";

            if (hour >= 5 && hour < 12) {
              text = `Good Morning, ${customer.name || "Customer"} ☀️`;
              sub = "Start your day with a delightful and fresh breakfast spread!";
              icon = "🌅";
            } else if (hour >= 12 && hour < 17) {
              text = `Good Afternoon, ${customer.name || "Customer"} 🌤️`;
              sub = "Treat yourself to our exquisite lunch specials and refreshing coolers!";
              icon = "🥗";
            } else if (hour >= 17 && hour < 21) {
              text = `Good Evening, ${customer.name || "Customer"} 🌇`;
              sub = "Unwind with our premium curated dinner items and chef specials!";
              icon = "🍛";
            } else {
              text = `Good Night, ${customer.name || "Customer"} 🌙`;
              sub = "Craving a late night bite or dessert? We've got your sweet tooth covered!";
              icon = "🍰";
            }

            return {
              text,
              sub,
              icon,
              bg: "bg-white/80 dark:bg-zinc-900/65 border-gray-150/40 dark:border-zinc-800/40 text-gray-900 dark:text-gray-100"
            };
          };

          const greeting = getGreetingMessage();

          return (
            <div className={`w-full border rounded-3xl p-6 shadow-sm backdrop-blur-md transition-all duration-300 relative overflow-hidden group ${greeting.bg}`}>
              {isBirthdayToday && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
              )}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
                  <div className="w-16 h-16 rounded-2xl bg-orange-100/50 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center text-3xl shadow-inner transform group-hover:scale-105 transition-transform duration-300">
                    {greeting.icon}
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl md:text-2xl font-black tracking-tight leading-tight">
                      {greeting.text}
                    </h2>
                    <p className="text-xs md:text-sm font-semibold text-gray-500 dark:text-gray-400 max-w-xl">
                      {greeting.sub}
                    </p>
                  </div>
                </div>

                {!customer.hasDob ? (
                  <form onSubmit={handleInlineDobSubmit} className="flex items-center gap-3 w-full md:w-auto bg-gray-50 dark:bg-zinc-950/30 p-2 rounded-2xl border border-gray-150/40 dark:border-zinc-800/40">
                    <div className="flex flex-col leading-none pl-2 pr-1 hidden sm:flex">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Enter DOB</span>
                      <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-0.5">Birthday Gift</span>
                    </div>
                    <input
                      type="date"
                      required
                      value={dobInput}
                      onChange={(e) => setDobInput(e.target.value)}
                      className="px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-205 dark:border-zinc-800 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 outline-none focus:border-orange-500 shadow-sm"
                    />
                    <button
                      type="submit"
                      disabled={updatingDob}
                      className="px-4 py-2 text-white font-bold text-xs rounded-xl btn-orange whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {updatingDob ? "Saving..." : "Save DOB"}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          );
        })()}

        {/* Sleek Search & Quick Filter Controls Bar */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900/60 p-4 border border-gray-150/40 dark:border-zinc-800/40 rounded-3xl shadow-sm backdrop-blur-md transition-all duration-300">
          <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3.5 text-gray-400 dark:text-gray-550" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chef's specials..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 dark:bg-zinc-850/80 border border-gray-205 dark:border-zinc-800 focus:border-[var(--orange)] dark:focus:border-[var(--orange)] outline-none text-sm font-semibold text-gray-800 dark:text-gray-200 transition-all shadow-inner"
              />
            </div>

            {/* Veg Only Toggle - only show for both-type hotels */}
            {hotelType === "both" && (
              <button
                onClick={() => setIsVegOnly(!isVegOnly)}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-sm font-bold transition-all cursor-pointer shadow-sm select-none ${
                  isVegOnly
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-350 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-white dark:bg-zinc-900 border-gray-205 dark:border-zinc-800 text-gray-650 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                }`}
              >
                <Leaf size={16} className={isVegOnly ? "fill-emerald-750" : ""} />
                <span>Veg Only</span>
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2.5 text-xs font-bold text-gray-450 dark:text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-zinc-850/30 px-3.5 py-2 rounded-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
            <span>Digital QR Station: {tableNumber}</span>
          </div>
        </div>
        
        {/* Dynamic Category Selector Scroll */}
        {categories.length > 0 && (
          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none select-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-3 rounded-2xl text-xs font-bold whitespace-nowrap tracking-wide transition-all cursor-pointer shadow-sm ${
                  selectedCategory === cat
                    ? "bg-[var(--orange)] text-white shadow-lg shadow-orange-500/20"
                    : "bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800/60 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-350 dark:hover:border-zinc-750"
                }`}
              >
                {cat === "All" && <Sparkles size={12} className="inline mr-1" />}
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Fresh Menu...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center text-2xl mx-auto shadow-inner">
              <Search size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-gray-950">No Menu Items Found</h3>
              <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto">
                No items match your selected filters. Try clearing your search queries or vegetarian preferences.
              </p>
            </div>
          </div>
        ) : (
          /* Food Card Listing Grid */
          <div className="menu-grid grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.item_id}
                className={`menu-card-hover bg-white dark:bg-zinc-900 border border-gray-150/40 dark:border-zinc-800/55 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col relative transition-all duration-300 ${
                  item.is_available
                    ? "hover:shadow-xl hover:shadow-orange-100 dark:hover:shadow-orange-950/10 hover:-translate-y-1.5"
                    : "opacity-75"
                }`}
              >
                {/* Veg/Non-Veg Badge */}
                <div className="absolute top-3 left-3 z-10 flex gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase shadow-md ${
                      item.is_veg
                        ? "bg-emerald-600 text-white"
                        : "bg-red-650 text-white"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    {item.is_veg ? "Veg" : "Non-Veg"}
                  </span>
                </div>

                {/* Rating Badge */}
                {item.avg_rating && parseFloat(item.avg_rating) > 0 && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-bold text-yellow-400 shadow-md">
                      <i className="fas fa-star text-[9px]"></i>
                      {parseFloat(item.avg_rating).toFixed(1)}
                    </span>
                  </div>
                )}

                {/* Food Image Container — padding-top ratio trick works on all Android versions */}
                <div className="menu-card-img-wrap">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      onError={handleImgError}
                    />
                  ) : (
                    <div className="menu-card-img-placeholder flex flex-col items-center justify-center text-gray-300 dark:text-gray-650">
                      <Utensils size={36} />
                    </div>
                  )}
                  
                  {/* Out of Stock Overlay */}
                  {!item.is_available && (
                    <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center text-white p-4 text-center">
                      <AlertTriangle className="text-yellow-500 mb-1" size={24} />
                      <p className="text-xs font-black uppercase tracking-wider">Out of Stock</p>
                      <p className="text-[10px] opacity-75 mt-0.5">Chef is preparing more!</p>
                    </div>
                  )}
                </div>

                {/* Card details */}
                <div className="menu-card-body p-3 sm:p-5 flex-1 flex flex-col justify-between gap-3 sm:gap-4 bg-white dark:bg-zinc-900">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white leading-snug line-clamp-2">
                      {item.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs font-semibold text-gray-400 dark:text-gray-500 line-clamp-2 hidden sm:block">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col leading-none">
                      <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wider">Price</span>
                      <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-0.5 font-mono">₹{item.price}</span>
                    </div>

                    {!isOpen ? (
                      <button
                        disabled
                        className="px-2.5 sm:px-4 py-2 sm:py-2.5 text-gray-400 dark:text-gray-500 font-bold text-[10px] sm:text-xs bg-gray-150 dark:bg-zinc-800 border border-gray-250 dark:border-zinc-800 rounded-xl flex items-center gap-1 sm:gap-1.5 cursor-not-allowed uppercase"
                      >
                        Closed
                      </button>
                    ) : item.is_available ? (
                      cart.find((i) => i.item_id === item.item_id) ? (
                        /* Quantity adjusters */
                        <div className="flex items-center gap-1.5 sm:gap-2.5 bg-orange-50 dark:bg-orange-950/15 border border-orange-200 dark:border-orange-900/30 rounded-xl p-0.5 sm:p-1 shadow-sm">
                          <button
                            onClick={() => handleDecreaseQuantity(item.item_id)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg active:bg-orange-100 dark:active:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400 transition-colors cursor-pointer"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="text-sm font-extrabold text-orange-950 dark:text-orange-100 min-w-[16px] text-center">
                            {cart.find((i) => i.item_id === item.item_id)?.quantity}
                          </span>
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg active:bg-orange-100 dark:active:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400 transition-colors cursor-pointer"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ) : (
                        /* Add Button */
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="px-2.5 sm:px-4 py-2 sm:py-2.5 text-white font-bold text-[10px] sm:text-xs rounded-xl flex items-center gap-1 sm:gap-1.5 btn-orange cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>ADD</span>
                        </button>
                      )
                    ) : (
                      <button
                        disabled
                        className="px-2.5 sm:px-4 py-2 sm:py-2.5 text-gray-400 font-bold text-[10px] sm:text-xs bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800 rounded-xl flex items-center gap-1 sm:gap-1.5"
                      >
                        N/A
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Smart Cart Toggle Button */}
      {cartCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className={`cart-float-btn fixed z-40 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white font-extrabold text-sm sm:text-base flex items-center gap-3 sm:gap-3.5 shadow-[0_15px_40px_rgba(255,90,31,0.45)] px-4 sm:px-6 py-3.5 sm:py-4 rounded-2xl cursor-pointer transition-all duration-300 active:scale-95 group overflow-hidden border border-white/10 ${
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
            <span className="text-[10px] text-orange-200 uppercase tracking-widest font-black">Your Order</span>
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

          {/* Drawer Panel — on mobile becomes a bottom sheet via .cart-drawer CSS class */}
          <div className="cart-drawer relative w-full max-w-md bg-white dark:bg-[#12141c] border-l border-gray-150/40 dark:border-zinc-800/40 h-full shadow-2xl flex flex-col z-10 animate-fade-in-up">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-150 dark:border-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-[var(--orange)]" />
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Your Basket</h2>
                <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950/20 text-[var(--orange)] dark:text-orange-400 rounded-lg text-xs font-bold">
                  {cartCount} Items
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Table Number & Quick Options */}
            <div className="p-6 bg-gray-50 dark:bg-zinc-900/40 border-b border-gray-150 dark:border-zinc-800/50 flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider">Dining Station</span>
                <span className="text-sm font-extrabold text-gray-800 dark:text-gray-200 mt-0.5">Enter Table Number</span>
              </div>
              <select
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-zinc-950 rounded-xl border border-gray-205 dark:border-zinc-850 text-sm font-bold text-gray-800 dark:text-gray-300 outline-none focus:border-[var(--orange)] shadow-sm"
              >
                {Array.from({ length: tableCount }, (_, i) => `T-${i + 1}`).map((t) => (
                  <option key={t} value={t}>
                    Table {t.replace("T-", "")}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List scrollable */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
              {cart.map((item) => (
                <div
                  key={item.item_id}
                  className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800/40 pb-4 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gray-150 dark:bg-zinc-800 overflow-hidden flex-shrink-0">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      onError={handleImgError} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white leading-snug truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs font-bold text-gray-450 dark:text-gray-500 mt-0.5 font-mono">₹{item.price}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Quantity controls */}
                    <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-805 rounded-lg p-0.5">
                      <button
                        onClick={() => handleDecreaseQuantity(item.item_id)}
                        disabled={!isOpen}
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-gray-600 dark:text-gray-400 ${
                          isOpen ? "hover:bg-gray-200 dark:hover:bg-zinc-800 cursor-pointer" : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{item.quantity}</span>
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={!isOpen}
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-gray-600 dark:text-gray-400 ${
                          isOpen ? "hover:bg-gray-200 dark:hover:bg-zinc-800 cursor-pointer" : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    {/* Total Price & Delete */}
                    <span className="text-sm font-black text-gray-955 dark:text-white w-14 text-right font-mono">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Checkout Footer */}
            <div className="p-6 border-t border-gray-150 dark:border-zinc-800/50 bg-white dark:bg-[#12141c] space-y-4">
              <div className="flex justify-between items-end">
                <div className="flex flex-col leading-none">
                  <span className="text-xs text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wider">Subtotal bill</span>
                  <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 font-mono">₹{cartTotal}</span>
                </div>
                <button
                  onClick={handleClearCart}
                  className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                >
                  Clear Cart
                </button>
              </div>

              <button
                onClick={handleCheckout}
                disabled={!(isOpen && (enableQrOrdering || enableOnlineOrders))}
                className={`w-full py-4 rounded-2xl font-black text-white flex items-center justify-center gap-2.5 transition-all ${
                  isOpen && (enableQrOrdering || enableOnlineOrders)
                    ? "btn-orange shadow-lg shadow-orange-500/20 cursor-pointer" 
                    : "bg-gray-400 border border-gray-300 dark:border-zinc-800 text-gray-200 dark:text-gray-400 cursor-not-allowed"
                }`}
              >
                <span>
                  {!isOpen 
                    ? "Closed - Cannot Place Order" 
                    : (!enableQrOrdering && !enableOnlineOrders)
                      ? "Ordering is currently disabled"
                      : "Checkout Dining Order"
                  }
                </span>
                <ArrowRight size={18} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Sticky Required Login Prompt (Zero-Overlap Stacked Design) */}
      {!customer && requireCustomerAuth && (
        <div className="fixed bottom-0 left-0 right-0 z-45 md:bottom-6 md:right-6 md:left-auto md:w-full md:max-w-md p-0 bg-transparent pointer-events-none">
          <div className="w-full bg-white/95 dark:bg-[#12141c]/95 border border-orange-500/10 dark:border-orange-500/20 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] md:shadow-2xl md:rounded-2xl p-4 flex items-center justify-between gap-4 pointer-events-auto animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-lg shadow-inner shrink-0 animate-pulse">
                🔐
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight">
                  Sign In Required
                </h4>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-gray-500">
                  Please sign in with Google to place your order.
                </p>
              </div>
            </div>
            
            <button
              onClick={() => router.push(`/login?hotel=${hotelSlug}`)}
              className="flex items-center justify-center gap-2.5 px-4 py-2 bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-gray-755 dark:text-gray-200 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold tracking-tight shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer select-none active:scale-95 shrink-0"
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
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-6 border-t border-gray-150/40 dark:border-zinc-800/40 bg-white/60 dark:bg-zinc-950/20 text-center transition-colors">
        <p className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-[0.2em]">
          &copy; 2026 {hotelName || "HotByte"}. Tables QR Integrated.
        </p>
      </footer>
    </div>
  );
}
