"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Building, Users, DollarSign, LogOut, 
  ShieldCheck, Globe, Phone, MapPin, RefreshCw, BarChart2,
  Snowflake, TrendingUp, ExternalLink, Crown, AlertTriangle, Clock
} from "lucide-react";
import Swal from "sweetalert2";

interface Hotel {
  id: number;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  createdAt: string;
  managerCount: number;
  itemCount: number;
  orderCount: number;
  totalRevenue: number;
  isFrozen: boolean;
  plan: 'trial' | 'basic' | 'pro';
  trialEndsAt: string | null;
  tableCount: number;
}

interface AdminManager {
  id: number;
  name: string | null;
  username: string;
  email: string | null;
  role: string;
  createdAt: string;
  hotelId: number | null;
  hotelName: string;
  hotelSlug: string | null;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [managers, setManagers] = useState<AdminManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"hotels" | "managers">("hotels");

  // Editing states
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [editingManager, setEditingManager] = useState<AdminManager | null>(null);

  // Hotel creation form state
  const [hotelName, setHotelName] = useState("");
  const [hotelSlug, setHotelSlug] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelFrozen, setHotelFrozen] = useState(false);
  const [hotelPlan, setHotelPlan] = useState<'trial' | 'basic' | 'pro'>('trial');
  const [hotelTableCount, setHotelTableCount] = useState("5");

  // Manager creation form state
  const [managerName, setManagerName] = useState("");
  const [managerUsername, setManagerUsername] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [selectedHotelId, setSelectedHotelId] = useState("");

  const startEditHotel = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setHotelName(hotel.name);
    setHotelSlug(hotel.slug);
    setHotelPhone(hotel.phone || "");
    setHotelAddress(hotel.address || "");
    setHotelFrozen(hotel.isFrozen || false);
    setHotelPlan(hotel.plan || 'trial');
    setHotelTableCount(String(hotel.tableCount || 5));
  };

  const cancelEditHotel = () => {
    setEditingHotel(null);
    setHotelName("");
    setHotelSlug("");
    setHotelPhone("");
    setHotelAddress("");
    setHotelFrozen(false);
    setHotelPlan('trial');
    setHotelTableCount("5");
  };

  // ── Plan helpers ──────────────────────────────────────────────────
  const getPlanBadge = (plan: string) => {
    if (plan === 'pro') return { label: 'Pro', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-400' };
    if (plan === 'basic') return { label: 'Basic', cls: 'bg-blue-500/15 border-blue-500/30 text-blue-400' };
    return { label: 'Trial', cls: 'bg-gray-700/60 border-gray-600/40 text-gray-400' };
  };

  const getTrialDaysLeft = (trialEndsAt: string | null, plan: string) => {
    if (plan !== 'trial' || !trialEndsAt) return null;
    // eslint-disable-next-line react-hooks/purity
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const startEditManager = (manager: AdminManager) => {
    setEditingManager(manager);
    setManagerName(manager.name || "");
    setManagerUsername(manager.username);
    setManagerEmail(manager.email || "");
    setManagerPassword(""); // security
    setSelectedHotelId(manager.hotelId ? manager.hotelId.toString() : "");
  };

  const cancelEditManager = () => {
    setEditingManager(null);
    setManagerName("");
    setManagerUsername("");
    setManagerEmail("");
    setManagerPassword("");
    setSelectedHotelId("");
  };

  const handleToggleFreeze = async (hotel: Hotel) => {
    const actionText = hotel.isFrozen ? "unfreeze" : "freeze";
    const confirm = await Swal.fire({
      title: `${hotel.isFrozen ? "Unfreeze" : "Freeze"} Hotel Account?`,
      text: `Are you sure you want to ${actionText} "${hotel.name}"? This will immediately ${hotel.isFrozen ? "reactivate" : "suspend"} access for customers and managers.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: hotel.isFrozen ? "#10B981" : "#EF4444",
      cancelButtonColor: "#1f1f1f",
      confirmButtonText: `Yes, ${hotel.isFrozen ? "Unfreeze" : "Freeze"}`
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/superadmin/hotels/${hotel.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: hotel.name,
            slug: hotel.slug,
            phone: hotel.phone,
            address: hotel.address,
            isFrozen: !hotel.isFrozen
          })
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire({
            title: hotel.isFrozen ? "Unfrozen!" : "Frozen!",
            text: `Hotel "${hotel.name}" account status was updated successfully.`,
            icon: "success",
            timer: 1500,
            showConfirmButton: false
          });
          checkSessionAndFetch();
          
          if (editingHotel?.id === hotel.id) {
            setHotelFrozen(!hotel.isFrozen);
          }
        } else {
          Swal.fire("Update Failed", data.message || "An error occurred.", "error");
        }
      } catch (err) {
        Swal.fire("Connection Error", "Could not reach platform API.", "error");
      }
    }
  };

  const handleDeleteHotel = async (hotel: Hotel) => {
    const confirm = await Swal.fire({
      title: "Delete Hotel Tenant?",
      html: `Are you sure you want to permanently delete <strong>${hotel.name}</strong>?<br/><br/><span style="color: #ef4444; font-size: 11px; font-weight: bold;">WARNING: This will permanently delete all associated menu items, categories, and active orders!</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#1f1f1f",
      confirmButtonText: "Yes, Delete It",
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/superadmin/hotels/${hotel.id}`, {
          method: "DELETE",
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire("Deleted!", data.message || "Hotel deleted successfully.", "success");
          if (editingHotel?.id === hotel.id) cancelEditHotel();
          checkSessionAndFetch();
        } else {
          Swal.fire("Failed", data.message || "Could not delete hotel.", "error");
        }
      } catch (err) {
        Swal.fire("Connection Error", "Could not reach platform API.", "error");
      }
    }
  };

  const handleDeleteManager = async (manager: AdminManager) => {
    const confirm = await Swal.fire({
      title: "Delete Manager Profile?",
      text: `Are you sure you want to permanently delete manager "${manager.username}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#1f1f1f",
      confirmButtonText: "Yes, Delete It",
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/superadmin/admins/${manager.id}`, {
          method: "DELETE",
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire("Deleted!", data.message || "Manager deleted successfully.", "success");
          if (editingManager?.id === manager.id) cancelEditManager();
          checkSessionAndFetch();
        } else {
          Swal.fire("Failed", data.message || "Could not delete manager.", "error");
        }
      } catch (err) {
        Swal.fire("Connection Error", "Could not reach platform API.", "error");
      }
    }
  };

  const checkSessionAndFetch = async () => {
    try {
      const res = await fetch("/api/auth/admin/session-check");
      const session = await res.json();
      if (!session.authenticated || session.admin.role !== "super_admin") {
        router.push("/super-admin/login");
        return;
      }
      
      // Fetch hotels and managers in parallel
      const [hotelsRes, adminsRes] = await Promise.all([
        fetch("/api/superadmin/hotels"),
        fetch("/api/superadmin/admins")
      ]);
      
      const hotelsData = await hotelsRes.json();
      const adminsData = await adminsRes.json();
      
      if (hotelsData.success) setHotels(hotelsData.hotels);
      if (adminsData.success) setManagers(adminsData.admins);
    } catch (err) {
      console.error("Fetch stats error:", err);
      Swal.fire("Fetch Error", "Failed to retrieve network analytics.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSessionAndFetch();
  }, [router]);

  const handleLogout = async () => {
    const confirm = await Swal.fire({
      title: "Logout session?",
      text: "You will need to sign in again to access SaaS operations.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#e5a50a",
      cancelButtonColor: "#1f1f1f",
      confirmButtonText: "Yes, Logout",
    });

    if (confirm.isConfirmed) {
      await fetch("/api/auth/admin/logout", { method: "POST" });
      router.push("/super-admin/login");
    }
  };

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelName.trim() || !hotelSlug.trim()) {
      Swal.fire("Required Fields", "Please supply a hotel name and dynamic slug.", "warning");
      return;
    }

    try {
      const url = editingHotel 
        ? `/api/superadmin/hotels/${editingHotel.id}`
        : "/api/superadmin/hotels";
      const method = editingHotel ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hotelName,
          slug: hotelSlug,
          phone: hotelPhone,
          address: hotelAddress,
          isFrozen: hotelFrozen,
          plan: hotelPlan,
          tableCount: parseInt(hotelTableCount) || 5
        })
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire(
          editingHotel ? "Updated!" : "Registered!",
          editingHotel ? `Hotel "${hotelName}" details were updated.` : `Hotel "${hotelName}" is now active on the ${hotelPlan} plan.`,
          "success"
        );
        cancelEditHotel();
        checkSessionAndFetch();
      } else {
        Swal.fire(editingHotel ? "Update Failed" : "Registration Failed", data.message || "An error occurred.", "error");
      }
    } catch (err) {
      Swal.fire("Connection Error", "Could not reach platform API.", "error");
    }
  };

  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerUsername.trim() || !selectedHotelId || (!editingManager && !managerPassword.trim())) {
      Swal.fire("Required Fields", "Username, password, and target hotel are required.", "warning");
      return;
    }

    try {
      const url = editingManager
        ? `/api/superadmin/admins/${editingManager.id}`
        : "/api/superadmin/admins";
      const method = editingManager ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: managerName,
          username: managerUsername,
          email: managerEmail,
          password: managerPassword,
          hotelId: parseInt(selectedHotelId)
        })
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire(
          editingManager ? "Updated!" : "Assigned!",
          editingManager ? `Manager account "${managerUsername}" details were updated.` : `Manager account "${managerUsername}" has been configured.`,
          "success"
        );
        cancelEditManager();
        checkSessionAndFetch();
      } else {
        Swal.fire(editingManager ? "Update Failed" : "Creation Failed", data.message || "An error occurred.", "error");
      }
    } catch (err) {
      Swal.fire("Connection Error", "Could not reach platform API.", "error");
    }
  };

  // Helper stats
  const totalRevenue = hotels.reduce((acc, h) => acc + h.totalRevenue, 0);
  const totalOrders = hotels.reduce((acc, h) => acc + h.orderCount, 0);
  const totalItems = hotels.reduce((acc, h) => acc + h.itemCount, 0);
  const activeHotels = hotels.filter(h => !h.isFrozen).length;
  const frozenHotels = hotels.filter(h => h.isFrozen).length;
  const expiringTrials = hotels.filter(h => {
    const days = getTrialDaysLeft(h.trialEndsAt, h.plan);
    return days !== null && days <= 3 && days >= 0;
  }).length;
  const avgRevenue = hotels.length > 0 ? totalRevenue / hotels.length : 0;

  if (loading) {
    return (
      <div className="bg-[#0A0A0A] min-h-screen text-white flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Loading SaaS Control Center...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0A0A] min-h-screen text-white flex flex-col font-sans">
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 right-0 w-[400px] aspect-square rounded-full bg-yellow-500/5 filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] aspect-square rounded-full bg-amber-500/5 filter blur-[100px] pointer-events-none"></div>

      {/* Header Dashboard Nav */}
      <header className="border-b border-gray-900 bg-[#0c0c0c]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr from-yellow-500 to-amber-600 shadow-lg shadow-yellow-500/10">
              <i className="fas fa-fire text-sm"></i>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-tighter">
                Hot<span className="text-yellow-500">Byte</span>
              </span>
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                SaaS Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-full text-yellow-500 text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck size={12} />
              <span>Super Admin Access</span>
            </div>

            <button 
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
              title="Logout Session"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8 relative z-10">
        
        {/* Page Title & Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">SaaS Network Analytics</h1>
            <p className="text-xs text-gray-500 font-medium">Configure network tenants and assign operational managers globally.</p>
          </div>

          <button 
            onClick={() => { setLoading(true); checkSessionAndFetch(); }}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <RefreshCw size={12} className="animate-spin-slow" />
            <span>Reload Analytics</span>
          </button>
        </div>

        {/* Analytics Summary Row — 6 KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          
          {/* Card 1: Revenue */}
          <div className="glass-card-dark p-5 rounded-3xl border border-gray-900/60 flex flex-col justify-between gap-3 xl:col-span-1 col-span-1">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Network Revenue</span>
              <DollarSign size={14} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">₹{totalRevenue.toLocaleString("en-IN")}</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-yellow-500/70 mt-0.5">Avg ₹{Math.round(avgRevenue).toLocaleString("en-IN")}/hotel</p>
            </div>
          </div>

          {/* Card 2: Total Tenants */}
          <div className="glass-card-dark p-5 rounded-3xl border border-gray-900/60 flex flex-col justify-between gap-3">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Total Tenants</span>
              <Building size={14} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{hotels.length}</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mt-0.5">Onboarded Hotels</p>
            </div>
          </div>

          {/* Card 3: Active */}
          <div className="glass-card-dark p-5 rounded-3xl border border-emerald-900/30 flex flex-col justify-between gap-3">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Active</span>
              <TrendingUp size={14} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-emerald-400">{activeHotels}</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600/70 mt-0.5">Fully Operational</p>
            </div>
          </div>

          {/* Card 4: Frozen */}
          <div className="glass-card-dark p-5 rounded-3xl border border-red-900/30 flex flex-col justify-between gap-3">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Frozen</span>
              <Snowflake size={14} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-red-400">{frozenHotels}</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-red-700/70 mt-0.5">Access Suspended</p>
            </div>
          </div>

          {/* Card 5: Orders + Items */}
          <div className="glass-card-dark p-5 rounded-3xl border border-gray-900/60 flex flex-col justify-between gap-3">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Order Pipeline</span>
              <BarChart2 size={14} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{totalOrders}</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mt-0.5">{totalItems} menu items</p>
            </div>
          </div>

          {/* Card 6: Expiring Trials */}
          <div className={`glass-card-dark p-5 rounded-3xl border flex flex-col justify-between gap-3 ${
            expiringTrials > 0 ? 'border-orange-500/30 bg-orange-500/5' : 'border-gray-900/60'
          }`}>
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Trials Expiring</span>
              <AlertTriangle size={14} className={expiringTrials > 0 ? 'text-orange-400' : 'text-gray-700'} />
            </div>
            <div>
              <h3 className={`text-xl font-black ${expiringTrials > 0 ? 'text-orange-400' : 'text-gray-600'}`}>{expiringTrials}</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mt-0.5">Expiring in 3 days</p>
            </div>
          </div>
        </div>

        {/* Split Section: Management Forms & Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Operations Form Column */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Form Box */}
            <div className="glass-card-dark p-6 rounded-3xl border border-yellow-500/5 space-y-6">
              
              <div className="border-b border-gray-900 pb-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-yellow-500 flex items-center justify-between">
                  <span>
                    {activeTab === "hotels" 
                      ? (editingHotel ? "Edit Hotel Tenant" : "Register Hotel Tenant")
                      : (editingManager ? "Edit Hotel Manager" : "Create Hotel Manager")
                    }
                  </span>
                  {activeTab === "hotels" && editingHotel && (
                    <button 
                      onClick={cancelEditHotel}
                      className="text-[10px] text-gray-500 hover:text-red-500 font-bold uppercase border border-gray-800 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                  {activeTab === "managers" && editingManager && (
                    <button 
                      onClick={cancelEditManager}
                      className="text-[10px] text-gray-500 hover:text-red-500 font-bold uppercase border border-gray-800 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </h3>
                <p className="text-[10px] text-gray-500">
                  {activeTab === "hotels"
                    ? (editingHotel ? "Modify tenant parameters and network routes." : "Add credentials and launch new network nodes immediately.")
                    : (editingManager ? "Modify manager details, reassignment, and passwords safely." : "Assign a new operational admin manager to a hotel.")
                  }
                </p>
              </div>

              {activeTab === "hotels" ? (
                <form onSubmit={handleCreateHotel} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Hotel Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. PuneByte Elite"
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Dynamic URL Slug</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. punebyte-elite"
                      value={hotelSlug}
                      onChange={(e) => setHotelSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ""))}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 outline-none focus:border-yellow-500"
                    />
                  </div>

                  {/* Plan Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Subscription Plan</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['trial', 'basic', 'pro'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setHotelPlan(p)}
                          className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                            hotelPlan === p
                              ? p === 'pro' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                : p === 'basic' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                              : 'bg-gray-900 border-gray-800 text-gray-600 hover:text-gray-400'
                          }`}
                        >
                          {p === 'pro' ? '👑 ' : p === 'basic' ? '⭐ ' : '🆓 '}{p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Support Phone</label>
                      <input 
                        type="text"
                        placeholder="9876543210"
                        value={hotelPhone}
                        onChange={(e) => setHotelPhone(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 outline-none focus:border-yellow-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Table Count</label>
                      <input 
                        type="number"
                        min="1" max="100"
                        placeholder="5"
                        value={hotelTableCount}
                        onChange={(e) => setHotelTableCount(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Hotel Address</label>
                    <textarea 
                      placeholder="Enter address details"
                      value={hotelAddress}
                      onChange={(e) => setHotelAddress(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 outline-none focus:border-yellow-500 h-16 resize-none"
                    />
                  </div>

                  {editingHotel && (
                    <div className="flex items-start gap-2.5 bg-red-950/20 border border-red-500/10 rounded-xl p-3.5 mb-2">
                      <input 
                        type="checkbox"
                        id="freezeAccount"
                        checked={hotelFrozen}
                        onChange={(e) => setHotelFrozen(e.target.checked)}
                        className="w-4 h-4 rounded accent-red-500 bg-gray-900 border-gray-800 focus:ring-0 cursor-pointer mt-0.5"
                      />
                      <div className="flex flex-col">
                        <label htmlFor="freezeAccount" className="text-xs text-red-400 font-extrabold uppercase tracking-wider cursor-pointer">
                          Freeze Hotel Account
                        </label>
                        <span className="text-[10px] text-gray-500 font-semibold leading-normal">
                          Restrict administrative control and suspend public dining menu browsing.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      type="submit"
                      className="flex-1 bg-yellow-500 text-black py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors cursor-pointer"
                    >
                      {editingHotel ? "Save Changes" : "Register Tenant"}
                    </button>
                    {editingHotel && (
                      <button 
                        type="button"
                        onClick={cancelEditHotel}
                        className="bg-gray-900 hover:bg-gray-850 border border-gray-800 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreateManager} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Manager Full Name</label>
                    <input 
                      type="text"
                      placeholder="Ramesh Kumar"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Username ID</label>
                    <input 
                      type="text"
                      required
                      placeholder="ramesh"
                      value={managerUsername}
                      onChange={(e) => setManagerUsername(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Email Address</label>
                    <input 
                      type="email"
                      placeholder="ramesh@gmail.com"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
                      {editingManager ? "New Password (Optional)" : "Security Password"}
                    </label>
                    <input 
                      type="password"
                      required={!editingManager}
                      placeholder={editingManager ? "•••••••• (Leave blank to keep same)" : "••••••••"}
                      value={managerPassword}
                      onChange={(e) => setManagerPassword(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Assign to Hotel</label>
                    <select 
                      required
                      value={selectedHotelId}
                      onChange={(e) => setSelectedHotelId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 outline-none focus:border-yellow-500"
                    >
                      <option value="">Select target hotel...</option>
                      {hotels.map(h => (
                        <option key={h.id} value={h.id}>{h.name} ({h.slug})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="submit"
                      className="flex-1 bg-yellow-500 text-black py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors cursor-pointer"
                    >
                      {editingManager ? "Save Changes" : "Create & Assign"}
                    </button>
                    {editingManager && (
                      <button 
                        type="button"
                        onClick={cancelEditManager}
                        className="bg-gray-900 hover:bg-gray-850 border border-gray-800 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Tables Scoping Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tabs */}
            <div className="flex border-b border-gray-900">
              <button 
                onClick={() => setActiveTab("hotels")}
                className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === "hotels" ? "border-yellow-500 text-yellow-500" : "border-transparent text-gray-500 hover:text-gray-300"}`}
              >
                Hotels & Network Nodes ({hotels.length})
              </button>
              <button 
                onClick={() => setActiveTab("managers")}
                className={`px-6 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === "managers" ? "border-yellow-500 text-yellow-500" : "border-transparent text-gray-500 hover:text-gray-300"}`}
              >
                Platform Managers ({managers.filter(m => m.role !== 'super_admin').length})
              </button>
            </div>

            {/* Content Table Area */}
            {activeTab === "hotels" ? (
              <div className="glass-card-dark rounded-3xl border border-gray-900/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-900 bg-gray-900/20 text-gray-500 font-bold uppercase">
                        <th className="px-6 py-4">Hotel Details</th>
                        <th className="px-6 py-4">Plan & Slug</th>
                        <th className="px-6 py-4 text-center">Managers</th>
                        <th className="px-6 py-4 text-center">Menu</th>
                        <th className="px-6 py-4 text-right">Revenue</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900/40">
                      {hotels.map(h => {
                        const planBadge = getPlanBadge(h.plan || 'trial');
                        const daysLeft = getTrialDaysLeft(h.trialEndsAt, h.plan);
                        const isExpiringSoon = daysLeft !== null && daysLeft <= 3;
                        const isExpired = daysLeft !== null && daysLeft < 0;
                        const revenueShare = totalRevenue > 0 ? (h.totalRevenue / totalRevenue) * 100 : 0;
                        return (
                        <tr key={h.id} className={`hover:bg-gray-900/10 transition-colors ${
                          isExpiringSoon && !isExpired ? 'bg-orange-500/3' : ''
                        }`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-100">{h.name}</span>
                              {h.isFrozen && (
                                <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-wider rounded-lg">🥶 Frozen</span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                              <MapPin size={10} />
                              <span>{h.address || "No address listed"}</span>
                            </div>
                            {/* Revenue share bar */}
                            <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden w-24">
                              <div className="h-full bg-yellow-500/60 rounded-full" style={{ width: `${revenueShare}%` }} />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {/* Plan badge */}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border mb-1.5 ${
                              planBadge.cls
                            }`}>
                              {h.plan === 'pro' ? <Crown size={8} /> : null}
                              {planBadge.label}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-yellow-500">
                              <Globe size={10} />
                              <span>/{h.slug}</span>
                            </div>
                            {/* Trial expiry warning */}
                            {daysLeft !== null && (
                              <div className={`flex items-center gap-1 mt-1 text-[9px] font-bold ${
                                isExpired ? 'text-red-500' : isExpiringSoon ? 'text-orange-400' : 'text-gray-600'
                              }`}>
                                {isExpired ? <Snowflake size={9} /> : <Clock size={9} />}
                                <span>{isExpired ? 'Trial expired' : `${daysLeft}d trial left`}</span>
                              </div>
                            )}
                            <div className="text-[10px] text-gray-600 mt-0.5 flex items-center gap-1">
                              <Phone size={10} />
                              <span>{h.phone || "N/A"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-gray-300">{h.managerCount}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="font-bold text-gray-300">{h.itemCount}</div>
                            <div className="text-[9px] text-gray-600">{h.tableCount} tables</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="font-black text-yellow-500">₹{h.totalRevenue.toLocaleString("en-IN")}</div>
                            <div className="text-[9px] text-gray-600">{h.orderCount} orders</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center items-center gap-1 flex-wrap">
                              {/* View Hotel link */}
                              <a
                                href={`/${h.slug}/admin`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-gray-800 border border-gray-700 px-2 py-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 font-bold uppercase transition-all cursor-pointer text-[9px] flex items-center gap-1"
                                title="Open hotel admin panel"
                              >
                                <ExternalLink size={9} />
                                View
                              </a>
                              <button
                                onClick={() => startEditHotel(h)}
                                className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-xl text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold uppercase transition-all cursor-pointer text-[10px]"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleFreeze(h)}
                                className={`px-3 py-1 rounded-xl font-bold uppercase transition-all cursor-pointer text-[10px] ${
                                  h.isFrozen
                                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black"
                                    : "bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white"
                                }`}
                              >
                                {h.isFrozen ? "Unfreeze" : "Freeze"}
                              </button>
                              <button
                                onClick={() => handleDeleteHotel(h)}
                                className="bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl text-red-400 hover:bg-red-500 hover:text-white font-bold uppercase transition-all cursor-pointer text-[10px]"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}

                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="glass-card-dark rounded-3xl border border-gray-900/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-900 bg-gray-900/20 text-gray-500 font-bold uppercase">
                        <th className="px-6 py-4">Manager Profile</th>
                        <th className="px-6 py-4">Username ID</th>
                        <th className="px-6 py-4">Assigned Location</th>
                        <th className="px-6 py-4">Role Permission</th>
                        <th className="px-6 py-4 text-right">Created Date</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900/40">
                      {managers.map(m => (
                        <tr key={m.id} className="hover:bg-gray-900/10 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-100">{m.name || "N/A"}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{m.email || "No email listed"}</div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-gray-300">{m.username}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-gray-100">{m.hotelName}</div>
                            {m.hotelSlug && (
                              <div className="text-[10px] text-yellow-500 font-semibold mt-0.5 flex items-center gap-1">
                                <Globe size={10} />
                                <span>/{m.hotelSlug}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${m.role === 'super_admin' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                              {m.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-500 font-semibold">
                            {new Date(m.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {m.role !== "super_admin" ? (
                              <div className="flex justify-center items-center gap-1.5">
                                <button
                                  onClick={() => startEditManager(m)}
                                  className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-xl text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold uppercase transition-all cursor-pointer text-[10px]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteManager(m)}
                                  className="bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-xl text-red-400 hover:bg-red-500 hover:text-white font-bold uppercase transition-all cursor-pointer text-[10px]"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-600 text-[10px] uppercase font-bold">Immutable</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 bg-[#0c0c0c]/80 py-6 text-center">
        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
          &copy; 2026 HotByte SaaS Platform Controls. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
