"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomerNavbar from "@/components/CustomerNavbar";
import {
  User,
  Calendar,
  DollarSign,
  ShoppingBag,
  Clock,
  Trash2,
  Gift,
  Star,
  AlertCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/utils/logger";
import "@/i18n";

interface ProfileStats {
  id: number;
  name: string;
  phone: string;
  joinDate: string;
  totalOrders: number;
  totalSpent: number;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  imageUrl: string;
  variantName?: string;
}

interface Order {
  orderId: number;
  tableNumber: string;
  totalAmount: number;
  status: "pending" | "preparing" | "ready" | "completed";
  createdAt: string;
  paymentStatus: string;
  paymentMethod: string;
  items: OrderItem[];
}

export default function Profile() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const [profile, setProfile] = useState<ProfileStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasDob, setHasDob] = useState(true);
  const [dobInput, setDobInput] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchProfileAndOrders = async () => {
    try {
      // 1. Session & DOB Check
      const sessionRes = await fetch("/api/auth/session-check");
      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated) {
        router.push("/login");
        return;
      }
      setHasDob(sessionData.customer.hasDob);

      // 2. Fetch Profile Info
      const profileRes = await fetch("/api/profile");
      const profileData = await profileRes.json();
      if (profileData.success) {
        setProfile(profileData.profile);
      }

      // 3. Fetch Orders List
      const ordersRes = await fetch("/api/profile/orders");
      const ordersData = await ordersRes.json();
      if (ordersData.success) {
        setOrders(ordersData.orders);
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndOrders();
  }, [router]);

  const showStatusToast = (status: string) => {
    let emoji = "🔔";
    let msg = "";
    
    if (status === "preparing") {
      emoji = "🍳";
      msg = t('orders.preparingToast', "Your order is now being prepared.");
    } else if (status === "ready") {
      emoji = "🍽️";
      msg = t('orders.readyToast', "Your order is ready.");
    } else if (status === "completed") {
      emoji = "✅";
      msg = t('orders.completedToast', "Your order has been served.");
    } else if (status === "cancelled") {
      emoji = "❌";
      msg = t('orders.cancelledToast', "Your order has been cancelled.");
    }

    if (msg) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        title: `${emoji} ${msg}`,
        background: "#0d0f14",
        color: "#fff",
        customClass: {
          popup: "rounded-xl border border-gray-850 shadow-xl"
        }
      });
    }
  };

  useEffect(() => {
    if (!profile) return;

    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      let sseUrl = `/api/orders/status-stream?customerId=${profile.id}`;
      const backendUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
      
      if (backendUrl) {
        sseUrl = `${backendUrl}/api/orders/status-stream?customerId=${profile.id}`;
      } else if (typeof window !== "undefined") {
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
          sseUrl = `http://${window.location.hostname}:5000/api/orders/status-stream?customerId=${profile.id}`;
        }
      }

      eventSource = new EventSource(sseUrl, { withCredentials: true });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "statusUpdate") {
            const { orderId, status } = data;

            setOrders((prevOrders) => {
              const matchedOrder = prevOrders.find((o) => o.orderId === parseInt(orderId));
              if (matchedOrder && matchedOrder.status !== status) {
                showStatusToast(status);
                return prevOrders.map((order) =>
                  order.orderId === parseInt(orderId) ? { ...order, status } : order
                );
              }
              return prevOrders;
            });
          }
        } catch (err) {
          console.error("SSE parsing failed:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE connection error. Reconnecting in 5s...", err);
        eventSource?.close();
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    const pollInterval = setInterval(() => {
      fetch("/api/profile/orders")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data.success && Array.isArray(data.orders)) {
            setOrders((prevOrders) => {
              data.orders.forEach((newOrder: any) => {
                const oldOrder = prevOrders.find((o) => o.orderId === newOrder.orderId);
                if (oldOrder && oldOrder.status !== newOrder.status) {
                  showStatusToast(newOrder.status);
                }
              });
              return data.orders;
            });
          }
        })
        .catch((err) => console.error("Order polling failed:", err));
    }, 4000);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(pollInterval);
    };
  }, [profile, t]);

  const getCsrfToken = () => {
    if (typeof document === "undefined") return "";
    const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
  };

  const handleDobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dobInput) return;

    try {
      const res = await fetch("/api/profile/dob", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({ dob: dobInput }),
      });
      const data = await res.json();

      if (data.success) {
        setHasDob(true);
        Swal.fire({
          title: t('profile.updated', 'Profile Updated!'),
          text: t('profile.birthdaySaved', 'Date of Birth saved! You are now eligible for Birthday rewards.'),
          icon: "success",
          confirmButtonColor: "#FF5A1F",
        });
        fetchProfileAndOrders();
      } else {
        Swal.fire(t('common.validationError', 'Validation Error'), data.message || t('common.invalidDate', 'Invalid Date.'), "error");
      }
    } catch (err) {
      Swal.fire(t('common.error', 'Error'), t('profile.dobFailed', 'Failed to update Date of Birth'), "error");
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    const result = await Swal.fire({
      title: t('orders.cancelTitle', 'Cancel Order?'),
      text: t('orders.cancelText', 'Are you sure you want to cancel this order? This action cannot be undone.'),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#aaa",
      confirmButtonText: t('orders.cancelConfirm', 'Yes, Cancel Order'),
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/orders/cancel/${orderId}`, {
          method: "DELETE",
          headers: { "x-csrf-token": getCsrfToken() || "" },
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire(t('orders.cancelled', 'Cancelled'), t('orders.cancelSuccess', 'Order was deleted successfully.'), "success");
          fetchProfileAndOrders();
        } else {
          Swal.fire(t('common.error', 'Error'), data.message || t('orders.cancelFailed', 'Cannot cancel order.'), "error");
        }
      } catch (err) {
        Swal.fire(t('common.error', 'Error'), t('errors.networkError', 'Network connection failed.'), "error");
      }
    }
  };

  const handleRateOrder = async (orderId: number) => {
    const { value: formValues } = await Swal.fire({
      title: t('rating.title', 'Rate Your Dining Experience'),
      html: `
        <div class="space-y-4 text-left">
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide">${t('rating.score', 'Rating Score')}</label>
          <select id="rating-score" class="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-orange-500 font-bold">
            <option value="5">⭐⭐⭐⭐⭐ ${t('rating.excellent', 'Excellent (5/5)')}</option>
            <option value="4">⭐⭐⭐⭐ ${t('rating.veryGood', 'Very Good (4/5)')}</option>
            <option value="3">⭐⭐⭐ ${t('rating.good', 'Good (3/5)')}</option>
            <option value="2">⭐⭐ ${t('rating.fair', 'Fair (2/5)')}</option>
            <option value="1">⭐ ${t('rating.poor', 'Poor (1/5)')}</option>
          </select>
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide pt-2">${t('rating.writeReview', 'Write Review (Optional)')}</label>
          <textarea id="rating-text" placeholder="${t('rating.placeholder', 'Tell us how the food was...')}" class="w-full p-3 bg-white border border-gray-300 rounded-xl outline-none focus:border-orange-500 text-sm min-h-[80px]"></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: t('rating.submit', 'Submit Review'),
      confirmButtonColor: "#FF5A1F",
      preConfirm: () => {
        return {
          // @ts-ignore
          rating: parseInt(document.getElementById("rating-score").value),
          // @ts-ignore
          review_text: document.getElementById("rating-text").value,
        };
      },
    });

    if (formValues) {
      try {
        const res = await fetch("/api/ratings/submit-order", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
          body: JSON.stringify({
            order_id: orderId,
            rating: formValues.rating,
            review_text: formValues.review_text,
          }),
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire({
            title: t('rating.thankYou', 'Review Submitted!'),
            text: data.message || t('rating.thankYouMsg', 'Thank you for sharing your feedback!'),
            icon: "success",
            confirmButtonColor: "#FF5A1F",
          });
          fetchProfileAndOrders();
        } else {
          Swal.fire(t('common.failure', 'Failure'), data.message || t('rating.failed', 'Could not submit review.'), "error");
        }
      } catch (err) {
        Swal.fire(t('common.error', 'Error'), t('rating.failedSubmit', 'Failed to submit rating.'), "error");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50 border-yellow-250";
      case "preparing":
        return "text-blue-650 bg-blue-50 border-blue-250";
      case "ready":
        return "text-orange-650 bg-orange-50 border-orange-250";
      case "completed":
        return "text-emerald-650 bg-emerald-50 border-emerald-250";
      default:
        return "text-gray-650 bg-gray-50 border-gray-250";
    }
  };

  return (
    <div className="mesh-gradient min-h-screen flex flex-col justify-between selection:bg-orange-100 selection:text-orange-700 pt-14">
      <CustomerNavbar />

      <main className="flex-grow max-w-[1080px] mx-auto w-full px-6 py-8 flex flex-col gap-8">
        
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('profile.loading', 'Loading Dashboard...')}</p>
          </div>
        ) : (
          <>
            {/* Missing DOB Rewards Alert */}
            {!hasDob && (
              <div className="glass-card p-6 rounded-3xl border-l-4 border-l-orange-500 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse">
                <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
                  <div className="w-12 h-12 rounded-full bg-orange-50 text-[var(--orange)] flex items-center justify-center text-xl flex-shrink-0">
                    <Gift size={22} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm text-gray-900 leading-snug">{t('profile.birthdayRewardsTitle', 'Claim Birthday Rewards!')}</h3>
                    <p className="text-xs font-semibold text-gray-500">
                      {t('profile.birthdayRewardsDesc', 'Provide your Date of Birth to unlock exclusive digital vouchers and complimentary meals on your special day!')}
                    </p>
                  </div>
                </div>
                
                {/* Dob Inline Form */}
                <form onSubmit={handleDobSubmit} className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="date"
                    required
                    value={dobInput}
                    onChange={(e) => setDobInput(e.target.value)}
                    className="flex-grow md:w-44 px-4 py-2.5 bg-white border border-gray-205 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-orange-500 shadow-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 text-white font-bold text-xs rounded-xl btn-orange whitespace-nowrap cursor-pointer"
                  >
                    {t('common.submit', 'Submit')}
                  </button>
                </form>
              </div>
            )}

            {/* Profile Statistics Header Card */}
            {profile && (
              <div className="glass-card p-6 md:p-8 rounded-3xl grid sm:grid-cols-2 md:grid-cols-4 gap-6 items-center">
                
                {/* Card 1: User details */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[var(--orange)] flex items-center justify-center text-lg flex-shrink-0">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('profile.customerName', 'Customer Name')}</p>
                    <h2 className="text-lg font-black text-gray-900 truncate mt-0.5">{profile.name}</h2>
                    <p className="text-xs font-semibold text-gray-500 mt-0.5">+91 {profile.phone}</p>
                  </div>
                </div>

                {/* Card 2: Total Orders */}
                <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-gray-150/40 pt-4 sm:pt-0 sm:pl-6">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-650 flex items-center justify-center text-lg flex-shrink-0">
                    <ShoppingBag size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('admin.totalOrders', 'Total Orders')}</p>
                    <h3 className="text-xl font-black text-gray-900 mt-0.5">{profile.totalOrders}</h3>
                  </div>
                </div>

                {/* Card 3: Total Spent */}
                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-gray-150/40 pt-4 md:pt-0 md:pl-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg flex-shrink-0">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('profile.totalSpent', 'Total Spent')}</p>
                    <h3 className="text-xl font-black text-gray-900 mt-0.5">₹{profile.totalSpent.toFixed(2)}</h3>
                  </div>
                </div>

                {/* Card 4: Join Date */}
                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-gray-150/40 pt-4 md:pt-0 md:pl-6">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-650 flex items-center justify-center text-lg flex-shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('profile.memberSince', 'Member Since')}</p>
                    <h3 className="text-sm font-black text-gray-900 truncate mt-0.5">
                      {new Date(profile.joinDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </h3>
                  </div>
                </div>

              </div>
            )}

            {/* Orders Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Clock className="text-orange-500" />
                <span>{t('profile.orderHistory', 'Your Order Tracking & History')}</span>
              </h2>

              {orders.length === 0 ? (
                <div className="glass-card p-12 text-center rounded-3xl space-y-4">
                  <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center text-2xl mx-auto">
                    <ShoppingBag size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-gray-950">{t('profile.noOrders', 'No Orders Yet')}</h3>
                    <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto">
                      {t('profile.noOrdersSubtitle', 'Looks like you haven\'t ordered anything yet. Head to the menu to place your first table order!')}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(profile ? `/${profile.id}/menu` : "/menu")}
                    className="btn-orange px-6 py-3 rounded-xl font-bold text-xs text-white cursor-pointer"
                  >
                    {t('nav.menu', 'View Menu')}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div key={order.orderId} className="glass-card p-6 rounded-3xl space-y-6">
                      
                      {/* Order Header Card */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-gray-900">{t('orders.orderId', 'Order #')}{order.orderId}</span>
                            <span
                              className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border tracking-wide ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {t(`orders.${order.status}`, order.status)}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">
                            {t('orders.placedOn', 'Placed on')}{" "}
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-3.5 py-2 rounded-xl">
                            <span className="text-sm">🍽️</span>
                            <span className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                              {t('orders.table', 'TABLE')} {order.tableNumber.replace("T-", "").padStart(2, "0")}
                            </span>
                          </div>

                          {order.status === "pending" && (
                            <button
                              onClick={() => handleCancelOrder(order.orderId)}
                              className="px-3.5 py-2.5 text-red-650 hover:bg-red-50 rounded-xl text-xs font-bold border border-red-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Trash2 size={14} />
                              <span>{t('common.cancel', 'Cancel')}</span>
                            </button>
                          )}

                          {order.status === "completed" && (
                            <button
                              onClick={() => handleRateOrder(order.orderId)}
                              className="px-3.5 py-2.5 text-orange-650 hover:bg-orange-50 rounded-xl text-xs font-bold border border-orange-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Star size={14} className="fill-orange-600 text-orange-600" />
                              <span>{t('profile.rateOrder', 'Rate Order')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                               {/* Redesigned Active Order Preparation Step Progress Timeline */}
                      {order.status !== "completed" && (
                        <div className="py-4 px-2 sm:px-4 bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-150/40 dark:border-zinc-800/40 space-y-4">
                          <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                            Order Status Progress
                          </span>
                          
                          <div className="flex flex-col gap-5 relative pl-4 sm:pl-6">
                            {/* Vertical track line backdrop */}
                            <div className="absolute left-[9px] sm:left-[11px] top-2 bottom-2 w-0.5 bg-zinc-200 dark:bg-zinc-800"></div>
                            
                            {/* Active vertical fill */}
                            <div 
                              className="absolute left-[9px] sm:left-[11px] top-2 w-0.5 bg-orange-500 transition-all duration-700"
                              style={{
                                height: 
                                  order.status === "pending"
                                    ? "0px"
                                    : order.status === "preparing"
                                    ? "48px"
                                    : "96px" // ready
                              }}
                            ></div>

                            {[
                              { key: "pending", emoji: "🟠", title: t('orders.confirmed', 'Order Confirmed'), desc: "Your order has been accepted by the restaurant" },
                              { key: "preparing", emoji: "🍳", title: t('orders.preparing', 'Preparing in Kitchen'), desc: "Chef is preparing your delicious meal" },
                              { key: "ready", emoji: "🍽️", title: t('orders.ready', 'Ready for Service'), desc: "Dishes are hot and ready to be served" },
                            ].map((step, idx) => {
                              const steps = ["pending", "preparing", "ready"];
                              const currentIdx = steps.indexOf(order.status);
                              const isCompleted = idx < currentIdx;
                              const isActive = idx === currentIdx;

                              return (
                                <div key={step.key} className="flex items-start gap-4 z-10 relative">
                                  {/* Dot indicator */}
                                  <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-300 shrink-0 ${
                                      isCompleted
                                        ? "bg-orange-500 border-orange-600 text-white shadow-md shadow-orange-500/10"
                                        : isActive
                                        ? "bg-white dark:bg-zinc-950 border-orange-500 text-orange-500 scale-110 shadow-lg ring-4 ring-orange-500/15"
                                        : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400"
                                    }`}
                                  >
                                    {isCompleted ? "✓" : idx + 1}
                                  </div>

                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm shrink-0">{step.emoji}</span>
                                      <h4 className={`text-xs sm:text-sm font-black transition-colors ${
                                        isActive 
                                          ? "text-orange-600 dark:text-orange-400" 
                                          : isCompleted 
                                          ? "text-zinc-800 dark:text-zinc-205" 
                                          : "text-zinc-400 dark:text-zinc-550"
                                      }`}>
                                        {step.title}
                                      </h4>
                                    </div>
                                    <p className={`text-[10px] sm:text-xs font-semibold mt-0.5 transition-colors ${
                                      isActive 
                                        ? "text-zinc-650 dark:text-zinc-300" 
                                        : "text-zinc-450 dark:text-zinc-500"
                                    }`}>
                                      {step.desc}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Chef Alert Message */}
                          {order.status === "ready" && (
                            <div className="p-4 bg-orange-50 dark:bg-orange-950/10 border border-orange-200 dark:border-orange-900/30 rounded-2xl flex items-center gap-3 animate-pulse">
                              <AlertCircle size={18} className="text-orange-600 flex-shrink-0" />
                              <p className="text-xs font-bold text-orange-950 dark:text-orange-100 leading-snug">
                                {t('orders.chefReady', 'Chef has set your order as Ready! Waiter is bringing the hot plates to table {{table}} right now.').replace('{{table}}', order.tableNumber.replace("T-", ""))}
                              </p>
                            </div>
                          )}

                          {/* Prep time estimation info */}
                          <div className="pt-3 border-t border-zinc-150/40 dark:border-zinc-800/40 flex items-center justify-between text-[10px] font-black text-zinc-450 uppercase tracking-wider">
                            <span>Estimated Remaining Time</span>
                            <span className="text-orange-500 font-extrabold flex items-center gap-1">
                              ⏱️ {order.status === "pending" ? "15-20 mins" : order.status === "preparing" ? "8-12 mins" : "Ready!"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Items details list */}
                      <div className="space-y-3.5 bg-gray-50/50 p-4 sm:p-5 rounded-2xl border border-gray-150/40">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('orders.items', 'Items')}</span>
                          <span className="text-xs font-bold text-gray-800">
                            {t('checkout.total', 'Total')}: <span className="font-extrabold text-orange-600">₹{order.totalAmount}</span>
                          </span>
                        </div>

                        <div className="space-y-3 pt-2">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                {item.imageUrl && (
                                  <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <span className="text-xs font-extrabold text-gray-900 truncate">
                                  {item.name} {item.variantName ? `(${item.variantName})` : ""}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-gray-500 whitespace-nowrap">
                                {item.quantity} x ₹{item.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="w-full py-4 border-t border-gray-150/40 bg-white/60 text-center mt-6">
        <p className="text-[10px] font-bold text-gray-450 uppercase tracking-[0.2em]">
          {t('common.copyright', '© 2026 HotByte. Realtime Orders Live.')}
        </p>
      </footer>
    </div>
  );
}
