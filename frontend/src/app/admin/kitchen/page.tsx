"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Flame, Bell, CheckCircle2, Clock, Check, Utensils } from "lucide-react";
import Swal from "sweetalert2";

interface OrderItem {
  order_item_id: number;
  item_name: string;
  quantity: number;
}

interface Order {
  order_id: number;
  table_number: string;
  total_amount: number;
  status: "pending" | "preparing" | "ready";
  created_at: string;
  items: OrderItem[];
}

export default function KitchenKDS() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const prevPendingCountRef = useRef(0);

  const fetchKitchenOrders = async () => {
    try {
      // 1. Session Check
      const sessionRes = await fetch("/api/auth/admin/session-check");
      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated) {
        router.push("/admin/login");
        return;
      }

      // 2. Fetch Active Cooking Queue (pending + preparing)
      const res = await fetch("/api/admin/orders?status=pending,preparing");
      const data = await res.json();

      if (data.success) {
        const activeOrders = data.orders;
        setOrders(activeOrders);

        // 🔊 Play Sound Notification if new pending orders are detected!
        const currentPendingCount = activeOrders.filter((o: Order) => o.status === "pending").length;
        if (currentPendingCount > prevPendingCountRef.current) {
          const audio = new Audio("/notification.mp3");
          audio.play().catch(() => {
            // Browser autoplays can be blocked before user interaction, safely swallow
          });
        }
        prevPendingCountRef.current = currentPendingCount;
      }
    } catch (err) {
      console.error("Failed to load kitchen display system orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();

    // Fast-polling kitchen display system dashboard (5 seconds intervals)
    const interval = setInterval(fetchKitchenOrders, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const handleUpdateStatus = async (orderId: number, nextStatus: "preparing" | "ready") => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          title: nextStatus === "preparing" ? "Cooking Started!" : "Dish Ready!",
          text: `Order #${orderId} moved forward.`,
          icon: "success",
          timer: 1000,
          showConfirmButton: false,
        });
        fetchKitchenOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const pendingQueue = orders.filter((o) => o.status === "pending");
  const preparingQueue = orders.filter((o) => o.status === "preparing");

  return (
    <div className="p-6 lg:p-10 space-y-8 min-h-screen bg-[#070707]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ChefHat className="text-[var(--orange)]" />
            <span>Kitchen Display System (KDS)</span>
            <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg animate-pulse ml-2">
              Active Connection
            </span>
          </h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
            Chef queue monitor with audio alerts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="glass-card-dark px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 flex items-center gap-2">
            <Flame className="text-orange-500" size={14} />
            <span>Total Cooking Queue: {orders.length}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-20 text-center rounded-3xl bg-[#121212]/20 border border-dashed border-gray-800 space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-orange-500/5 text-[var(--orange)] flex items-center justify-center text-3xl mx-auto shadow-inner animate-pulse">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white">All Orders Complete</h3>
            <p className="text-xs text-gray-555 font-medium leading-relaxed">
              No pending or active dishes. Chef, take a well-deserved rest! New incoming dining checks will display here automatically.
            </p>
          </div>
        </div>
      ) : (
        /* KDS Grid Split */
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          
          {/* Section 1: NEW PENDING CHECKS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Bell size={16} className="text-yellow-500 animate-bounce" />
                <span>New Pending Checks</span>
              </h2>
              <span className="px-2.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg text-xs font-black">
                {pendingQueue.length} Orders
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {pendingQueue.length === 0 ? (
                <div className="col-span-2 p-8 text-center bg-[#121212]/30 rounded-2xl border border-dashed border-gray-850 text-gray-500 text-xs font-semibold">
                  No pending orders.
                </div>
              ) : (
                pendingQueue.map((order) => (
                  <KitchenOrderCard
                    key={order.order_id}
                    order={order}
                    onAction={() => handleUpdateStatus(order.order_id, "preparing")}
                    actionLabel="Fire Cooking"
                    actionClass="btn-orange"
                    icon={<Flame size={14} />}
                  />
                ))
              )}
            </div>
          </div>

          {/* Section 2: ACTIVE IN PREPARATION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Flame size={16} className="text-blue-500 animate-pulse" />
                <span>Active on Stoves</span>
              </h2>
              <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-450 border border-blue-500/20 rounded-lg text-xs font-black">
                {preparingQueue.length} Orders
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {preparingQueue.length === 0 ? (
                <div className="col-span-2 p-8 text-center bg-[#121212]/30 rounded-2xl border border-dashed border-gray-850 text-gray-500 text-xs font-semibold">
                  No active cooking checks.
                </div>
              ) : (
                preparingQueue.map((order) => (
                  <KitchenOrderCard
                    key={order.order_id}
                    order={order}
                    onAction={() => handleUpdateStatus(order.order_id, "ready")}
                    actionLabel="Set Ready"
                    actionClass="bg-emerald-600 hover:bg-emerald-500 text-white"
                    icon={<Check size={14} />}
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

// Kitchen Order Card Component
function KitchenOrderCard({
  order,
  onAction,
  actionLabel,
  actionClass,
  icon,
}: {
  order: Order;
  onAction: () => void;
  actionLabel: string;
  actionClass: string;
  icon: React.ReactNode;
}) {
  const getElapsedSeconds = (createdAtStr: string) => {
    const elapsed = Date.now() - new Date(createdAtStr).getTime();
    return Math.floor(elapsed / 60000);
  };

  const [mins, setMins] = useState(0);

  useEffect(() => {
    setMins(getElapsedSeconds(order.created_at));
    const interval = setInterval(() => {
      setMins(getElapsedSeconds(order.created_at));
    }, 30000);

    return () => clearInterval(interval);
  }, [order.created_at]);

  return (
    <div className="glass-card-dark p-5 rounded-2xl flex flex-col justify-between gap-5 border border-gray-850 shadow-md">
      <div className="space-y-4">
        {/* Card Header */}
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-white">Order #{order.order_id}</h3>
            <span className="px-2 py-0.5 bg-gray-900 border border-gray-800 text-gray-400 rounded text-[9px] font-extrabold uppercase tracking-wide">
              Table {order.table_number.replace("T-", "")}
            </span>
          </div>

          <div
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
              mins > 15
                ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse"
                : mins > 8
                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                : "bg-gray-900 text-gray-500 border-gray-800"
            }`}
          >
            <Clock size={10} />
            <span>{mins}m ago</span>
          </div>
        </div>

        {/* Ordered Item Dishes grid with massive sizes for easy cooking visibility */}
        <div className="space-y-2 pt-2 border-t border-gray-900">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start gap-3">
              <span className="font-black text-sm text-gray-200">{item.item_name}</span>
              <span className="font-black text-base text-[var(--orange)] bg-orange-500/5 px-2 py-0.5 rounded border border-orange-500/15 whitespace-nowrap">
                x {item.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Fire button */}
      <button
        onClick={onAction}
        className={`w-full py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow ${actionClass}`}
      >
        {icon}
        <span>{actionLabel}</span>
      </button>

    </div>
  );
}
