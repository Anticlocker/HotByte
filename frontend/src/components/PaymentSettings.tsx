"use client"
import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Upload, Trash2, Eye, EyeOff, QrCode, Store, Smartphone, AlertCircle, FileText } from "lucide-react"
import { useNotification } from "@/context/NotificationContext"
import { logger } from "@/lib/utils/logger"
import ImageUpload from "@/components/ImageUpload"

interface PaymentSettings {
  merchantName: string;
  upiId: string;
  paymentQrUrl: string;
  paymentInstructions: string;
}

export default function PaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>({
    merchantName: "",
    upiId: "",
    paymentQrUrl: "",
    paymentInstructions: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showQrPreview, setShowQrPreview] = useState(false);
  const notif = useNotification();

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/payment-settings");
      const data = await res.json();
      if (data.success) {
        setSettings({
          merchantName: data.merchantName || "",
          upiId: data.upiId || "",
          paymentQrUrl: data.paymentQrUrl || "",
          paymentInstructions: data.paymentInstructions || ""
        });
      }
    } catch (err) {
      logger.error("Failed to load payment settings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const getCsrfToken = () => 
    document.cookie.split('; ').find(r => r.startsWith('csrfToken='))?.split('=')[1];

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payment-settings", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken() || ""
        },
        body: JSON.stringify({
          merchantName: settings.merchantName,
          upiId: settings.upiId,
          paymentInstructions: settings.paymentInstructions
        })
      });
      const data = await res.json();
      if (data.success) {
        notif.success("Saved", "Payment settings updated.");
      } else {
        notif.error("Error", data.message || "Failed to save.");
      }
    } catch (err) {
      notif.error("Error", "Connection error.");
    } finally {
      setSaving(false);
    }
  };

  const handleQrFileSelect = async (file: File | null) => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("qrImage", file);
      const res = await fetch("/api/admin/payment-settings/qr-upload", {
        method: "POST",
        headers: { "x-csrf-token": getCsrfToken() || "" },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setSettings(prev => ({ ...prev, paymentQrUrl: data.qrUrl }));
        notif.success("Uploaded", "QR code uploaded successfully.");
      } else {
        notif.error("Upload Failed", data.message || "An error occurred.");
      }
    } catch (err) {
      notif.error("Upload Error", "Connection error.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteQr = async () => {
    const { isConfirmed } = await notif.confirm("Delete QR Code?", "Customers will no longer be able to pay via QR until a new one is uploaded.");
    if (!isConfirmed) return;

    try {
      const res = await fetch("/api/admin/payment-settings/qr", { 
        method: "DELETE",
        headers: { "x-csrf-token": getCsrfToken() || "" }
      });
      const data = await res.json();
      if (data.success) {
        setSettings(prev => ({ ...prev, paymentQrUrl: "" }));
        notif.success("Deleted", "QR code removed.");
      } else {
        notif.error("Delete Failed", data.message || "An error occurred.");
      }
    } catch (err) {
      notif.error("Delete Error", "Connection error.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-48" />
        <div className="h-10 bg-gray-800 rounded w-full" />
        <div className="h-10 bg-gray-800 rounded w-full" />
        <div className="h-32 bg-gray-800 rounded w-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <QrCode size={18} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-black text-white">Payment Settings</h3>
          <p className="text-[10px] text-gray-500 font-semibold">Configure your hotel&apos;s direct payment QR code</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Form fields */}
        <div className="lg:col-span-2 space-y-5">
          {/* Merchant Name */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
              <Store size={12} />
              Merchant Name
            </label>
            <input
              type="text"
              value={settings.merchantName}
              onChange={(e) => setSettings(prev => ({ ...prev, merchantName: e.target.value }))}
              placeholder="e.g. The Grand Kitchen"
              className="w-full px-4 py-2.5 bg-white/5 border border-gray-800 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
            />
          </div>

          {/* UPI ID */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
              <Smartphone size={12} />
              UPI ID
            </label>
            <input
              type="text"
              value={settings.upiId}
              onChange={(e) => setSettings(prev => ({ ...prev, upiId: e.target.value }))}
              placeholder="e.g. grandkitchen@upi"
              className="w-full px-4 py-2.5 bg-white/5 border border-gray-800 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
            />
          </div>

          {/* Payment Instructions */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">
              <FileText size={12} />
              Payment Instructions (Optional)
            </label>
            <textarea
              value={settings.paymentInstructions}
              onChange={(e) => setSettings(prev => ({ ...prev, paymentInstructions: e.target.value }))}
              placeholder="e.g. Please send the exact bill amount and share the screenshot below."
              rows={3}
              className="w-full px-4 py-2.5 bg-white/5 border border-gray-800 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 transition-colors resize-none"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-300 disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Right: QR Upload */}
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Payment QR Code</label>

          {settings.paymentQrUrl ? (
            <div className="space-y-3">
              <div className="relative bg-white/[0.03] border border-gray-800/60 rounded-2xl p-4 flex items-center justify-center">
                <img
                  src={settings.paymentQrUrl}
                  alt="Payment QR"
                  className="w-full max-w-[200px] h-auto rounded-xl"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowQrPreview(!showQrPreview)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/5 border border-gray-700 hover:bg-white/10 text-gray-300 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer"
                >
                  {showQrPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showQrPreview ? "Hide Preview" : "Preview"}
                </button>
                <button
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/jpeg,image/jpg,image/png,image/webp";
                    input.onchange = (e: any) => {
                      const f = e.target?.files?.[0];
                      if (f) handleQrFileSelect(f);
                    };
                    input.click();
                  }}
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer"
                >
                  <Upload size={12} />
                  Replace
                </button>
                <button
                  onClick={handleDeleteQr}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {showQrPreview && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/[0.03] border border-gray-800/60 rounded-xl p-4"
                >
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Customer View</p>
                  <div className="bg-white rounded-xl p-3 flex flex-col items-center gap-2 max-w-[160px] mx-auto">
                    <img src={settings.paymentQrUrl} alt="QR" className="w-24 h-24" />
                    {settings.merchantName && (
                      <p className="text-[10px] font-bold text-gray-900 text-center">{settings.merchantName}</p>
                    )}
                    {settings.upiId && (
                      <p className="text-[8px] text-gray-500 font-semibold">{settings.upiId}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-dashed border-gray-700 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-800/60 flex items-center justify-center">
                <QrCode size={20} className="text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold">No QR Code Uploaded</p>
                <p className="text-[9px] text-gray-600 mt-1">Customers will see &quot;Online payment unavailable&quot;</p>
              </div>
              <button
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/jpeg,image/jpg,image/png,image/webp";
                  input.onchange = (e: any) => {
                    const f = e.target?.files?.[0];
                    if (f) {
                      if (f.size > 200 * 1024) {
                        notif.error("File Too Large", "Image size exceeds 200 KB. Please upload a smaller image.");
                        return;
                      }
                      if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(f.type)) {
                        notif.error("Invalid File", "Only JPG, JPEG, PNG and WEBP images are allowed.");
                        return;
                      }
                      handleQrFileSelect(f);
                    }
                  };
                  input.click();
                }}
                disabled={uploading}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 disabled:opacity-50 cursor-pointer"
              >
                <Upload size={12} />
                {uploading ? "Uploading..." : "Upload QR Code"}
              </button>
            </div>
          )}

          {/* Info box */}
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertCircle size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-[9px] text-amber-400/80 font-semibold leading-relaxed">
                Upload a UPI QR code image so customers can scan and pay directly to your account. Supported formats: JPEG, PNG, WebP. Maximum image size: 200 KB.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
