"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Users,
  ShoppingBag,
  Timer,
  Play,
  CheckCircle,
  Truck,
  Trash2,
  RefreshCw,
  CreditCard,
  Banknote,
} from "lucide-react";
import Swal from "sweetalert2";

interface OrderItem {
  order_item_id: number;
  item_name: string;
  quantity: number;
  price: number;
}

interface Order {
  order_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  table_number: string;
  total_amount: number;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  created_at: string;
  payment_status: "pending" | "completed";
  payment_method: "cash" | "razorpay";
  razorpay_payment_id?: string;
  items: OrderItem[];
}

interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  pendingOrders: number;
  totalCustomers: number;
}

export default function AdminDashboard() {
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Admin Session Check
      const sessionRes = await fetch("/api/auth/admin/session-check");
      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated) {
        router.push("/admin/login");
        return;
      }

      // 2. Fetch Stats
      const statsRes = await fetch("/api/admin/dashboard/stats");
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // 3. Fetch Active Orders
      const ordersRes = await fetch("/api/admin/orders?view_type=active");
      const ordersData = await ordersRes.json();
      if (ordersData.success) {
        setOrders(ordersData.orders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh orders every 10 seconds
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchDashboardData();
    }, 10000);

    return () => clearInterval(interval);
  }, [router]);

  const handleUpdateStatus = async (orderId: number, nextStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          title: "Status Updated",
          text: `Order #${orderId} changed to ${nextStatus}.`,
          icon: "success",
          timer: 1000,
          showConfirmButton: false,
        });
        fetchDashboardData();
      } else {
        Swal.fire("Failure", data.message || "Failed to update status.", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Network connection failure.", "error");
    }
  };

  const handleMarkPaid = async (orderId: number) => {
    const result = await Swal.fire({
      title: "Approve Payment?",
      text: `Mark order #${orderId} cash payment as Completed?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Yes, Confirm Payment",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}/mark-paid`, {
          method: "PUT",
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire("Paid", "Order payment status marked completed.", "success");
          fetchDashboardData();
        } else {
          Swal.fire("Failure", data.message || "Failed to mark paid.", "error");
        }
      } catch (err) {
        Swal.fire("Error", "Failed to contact API server.", "error");
      }
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    const result = await Swal.fire({
      title: "Cancel Order?",
      text: "Warning: This cancels and completely deletes this order transaction!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Delete Order",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, {
          method: "DELETE",
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire("Deleted", "Order was deleted successfully.", "success");
          fetchDashboardData();
        } else {
          Swal.fire("Failure", data.message || "Could not delete order.", "error");
        }
      } catch (err) {
        Swal.fire("Error", "Network error encountered.", "error");
      }
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Live Orders Manager</span>
            {refreshing && (
              <RefreshCw size={16} className="text-orange-500 animate-spin" />
            )}
          </h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            Realtime operations controller dashboard
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchDashboardData();
          }}
          className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-200 hover:text-white rounded-xl text-xs font-bold border border-gray-800 flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Metrics Row */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 rounded-2xl bg-gray-900/50 animate-pulse border border-gray-850"
            ></div>
          ))}
        </div>
      ) : (
        stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            
            {/* Stat 1: Today Revenue */}
            <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg flex-shrink-0">
                <DollarSign size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Today&apos;s Revenue</p>
                <h3 className="text-xl font-black text-white mt-0.5 truncate">₹{stats.todayRevenue.toFixed(2)}</h3>
              </div>
            </div>

            {/* Stat 2: Today Orders */}
            <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-[var(--orange)] flex items-center justify-center text-lg flex-shrink-0">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Today&apos;s Orders</p>
                <h3 className="text-xl font-black text-white mt-0.5">{stats.todayOrders}</h3>
              </div>
            </div>

            {/* Stat 3: Total customers */}
            <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-lg flex-shrink-0">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Registered Guests</p>
                <h3 className="text-xl font-black text-white mt-0.5">{stats.totalCustomers}</h3>
              </div>
            </div>

            {/* Stat 4: Pending tracker */}
            <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center text-lg flex-shrink-0">
                <Timer size={20} />
              </div>
              <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Active Orders</p>
                <h3 className="text-xl font-black text-white mt-0.5">{stats.pendingOrders}</h3>
              </div>
            </div>

          </div>
        )
      )}

      {/* Live Kanban Boards Columns */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          
          {/* Column 1: Confirmed Pending */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse"></span>
                <span>Confirmed Pending</span>
              </h2>
              <span className="px-2.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg text-xs font-black">
                {pendingOrders.length}
              </span>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {pendingOrders.length === 0 ? (
                <div className="p-8 text-center bg-[#121212]/30 rounded-2xl border border-dashed border-gray-800 text-gray-500 text-xs font-semibold">
                  No pending table orders
                </div>
              ) : (
                pendingOrders.map((order) => (
                  <OrderKanbanCard
                    key={order.order_id}
                    order={order}
                    onNext={() => handleUpdateStatus(order.order_id, "preparing")}
                    nextLabel="Start Preparing"
                    nextIcon={<Play size={14} />}
                    onCancel={() => handleDeleteOrder(order.order_id)}
                    onPayConfirm={() => handleMarkPaid(order.order_id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: Kitchen preparing */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span>Active Cooking</span>
              </h2>
              <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-450 border border-blue-500/20 rounded-lg text-xs font-black">
                {preparingOrders.length}
              </span>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {preparingOrders.length === 0 ? (
                <div className="p-8 text-center bg-[#121212]/30 rounded-2xl border border-dashed border-gray-800 text-gray-500 text-xs font-semibold">
                  Kitchen queue empty
                </div>
              ) : (
                preparingOrders.map((order) => (
                  <OrderKanbanCard
                    key={order.order_id}
                    order={order}
                    onNext={() => handleUpdateStatus(order.order_id, "ready")}
                    nextLabel="Mark Ready"
                    nextIcon={<Truck size={14} />}
                    onCancel={() => handleDeleteOrder(order.order_id)}
                    onPayConfirm={() => handleMarkPaid(order.order_id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Ready to Serve */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                <span>Ready to Serve</span>
              </h2>
              <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-lg text-xs font-black">
                {readyOrders.length}
              </span>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {readyOrders.length === 0 ? (
                <div className="p-8 text-center bg-[#121212]/30 rounded-2xl border border-dashed border-gray-800 text-gray-500 text-xs font-semibold">
                  No plates ready for serving
                </div>
              ) : (
                readyOrders.map((order) => (
                  <OrderKanbanCard
                    key={order.order_id}
                    order={order}
                    onNext={() => handleUpdateStatus(order.order_id, "completed")}
                    nextLabel="Deliver & Close"
                    nextIcon={<CheckCircle size={14} />}
                    onCancel={() => handleDeleteOrder(order.order_id)}
                    onPayConfirm={() => handleMarkPaid(order.order_id)}
                  />
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// Kanban Single Order Card component
function OrderKanbanCard({
  order,
  onNext,
  nextLabel,
  nextIcon,
  onCancel,
  onPayConfirm,
}: {
  order: Order;
  onNext: () => void;
  nextLabel: string;
  nextIcon: React.ReactNode;
  onCancel: () => void;
  onPayConfirm: () => void;
}) {
  return (
    <div className="glass-card-dark p-5 rounded-2xl space-y-4 hover:border-gray-700 transition-all border border-gray-850 shadow-lg">
      
      {/* Title */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-white">#{order.order_id}</span>
            <span className="px-2 py-0.5 bg-orange-500/10 text-[var(--orange)] border border-orange-500/20 rounded text-[9px] font-black uppercase tracking-wide">
              Table {order.table_number.replace("T-", "")}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 font-semibold mt-1">
            {new Date(order.created_at).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <div className="text-right flex flex-col items-end">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Bill Amount</span>
          <span className="text-sm font-black text-white mt-0.5">₹{order.total_amount}</span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800/40 text-[11px] space-y-0.5">
        <p className="font-extrabold text-gray-300">{order.customer_name}</p>
        <p className="font-semibold text-gray-500">+91 {order.customer_phone}</p>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Items Queue</p>
        <div className="space-y-1.5 pl-0.5">
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-300 line-clamp-1">{item.item_name}</span>
              <span className="font-extrabold text-orange-500 ml-3 whitespace-nowrap">x {item.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bill Payments indicators */}
      <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-gray-800/60">
        <span className="text-gray-500 font-semibold flex items-center gap-1.5">
          {order.payment_method === "razorpay" ? (
            <CreditCard size={12} className="text-orange-500" />
          ) : (
            <Banknote size={12} className="text-yellow-500" />
          )}
          <span className="capitalize">{order.payment_method}</span>
        </span>

        {order.payment_status === "completed" ? (
          <span className="font-black text-emerald-500 uppercase tracking-wider">Paid Verified</span>
        ) : (
          <button
            onClick={onPayConfirm}
            className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded font-black uppercase tracking-wider cursor-pointer hover:bg-yellow-500/25"
          >
            Awaiting Pay
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-5 gap-2 pt-1">
        <button
          onClick={onNext}
          className="col-span-4 btn-orange py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {nextIcon}
          <span>{nextLabel}</span>
        </button>
        
        <button
          onClick={onCancel}
          className="py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 hover:text-red-400 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
          title="Cancel Order"
        >
          <Trash2 size={14} />
        </button>
      </div>

    </div>
  );
}
