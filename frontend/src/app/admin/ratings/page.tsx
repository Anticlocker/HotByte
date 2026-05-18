"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  Trash2,
  TrendingUp,
  MessageSquare,
  Calendar,
  ShieldCheck,
  User,
  Utensils,
} from "lucide-react";
import Swal from "sweetalert2";

interface Rating {
  rating_id: number;
  customer_id: number;
  order_id?: number;
  rating_value: number;
  review_text?: string;
  item_id?: number;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  item_name?: string;
  item_image?: string;
  item_category?: string;
}

interface RatingStats {
  totalRatings: number;
  averageRating: string;
  todayRatings: number;
  withReview: number;
}

export default function RatingsModeration() {
  const router = useRouter();

  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRatingsData = async () => {
    try {
      // 1. Session Check
      const sessionRes = await fetch("/api/auth/admin/session-check");
      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated) {
        router.push("/admin/login");
        return;
      }

      // 2. Fetch Ratings and Stats
      const res = await fetch("/api/admin/ratings");
      const data = await res.json();

      if (data.success) {
        setRatings(data.ratings);
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatingsData();
  }, [router]);

  const handleDeleteRating = async (ratingId: number) => {
    const result = await Swal.fire({
      title: "Moderate Review?",
      text: "Warning: Deleting this customer rating deletes it permanently from the public and analytics panels!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Confirm Delete",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/ratings/${ratingId}`, {
          method: "DELETE",
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire("Deleted", "Customer review has been moderated and deleted.", "success");
          fetchRatingsData();
        } else {
          Swal.fire("Failure", data.message || "Failed to moderate review.", "error");
        }
      } catch (err) {
        Swal.fire("Error", "Server offline.", "error");
      }
    }
  };

  const renderStars = (score: number) => {
    return Array.from({ length: 5 }).map((_, idx) => (
      <Star
        key={idx}
        size={12}
        className={idx < score ? "fill-yellow-450 text-yellow-450" : "text-gray-700"}
      />
    ));
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Star className="text-[var(--orange)]" />
            <span>Ratings & Reviews Moderation</span>
          </h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            Review customer dining scores and moderate text feedback
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Stats metrics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Avg rating */}
              <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center text-lg flex-shrink-0 animate-pulse">
                  <Star className="fill-yellow-500" size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Average Score</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{stats.averageRating} / 5.00</h3>
                </div>
              </div>

              {/* Total reviews */}
              <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-lg flex-shrink-0">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Total Dining Logs</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{stats.totalRatings}</h3>
                </div>
              </div>

              {/* Reviews with text */}
              <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-450 flex items-center justify-center text-lg flex-shrink-0">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">With Text Feedback</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{stats.withReview}</h3>
                </div>
              </div>

              {/* Today reviews */}
              <div className="glass-card-dark p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg flex-shrink-0">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Ratings Today</p>
                  <h3 className="text-xl font-black text-white mt-0.5">{stats.todayRatings}</h3>
                </div>
              </div>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 px-1">
              <ShieldCheck size={16} className="text-orange-500" />
              <span>Feedback Log Entries ({ratings.length})</span>
            </h2>

            {ratings.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-[#121212]/20 border border-dashed border-gray-800 text-gray-500 text-xs font-semibold max-w-md mx-auto">
                No reviews logged yet.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {ratings.map((rate) => (
                  <div
                    key={rate.rating_id}
                    className="glass-card-dark p-6 rounded-2xl flex flex-col justify-between gap-5 border border-gray-850 hover:border-gray-800 transition-all shadow"
                  >
                    <div className="space-y-4">
                      {/* Customer info + Score */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-550 flex-shrink-0">
                            <User size={16} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-white leading-snug">
                              {rate.customer_name}
                            </h4>
                            <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                              +91 {rate.customer_phone}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center gap-1">
                            {renderStars(rate.rating_value)}
                          </div>
                          <span className="text-[9px] text-gray-500 font-bold uppercase">
                            {new Date(rate.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Text Feedback */}
                      {rate.review_text ? (
                        <p className="text-xs font-semibold text-gray-300 bg-gray-900/40 p-4 rounded-xl border border-gray-850 leading-relaxed italic">
                          &ldquo;{rate.review_text}&rdquo;
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-gray-600 italic">
                          No text feedback submitted.
                        </p>
                      )}
                    </div>

                    {/* Metadata Target and Deletion */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-850/60">
                      <div className="flex items-center gap-2">
                        {rate.item_name ? (
                          <>
                            <Utensils size={12} className="text-orange-500" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">
                              Item: {rate.item_name}
                            </span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={12} className="text-blue-500" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">
                              Order ID: #{rate.order_id}
                            </span>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteRating(rate.rating_id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 rounded-lg text-[10px] font-black uppercase transition-colors cursor-pointer"
                        title="Delete Review"
                      >
                        <Trash2 size={10} />
                        <span>Delete</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
