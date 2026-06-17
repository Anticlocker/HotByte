"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  History,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingBag,
  DollarSign,
} from "lucide-react";
import { logger } from "@/lib/utils/logger";

interface OrderItem {
  order_item_id: number;
  item_name: string;
  quantity: number;
  price: number;
  variant_name?: string;
}

interface HistoricOrder {
  order_id: number;
  order_display_id?: string;
  customer_name: string;
  customer_phone: string;
  table_number: string;
  total_amount: number;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  created_at: string;
  payment_status: "pending" | "completed";
  payment_method: "cash" | "razorpay" | "qr";
  payment_reference?: string;
  items: OrderItem[];
}

export default function OrderHistoryArchive() {
  const router = useRouter();

  const [orders, setOrders] = useState<HistoricOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "cancelled">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "old">("all");
  const [loading, setLoading] = useState(true);

  const fetchOrdersArchive = async () => {
    try {
      // 1. Session check
      const sessionRes = await fetch("/api/auth/admin/session-check");
      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated) {
        router.push("/admin/login");
        return;
      }

      setLoading(true);

      // 2. Fetch ALL orders (completed + cancelled + active)
      let url = "/api/admin/orders?view_type=all&limit=200";
      if (dateFilter !== "all") {
        url += `&date_filter=${dateFilter}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setOrders(data.orders);
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersArchive();
  }, [router, dateFilter]);

  // Apply search and status filters on fetched array
  const filteredOrders = orders.filter((o) => {
    // 1. Status Filter
    if (statusFilter === "completed" && o.status !== "completed") return false;
    if (statusFilter === "cancelled" && o.status !== "cancelled") return false;

    // 2. Search Lookup
    const q = searchQuery.toLowerCase();
    return (
      o.order_id.toString().includes(q) ||
      o.table_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_phone.includes(q)
    );
  });

  const completedOrders = orders.filter((o) => o.status === "completed");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  const totalCompletedSpends = completedOrders.reduce(
    (sum, o) => sum + parseFloat(String(o.total_amount)),
    0
  );

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <History className="text-[var(--orange)]" />
            <span>Order History Archives</span>
          </h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            Access, audit, and search previous completed and cancelled dine orders
          </p>
        </div>

        {/* Date Quick Filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as any)}
          className="px-4 py-2.5 bg-gray-900 rounded-xl border border-gray-800 text-xs font-bold text-gray-300 focus:border-orange-500 outline-none cursor-pointer"
        >
          <option value="all">Lifetime History</option>
          <option value="today">Today&apos;s Records</option>
          <option value="old">Archived Old Records</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Net Spends */}
            <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg flex-shrink-0">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Historical Revenue</p>
                <h3 className="text-xl font-black text-white mt-0.5">₹{totalCompletedSpends.toFixed(2)}</h3>
              </div>
            </div>

            {/* Total log checks */}
            <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-lg flex-shrink-0">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Total Checks Logged</p>
                <h3 className="text-xl font-black text-white mt-0.5">{orders.length} checks</h3>
              </div>
            </div>

            {/* Completed */}
            <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg flex-shrink-0 animate-pulse">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Served & Closed</p>
                <h3 className="text-xl font-black text-white mt-0.5">{completedOrders.length}</h3>
              </div>
            </div>

            {/* Cancelled */}
            <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center text-lg flex-shrink-0">
                <XCircle size={20} />
              </div>
              <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Cancelled Orders</p>
                <h3 className="text-xl font-black text-white mt-0.5">{cancelledOrders.length}</h3>
              </div>
            </div>
          </div>

          {/* Table Listing filters */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
              {/* Tab Selector */}
              <div className="flex bg-gray-900/60 p-1 rounded-xl border border-gray-850">
                {(["all", "completed", "cancelled"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                      statusFilter === tab
                        ? "bg-orange-500 text-white shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {tab === "all" ? "All Checks" : tab}
                  </button>
                ))}
              </div>

              {/* Search lookup */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-3.5 text-gray-500" size={14} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Lookup ID, table, guest name..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs font-semibold text-gray-200 placeholder-gray-600 focus:border-orange-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Log Table Card */}
            {filteredOrders.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-[#121212]/20 border border-dashed border-gray-800 text-gray-500 text-xs font-semibold max-w-md mx-auto">
                No matching historic orders found.
              </div>
            ) : (
              <div className="glass-card-dark rounded-2xl overflow-hidden border border-gray-850">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-850 bg-gray-900/30 text-gray-500 uppercase tracking-widest font-black">
                        <th className="p-4 pl-6">ID #</th>
                        <th className="p-4">Diner Name</th>
                        <th className="p-4">Table</th>
                        <th className="p-4">Items Summary</th>
                        <th className="p-4">Gross Spends</th>
                        <th className="p-4">Pay Method</th>
                        <th className="p-4">Date Placed</th>
                        <th className="p-4 pr-6 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850/60 font-semibold text-gray-300">
                      {filteredOrders.map((order) => (
                        <tr key={order.order_id} className="hover:bg-gray-900/20">
                          {/* ID */}
                          <td className="p-4 pl-6 font-extrabold text-white">
                            {order.order_display_id || `#${order.order_id}`}
                          </td>

                          {/* Diner */}
                          <td className="p-4">
                            <span className="font-extrabold text-gray-200 block">
                              {order.customer_name}
                            </span>
                            <span className="text-[10px] text-gray-550 block mt-0.5">
                              +91 {order.customer_phone}
                            </span>
                            {order.payment_reference && (
                              <span className="text-[9px] font-mono font-bold text-orange-500 block mt-0.5">
                                Ref: {order.payment_reference}
                              </span>
                            )}
                          </td>

                          {/* Table */}
                          <td className="p-4 text-xs font-bold text-gray-400">
                            🪑 {order.table_number.replace("T-", "")}
                          </td>

                          {/* Items Summary */}
                          <td className="p-4 max-w-xs truncate">
                            {order.items.map((i) => `${i.item_name}${i.variant_name ? ` (${i.variant_name})` : ""} (x${i.quantity})`).join(", ")}
                          </td>

                          {/* Gross Amount */}
                          <td className="p-4 text-sm font-black text-white">
                            ₹{order.total_amount}
                          </td>

                          {/* Pay Method */}
                          <td className="p-4 uppercase text-[10px] text-gray-400 font-bold">
                            {order.payment_method}
                          </td>

                          {/* Date Placed */}
                          <td className="p-4 text-gray-500">
                            {new Date(order.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          {/* Status */}
                          <td className="p-4 pr-6 text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                                order.status === "completed"
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                  : order.status === "cancelled"
                                  ? "bg-red-500/10 border-red-500/20 text-red-400"
                                  : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
