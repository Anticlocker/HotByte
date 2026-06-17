"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminSession } from "@/context/AdminSessionContext";
import { useNotification } from "@/context/NotificationContext";
import { logger } from "@/lib/utils/logger";
import Swal from "sweetalert2";
import {
  Plus, QrCode, Download, Trash2, Edit3, Power, PowerOff,
  Printer, RefreshCw, Table2, Search, X
} from "lucide-react";

interface RestaurantTable {
  id: number;
  hotel_id: number;
  table_number: string;
  table_name: string | null;
  capacity: number | null;
  qr_slug: string;
  is_active: boolean;
  created_at: string;
}

export default function TableManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { admin } = useAdminSession();
  const hotelSlug = searchParams?.get("hotel") || (admin as any)?.hotelSlug || "";

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [formData, setFormData] = useState({ table_number: "", table_name: "", capacity: "" });
  const [qrPreview, setQrPreview] = useState<{ id: number; table_number: string; svg: string } | null>(null);
  const qrModalRef = useRef<HTMLDivElement>(null);

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/admin/tables");
      const data = await res.json();
      if (data.success) setTables(data.tables);
    } catch (err) {
      logger.error("Failed to fetch tables", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) fetchTables();
  }, [admin]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ table_number: "", table_name: "", capacity: "" });
    setShowModal(true);
  };

  const openEdit = (table: RestaurantTable) => {
    setEditing(table);
    setFormData({
      table_number: table.table_number,
      table_name: table.table_name || "",
      capacity: table.capacity?.toString() || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.table_number.trim()) {
      Swal.fire("Error", "Table number is required", "error");
      return;
    }

    const payload: any = { ...formData, table_number: formData.table_number.trim() };
    if (payload.table_name === "") payload.table_name = null;
    if (payload.capacity === "") payload.capacity = null;

    try {
      const url = editing
        ? `/api/admin/tables/${editing.id}`
        : "/api/admin/tables";
      const method = editing ? "PUT" : "POST";

      const getCsrfToken = () => {
        if (typeof document === "undefined") return "";
        const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : "";
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({ icon: "success", title: editing ? "Updated!" : "Created!", timer: 1000, showConfirmButton: false });
        setShowModal(false);
        fetchTables();
      } else {
        Swal.fire("Error", data.message || "Something went wrong", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Network error", "error");
    }
  };

  const handleDelete = async (table: RestaurantTable) => {
    const result = await Swal.fire({
      title: `Delete Table ${table.table_number}?`,
      text: `Table Name: ${table.table_name || "N/A"}. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, Delete",
    });

    if (!result.isConfirmed) return;

    try {
      const getCsrfToken = () => {
        if (typeof document === "undefined") return "";
        const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : "";
      };
      const res = await fetch(`/api/admin/tables/${table.id}`, { method: "DELETE", headers: { "x-csrf-token": getCsrfToken() || "" } });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: "success", title: "Deleted!", timer: 1000, showConfirmButton: false });
        fetchTables();
      } else {
        Swal.fire("Error", data.message, "error");
      }
    } catch (err) {
      Swal.fire("Error", "Network error", "error");
    }
  };

  const handleToggleActive = async (table: RestaurantTable) => {
    try {
      const getCsrfToken = () => {
        if (typeof document === "undefined") return "";
        const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : "";
      };
      const res = await fetch(`/api/admin/tables/${table.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({ is_active: !table.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: "success", title: table.is_active ? "Disabled!" : "Enabled!", timer: 800, showConfirmButton: false });
        fetchTables();
      }
    } catch (err) {
      Swal.fire("Error", "Network error", "error");
    }
  };

  const handleRegenerateQr = async (table: RestaurantTable) => {
    const result = await Swal.fire({
      title: "Regenerate QR?",
      text: "Existing QR codes for this table will stop working. Continue?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#FF5A1F",
      confirmButtonText: "Yes, Regenerate",
    });

    if (!result.isConfirmed) return;

    try {
      const getCsrfToken = () => {
        if (typeof document === "undefined") return "";
        const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : "";
      };
      const res = await fetch(`/api/admin/tables/${table.id}/regenerate-qr`, { method: "POST", headers: { "x-csrf-token": getCsrfToken() || "" } });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ icon: "success", title: "QR Regenerated!", timer: 1000, showConfirmButton: false });
        fetchTables();
      }
    } catch (err) {
      Swal.fire("Error", "Network error", "error");
    }
  };

  const showQrPreview = async (table: RestaurantTable) => {
    setQrPreview({ id: table.id, table_number: table.table_number, svg: "" });
    try {
      const res = await fetch(`/api/admin/tables/${table.id}/qr-image?size=400`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setQrPreview({ id: table.id, table_number: table.table_number, svg: url });
    } catch (err) {
      Swal.fire("Error", "Failed to generate QR", "error");
      setQrPreview(null);
    }
  };

  const downloadPng = async (table: RestaurantTable) => {
    try {
      const res = await fetch(`/api/admin/tables/${table.id}/qr-image?size=600`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `table-${table.table_number}-qr.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      Swal.fire("Error", "Failed to download QR", "error");
    }
  };

  const downloadAllPdf = async () => {
    Swal.fire({
      title: "Generating PDF...",
      text: "Please wait while we generate QR codes for all tables.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await fetch("/api/admin/tables/qr-pdf");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `all-tables-qr.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      Swal.close();
    } catch (err) {
      Swal.close();
      Swal.fire("Error", "Failed to generate PDF", "error");
    }
  };

  const printQr = (table: RestaurantTable) => {
    const w = window.open("", "_blank", "width=400,height=500");
    if (!w) return;
    w.document.write(`
      <html><head><title>Table ${table.table_number} QR</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; font-family:sans-serif; }
        img { max-width:300px; }
        h2 { margin:10px 0 5px; }
        p { color:#666; font-size:12px; margin:0; }
        @media print { body { margin:0; } }
      </style></head><body>
      <img src="/api/admin/tables/${table.id}/qr-image?size=400" />
      <h2>Table ${table.table_number}</h2>
      <p>${table.table_name || ""}</p>
      <script>window.onload=function(){window.print();}</script>
      </body></html>
    `);
    w.document.close();
  };

  const filteredTables = tables.filter(
    (t) =>
      t.table_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.table_name && t.table_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 lg:p-10 space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Table2 className="text-orange-500" size={28} />
            Table Management
          </h1>
          <p className="text-xs font-semibold text-gray-500 mt-1">
            Create &amp; manage QR codes for every table in your restaurant
          </p>
        </div>
        <div className="flex items-center gap-3">
          {tables.length > 0 && (
            <button
              onClick={downloadAllPdf}
              className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest bg-gray-900 text-gray-300 hover:text-white border border-gray-800 rounded-xl transition-all hover:bg-gray-800 cursor-pointer flex items-center gap-2"
            >
              <Download size={14} />
              Download All PDF
            </button>
          )}
          <button
            onClick={openCreate}
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 cursor-pointer flex items-center gap-2"
          >
            <Plus size={16} />
            Create Table
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search tables..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 text-white text-xs font-semibold rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-gray-600"
        />
      </div>

      {/* Table Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="text-center py-20">
          <Table2 size={48} className="mx-auto text-gray-700 mb-4" />
          <p className="text-sm font-bold text-gray-500">
            {searchTerm ? "No tables match your search." : "No tables created yet."}
          </p>
          {!searchTerm && (
            <button onClick={openCreate} className="mt-4 text-xs font-bold text-orange-500 hover:underline cursor-pointer">
              Create your first table
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className={`relative bg-gray-900/60 border rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/5 ${
                table.is_active ? "border-gray-800" : "border-gray-800/40 opacity-60"
              }`}
            >
              {/* Table Number Badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black ${
                    table.is_active
                      ? "bg-orange-500/10 text-orange-500"
                      : "bg-gray-800 text-gray-500"
                  }`}>
                    <Table2 size={16} />
                  </div>
                  <div>
                    <span className="text-base font-black text-white">
                      Table {table.table_number}
                    </span>
                    {table.table_name && (
                      <p className="text-[10px] font-semibold text-gray-500 -mt-0.5">{table.table_name}</p>
                    )}
                  </div>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  table.is_active
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}>
                  {table.is_active ? "Active" : "Disabled"}
                </span>
              </div>

              {/* Capacity */}
              <div className="text-[10px] font-semibold text-gray-500 mb-4">
                {table.capacity ? `Capacity: ${table.capacity} guests` : "No capacity set"}
              </div>

              {/* QR Preview */}
              <div className="mb-4">
                <button
                  onClick={() => showQrPreview(table)}
                  className="w-full py-2.5 bg-gray-800/50 border border-dashed border-gray-700 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 hover:text-orange-500 hover:border-orange-500/30 transition-all cursor-pointer"
                >
                  <QrCode size={16} />
                  Preview QR Code
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openEdit(table)}
                  className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Edit3 size={12} />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(table)}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    table.is_active
                      ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
                      : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  {table.is_active ? <PowerOff size={12} /> : <Power size={12} />}
                  {table.is_active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => handleRegenerateQr(table)}
                  className="p-2 text-gray-500 hover:text-orange-400 rounded-lg hover:bg-gray-800 transition-all cursor-pointer"
                  title="Regenerate QR"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => downloadPng(table)}
                  className="p-2 text-gray-500 hover:text-blue-400 rounded-lg hover:bg-gray-800 transition-all cursor-pointer"
                  title="Download PNG"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => printQr(table)}
                  className="p-2 text-gray-500 hover:text-purple-400 rounded-lg hover:bg-gray-800 transition-all cursor-pointer"
                  title="Print QR"
                >
                  <Printer size={14} />
                </button>
                <button
                  onClick={() => handleDelete(table)}
                  className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800 transition-all cursor-pointer"
                  title="Delete Table"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-white">
                {editing ? "Edit Table" : "Create Table"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">
                  Table Number *
                </label>
                <input
                  type="text"
                  value={formData.table_number}
                  onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                  placeholder="e.g. 1, 2, VIP, Family"
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">
                  Table Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.table_name}
                  onChange={(e) => setFormData({ ...formData, table_name: e.target.value })}
                  placeholder="e.g. Window Seat, VIP Corner"
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">
                  Capacity (Optional)
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="e.g. 4"
                  min="1"
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all cursor-pointer"
              >
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Preview Modal */}
      {qrPreview && (
        <div
          ref={qrModalRef}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setQrPreview(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-white">Table {qrPreview.table_number}</h2>
              <button onClick={() => setQrPreview(null)} className="text-gray-500 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            {qrPreview.svg ? (
              <img src={qrPreview.svg} alt={`Table ${qrPreview.table_number} QR`} className="w-64 h-64 rounded-xl" />
            ) : (
              <div className="w-64 h-64 bg-gray-800 rounded-xl flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <p className="text-[10px] font-bold text-gray-500 mt-4 text-center">
              Scan to open menu for Table {qrPreview.table_number}
            </p>
            <div className="flex gap-2 mt-4 w-full">
              <button
                onClick={() => {
                  const t = tables.find((t) => t.id === qrPreview.id);
                  if (t) downloadPng(t);
                }}
                className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download size={12} />
                Download PNG
              </button>
              <button
                onClick={() => {
                  const t = tables.find((t) => t.id === qrPreview.id);
                  if (t) printQr(t);
                }}
                className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer size={12} />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
