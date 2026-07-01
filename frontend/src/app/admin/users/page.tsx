"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  ChevronRight,
  ShoppingBag,
  DollarSign,
  Calendar,
  Gift,
} from "lucide-react";
import { logger } from "@/lib/utils/logger";

interface CustomerLog {
  customer_id: number;
  name: string;
  phone: string;
  dob?: string;
  joined_date: string;
  total_orders: string;
  total_spent: string;
  last_order_date?: string;
}

export default function CustomerDirectory() {
  const router = useRouter();

  const [users, setUsers] = useState<CustomerLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsersDirectory = async () => {
    try {
      // 1. Session verification
      const sessionRes = await fetch("/api/auth/admin/session-check");
      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated) {
        router.push("/admin/login");
        return;
      }

      // 2. Fetch users logs
      const res = await fetch("/api/admin/users");
      const data = await res.json();

      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersDirectory();
  }, [router]);

  // Filter users by search
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      (u.dob && u.dob.includes(q))
    );
  });

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="text-[var(--orange)]" />
            <span>Customer Logs Directory</span>
          </h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            Browse registered diners and transaction histories
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-3.5 text-gray-500" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer log..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs font-semibold text-gray-200 placeholder-gray-600 focus:border-orange-500 outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-20 text-center rounded-3xl bg-[#121212]/20 border border-dashed border-gray-800 text-gray-500 text-xs font-semibold max-w-md mx-auto">
          No matching customers found.
        </div>
      ) : (
        /* Customer List Table */
        <div className="glass-card-dark rounded-2xl overflow-hidden border border-gray-850">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-850 bg-gray-900/30 text-gray-500 uppercase tracking-widest font-black">
                  <th className="p-4 pl-6">Guest Profile</th>
                  <th className="p-4">Contact Phone</th>
                  <th className="p-4">Date of Birth</th>
                  <th className="p-4">Total Spends</th>
                  <th className="p-4">Orders Placed</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 pr-6 text-right">View Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850/60 font-semibold text-gray-300">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.customer_id}
                    onClick={() => router.push(`/admin/report/${user.customer_id}`)}
                    className="hover:bg-gray-900/20 cursor-pointer group"
                  >
                    {/* Guest profile */}
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 text-[var(--orange)] flex items-center justify-center font-black text-xs">
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-extrabold text-sm text-white group-hover:text-[var(--orange)] transition-colors">
                          {user.name}
                        </span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="p-4 text-gray-400">
                      +91 {user.phone}
                    </td>

                    {/* DOB */}
                    <td className="p-4">
                      {user.dob ? (
                        <span className="inline-flex items-center gap-1 text-purple-400">
                          <Gift size={12} />
                          <span>
                            {new Date(user.dob).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-600">Not Provided</span>
                      )}
                    </td>

                    {/* Spent */}
                    <td className="p-4 text-sm font-black text-white">
                      ₹{parseFloat(user.total_spent).toFixed(2)}
                    </td>

                    {/* Orders */}
                    <td className="p-4 text-gray-400">
                      {user.total_orders} orders
                    </td>

                    {/* Joined Date */}
                    <td className="p-4 text-gray-500">
                      {new Date(user.joined_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Report action */}
                    <td className="p-4 pr-6 text-right">
                      <button className="p-1.5 bg-gray-900 hover:bg-gray-800 text-gray-500 hover:text-white rounded-lg border border-gray-850 group-hover:border-gray-700 transition-colors">
                        <ChevronRight size={14} />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
