"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Users,
  DollarSign,
  TrendingDown,
  Clock,
  Calendar,
  PieChart,
} from "lucide-react";
import { logger } from "@/lib/utils/logger";

interface SalesOverview {
  total_orders: number;
  total_customers: number;
  total_revenue: number;
  avg_order_value: number;
}

interface BestSeller {
  item_id: number;
  name: string;
  price: number;
  category: string;
  total_quantity_sold: number;
  total_revenue: number;
}

interface CategoryStat {
  category: string;
  total_revenue: number;
}

interface PeakHour {
  hour: number;
  order_count: number;
}

export default function SalesReport() {
  const router = useRouter();

  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("all");
  const [overview, setOverview] = useState<SalesOverview | null>(null);
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSalesReport = async () => {
    try {
      // 1. Session verification
      const sessionRes = await fetch("/api/auth/admin/session-check");
      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated) {
        router.push("/admin/login");
        return;
      }

      setLoading(true);

      // 2. Fetch Metrics in Parallel
      const [overRes, bestRes, catRes, peakRes] = await Promise.all([
        fetch(`/api/sales/stats/overview?period=${period}`),
        fetch(`/api/sales/stats/best-sellers?period=${period}&limit=5`),
        fetch(`/api/sales/stats/by-category?period=${period}`),
        fetch(`/api/sales/stats/peak-hours?period=${period === "all" ? "week" : period}`),
      ]);

      const [overData, bestData, catData, peakData] = await Promise.all([
        overRes.json(),
        bestRes.json(),
        catRes.json(),
        peakRes.json(),
      ]);

      if (overData.success) setOverview(overData.stats);
      if (bestData.success) setBestSellers(bestData.items);
      if (catData.success) setCategoryStats(catData.categories);
      if (peakData.success) setPeakHours(peakData.peak_hours);
      
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesReport();
  }, [router, period]);

  const maxBestQuantity = bestSellers.reduce(
    (max, i) => (parseInt(String(i.total_quantity_sold)) > max ? parseInt(String(i.total_quantity_sold)) : max),
    1
  );

  const maxCatRev = categoryStats.reduce(
    (max, c) => (parseFloat(String(c.total_revenue)) > max ? parseFloat(String(c.total_revenue)) : max),
    1
  );

  const maxPeakCount = peakHours.reduce(
    (max, h) => (h.order_count > max ? h.order_count : max),
    1
  );

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="text-[var(--orange)]" />
            <span>Sales & Analytics Terminal</span>
          </h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            Analyze customer spends and menu product performance metrics
          </p>
        </div>

        {/* Period Buttons */}
        <div className="flex bg-gray-900/60 p-1 rounded-xl border border-gray-850">
          {(["today", "week", "month", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                period === p
                  ? "bg-orange-500 text-white shadow"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {p === "week" ? "7 Days" : p === "month" ? "30 Days" : p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Overview Stat Cards */}
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Revenue */}
              <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg flex-shrink-0">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Gross Revenue</p>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    ₹{parseFloat(String(overview.total_revenue)).toFixed(2)}
                  </h3>
                </div>
              </div>

              {/* Total Orders */}
              <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-lg flex-shrink-0">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Orders Count</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{overview.total_orders}</h3>
                </div>
              </div>

              {/* Average Ticket */}
              <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-450 flex items-center justify-center text-lg flex-shrink-0">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Average Order</p>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    ₹{parseFloat(String(overview.avg_order_value)).toFixed(2)}
                  </h3>
                </div>
              </div>

              {/* Total Customers */}
              <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-lg flex-shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Active Customers</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{overview.total_customers}</h3>
                </div>
              </div>
            </div>
          )}

          {/* Visual Analysis Grid */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* 1. Best Selling items bar grid */}
            <div className="glass-card-dark p-6 rounded-2xl space-y-6">
              <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 px-1">
                <TrendingUp size={16} className="text-orange-500" />
                <span>Top 5 Best-Selling Dishes</span>
              </h2>

              <div className="space-y-5">
                {bestSellers.length === 0 ? (
                  <p className="text-xs font-semibold text-gray-500 italic py-4 text-center">
                    No items sold in this period.
                  </p>
                ) : (
                  bestSellers.map((item) => (
                    <div key={item.item_id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-gray-300">{item.name}</span>
                        <span className="text-gray-500">
                          {item.total_quantity_sold} sold (₹{item.total_revenue})
                        </span>
                      </div>
                      
                      {/* Horizontal progress bar */}
                      <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-850/40">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full"
                          style={{
                            width: `${(parseInt(String(item.total_quantity_sold)) / maxBestQuantity) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Category Distribution */}
            <div className="glass-card-dark p-6 rounded-2xl space-y-6">
              <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 px-1">
                <PieChart size={16} className="text-orange-500" />
                <span>Sales Revenue by Category</span>
              </h2>

              <div className="space-y-5">
                {categoryStats.length === 0 ? (
                  <p className="text-xs font-semibold text-gray-500 italic py-4 text-center">
                    No categories registered.
                  </p>
                ) : (
                  categoryStats.map((cat, idx) => (
                    <div key={cat.category} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-gray-300">{cat.category}</span>
                        <span className="text-gray-500">₹{cat.total_revenue}</span>
                      </div>

                      {/* Horizontal progress bar */}
                      <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-850/40">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(parseFloat(String(cat.total_revenue)) / maxCatRev) * 100}%`,
                            backgroundColor: `hsl(${(idx * 60) % 360}, 75%, 55%)`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 3. Peak Hour Analysis Bar chart */}
          <div className="glass-card-dark p-6 rounded-2xl space-y-6">
            <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 px-1">
              <Clock size={16} className="text-orange-500 animate-pulse" />
              <span>Dining Peak Hour Frequency</span>
            </h2>

            {peakHours.length === 0 ? (
              <p className="text-xs font-semibold text-gray-500 italic py-8 text-center">
                No hourly dining records available.
              </p>
            ) : (
              /* Custom CSS column graph display */
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-2.5 h-40 pt-4 overflow-x-auto scrollbar-none">
                  {Array.from({ length: 24 }).map((_, hourIdx) => {
                    const found = peakHours.find((h) => h.hour === hourIdx);
                    const count = found ? found.order_count : 0;
                    const heightPercent = maxPeakCount > 0 ? (count / maxPeakCount) * 100 : 0;

                    return (
                      <div key={hourIdx} className="flex-1 flex flex-col items-center min-w-[20px] gap-2">
                        {/* Column bar */}
                        <div className="w-full flex justify-center h-28 items-end">
                          <div
                            className="w-full max-w-[14px] bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-sm shadow-inner transition-all duration-300"
                            style={{ height: `${heightPercent}%` }}
                            title={`${hourIdx}:00 - ${count} orders`}
                          />
                        </div>

                        {/* Label hour */}
                        <span className="text-[8px] font-black text-gray-600">
                          {hourIdx}h
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold px-1 pt-2 border-t border-gray-900">
                  <span>Midnight (0h)</span>
                  <span>Noon (12h)</span>
                  <span>Night (23h)</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
