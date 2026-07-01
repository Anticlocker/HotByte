"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  ShoppingBag,
  DollarSign,
  Calendar,
  Gift,
  Star,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { useNotification } from "@/context/NotificationContext";
import { useAdminSession } from "@/context/AdminSessionContext";
import { logger } from "@/lib/utils/logger";

interface OrderItem {
  order_item_id: number;
  item_name: string;
  quantity: number;
  price: number;
}

interface HistoricOrder {
  order_id: number;
  table_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  payment_status?: string;
  payment_method?: string;
  items: OrderItem[];
}

interface ReviewItem {
  rating_id: number;
  rating_value: number;
  review_text?: string;
  item_name?: string;
  created_at: string;
}

interface CustomerProfile {
  customer_id: number;
  name: string;
  phone: string;
  dob?: string;
  created_at: string;
}

export default function CustomerDetailReport({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { admin } = useAdminSession();
  const notif = useNotification();

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<HistoricOrder[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomerReport = async () => {
    if (!admin) return;
    try {
      // 1. Fetch specific customer data
      const res = await fetch(`/api/admin/users/${id}`);
      const data = await res.json();

      if (data.success) {
        setCustomer(data.user);
        setOrders(data.orders);
        setReviews(data.reviews);
      } else {
        notif.error("Not Found", "Customer record not found.");
        router.push("/admin/users");
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) {
      fetchCustomerReport();
    }
  }, [admin, id]);

  const totalSpent = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + parseFloat(String(o.total_amount)), 0);

  const avgSpent = orders.length > 0 ? totalSpent / orders.length : 0;

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
        <button
          onClick={() => router.push("/admin/users")}
          className="p-2.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl border border-gray-850 cursor-pointer transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Customer Spends & Sentiment Report
          </h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            Individual customer profile metrics and logs
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        customer && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Stats Row */}
            <div className="glass-card-dark p-6 sm:p-8 rounded-3xl grid sm:grid-cols-2 md:grid-cols-4 gap-6 items-center">
              {/* Profile Card */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[var(--orange)] flex items-center justify-center font-black text-sm flex-shrink-0">
                  {customer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-550 font-bold uppercase tracking-wider">Customer Info</p>
                  <h2 className="text-lg font-black text-white truncate mt-0.5">{customer.name}</h2>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">+91 {customer.phone}</p>
                </div>
              </div>

              {/* Spends */}
              <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-gray-850/60 pt-4 sm:pt-0 sm:pl-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg flex-shrink-0">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-gray-550 font-bold uppercase tracking-wider">Total Spends</p>
                  <h3 className="text-xl font-black text-white mt-0.5">₹{totalSpent.toFixed(2)}</h3>
                  <p className="text-[9px] text-gray-500 font-semibold mt-0.5">Avg Order: ₹{avgSpent.toFixed(1)}</p>
                </div>
              </div>

              {/* Transactions Count */}
              <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-gray-850/60 pt-4 md:pt-0 md:pl-6">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-lg flex-shrink-0">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-gray-550 font-bold uppercase tracking-wider">Total Dining Logs</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{orders.length} orders</h3>
                </div>
              </div>

              {/* Birthdate / Joined */}
              <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-gray-850/60 pt-4 md:pt-0 md:pl-6">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-lg flex-shrink-0">
                  <Gift size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-550 font-bold uppercase tracking-wider">Date of Birth</p>
                  <h3 className="text-sm font-black text-white truncate mt-0.5">
                    {customer.dob ? (
                      new Date(customer.dob).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    ) : (
                      <span className="text-gray-555 italic">Not Provided</span>
                    )}
                  </h3>
                  <p className="text-[9px] text-gray-500 font-semibold mt-0.5">
                    Joined:{" "}
                    {new Date(customer.created_at).toLocaleDateString("en-IN", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Split historical columns */}
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              
              {/* Column 1: Order checks */}
              <div className="space-y-4">
                <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 px-1">
                  <Clock size={16} className="text-orange-500" />
                  <span>Historical Dine Transactions ({orders.length})</span>
                </h2>

                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="p-8 text-center bg-[#121212]/30 rounded-2xl border border-dashed border-gray-850 text-gray-500 text-xs font-semibold">
                      No order checks logged.
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.order_id}
                        className="glass-card-dark p-5 rounded-2xl border border-gray-850/60 space-y-4"
                      >
                        <div className="flex justify-between items-center text-xs font-bold border-b border-gray-900 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white">Order #{order.order_id}</span>
                            <span className="px-2.5 py-1 bg-orange-600 text-white rounded text-[11px] font-black uppercase tracking-wide flex items-center gap-1 shadow-sm">
                              🍽️ TABLE {order.table_number.replace("T-", "").padStart(2, "0")}
                            </span>
                          </div>
                          <span className="text-sm font-black text-white">₹{order.total_amount}</span>
                        </div>

                        {/* Items sub-list */}
                        <div className="space-y-2 text-xs">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-gray-400 font-semibold">
                              <span>{item.item_name}</span>
                              <span>
                                {item.quantity} x ₹{item.price}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center text-[10px] pt-3 border-t border-gray-900 text-gray-500">
                          <span>
                            {new Date(order.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="uppercase font-extrabold">{order.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Sentiment feedback */}
              <div className="space-y-4">
                <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 px-1">
                  <Star size={16} className="text-orange-500" />
                  <span>Diner Sentiment & Reviews ({reviews.length})</span>
                </h2>

                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <div className="p-8 text-center bg-[#121212]/30 rounded-2xl border border-dashed border-gray-850 text-gray-500 text-xs font-semibold">
                      No feedback logs written.
                    </div>
                  ) : (
                    reviews.map((rev) => (
                      <div
                        key={rev.rating_id}
                        className="glass-card-dark p-5 rounded-2xl border border-gray-850/60 space-y-3.5"
                      >
                        <div className="flex justify-between items-center border-b border-gray-900 pb-3">
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={
                                  i < rev.rating_value
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-700"
                                }
                              />
                            ))}
                          </div>
                          <span className="text-[9px] text-gray-500 font-bold uppercase">
                            {new Date(rev.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>

                        {rev.review_text ? (
                          <p className="text-xs font-semibold text-gray-300 italic bg-gray-900/30 p-3.5 rounded-xl border border-gray-850">
                            &ldquo;{rev.review_text}&rdquo;
                          </p>
                        ) : (
                          <p className="text-xs font-bold text-gray-600 italic">No comments submitted</p>
                        )}

                        {rev.item_name && (
                          <div className="text-[9px] text-gray-550 font-bold uppercase tracking-wider">
                            Rated Product: {rev.item_name}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )
      )}
    </div>
  );
}
