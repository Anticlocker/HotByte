"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/i18n";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Building,
  Palette,
  Sliders,
  Lock,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  FileText,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Key,
  QrCode,
  Globe,
  Laptop,
  Smartphone,
} from "lucide-react";
import PaymentSettings from "@/components/PaymentSettings";
import Swal from "sweetalert2";
import { logger } from "@/lib/utils/logger";

interface HotelSettings {
  hotel_id: number;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  tagline: string;
  show_logo: boolean;
  show_banner: boolean;
  primary_color: string;
  secondary_color: string;
  enable_online_orders: boolean;
  enable_qr_ordering: boolean;
  is_open: boolean;
  table_count: number;
  latitude: number | null;
  longitude: number | null;
  order_radius: number;
  hotel_type: string;
}

interface AdminInfo {
  admin_id: number;
  username: string;
  name: string | null;
  email: string;
  phone: string | null;
}

interface SessionLog {
  id: number;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_activity: string;
  expires_at: string;
}

const getErrorMessage = (message: any): string => {
  if (!message) return "";
  if (typeof message === "string") return message;
  if (typeof message === "object") {
    return message.Message || message.message || message.error || JSON.stringify(message);
  }
  return String(message);
};

export default function AdminSettings() {
  const router = useRouter();
  const { t } = useTranslation();


  const [activeTab, setActiveTab] = useState<"profile" | "branding" | "operations" | "location" | "security" | "payment">("profile");
  const [hotel, setHotel] = useState<HotelSettings | null>(null);
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Location tab state
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationRadius, setLocationRadius] = useState("30");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationMapReady, setLocationMapReady] = useState(false);
  const [locationOrderingEnabled, setLocationOrderingEnabled] = useState(true);

  const mapRef = useRef<L.Map | null>(null);

  // Forms
  // Hotel form
  const [hotelName, setHotelName] = useState("");
  const [hotelDesc, setHotelDesc] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  const [hotelEmail, setHotelEmail] = useState("");

  // Branding form
  const [tagline, setTagline] = useState("");
  const [showLogo, setShowLogo] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [primaryColor, setPrimaryColor] = useState("#FF5A1F");
  const [secondaryColor, setSecondaryColor] = useState("#FF5A1F");

  // Files state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [bannerUploading, setBannerUploading] = useState(false);

  // Operational preferences
  const [enableOnline, setEnableOnline] = useState(true);
  const [enableQr, setEnableQr] = useState(true);
  const [tableCount, setTableCount] = useState(5);
  const [isOpen, setIsOpen] = useState(true);
  const [hotelType, setHotelType] = useState<"veg" | "nonveg" | "both">("both");

  // Customer Auth settings state
  const [requireCustomerAuth, setRequireCustomerAuth] = useState(false);
  const [suspiciousActivityMode, setSuspiciousActivityMode] = useState(false);
  const [authLogs, setAuthLogs] = useState<any[]>([]);
  const [authSettingsSaving, setAuthSettingsSaving] = useState(false);
  const [authLogsLoading, setAuthLogsLoading] = useState(false);

  // Account security forms
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const loadAuthLogs = async () => {
    setAuthLogsLoading(true);
    try {
      const res = await fetch("/api/admin/auth-logs");
      const data = await res.json();
      if (data.success) setAuthLogs(data.logs || []);
    } catch {}
    finally { setAuthLogsLoading(false); }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      let data;
      try {
        data = await res.json();
      } catch {
        data = { success: false, message: "Server returned an invalid response." };
      }

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (data.success) {
        setHotel(data.hotel);
        setAdmin(data.admin);
        setSessions(data.sessions);

        // Bind hotel values
        setHotelName(data.hotel.name);
        setHotelDesc(data.hotel.description || "");
        setHotelAddress(data.hotel.address || "");
        setHotelPhone(data.hotel.phone || "");
        setHotelEmail(data.hotel.email || "");

        // Bind branding
        setTagline(data.hotel.tagline || "");
        setShowLogo(data.hotel.show_logo !== false);
        setShowBanner(data.hotel.show_banner !== false);
        setPrimaryColor(data.hotel.primary_color || "#FF5A1F");
        setSecondaryColor(data.hotel.secondary_color || "#FF5A1F");
        setLogoPreview(data.hotel.logo_url || "");
        setBannerPreview(data.hotel.banner_url || "");

        // Bind operations
        setEnableOnline(data.hotel.enable_online_orders !== false);
        setEnableQr(data.hotel.enable_qr_ordering !== false);
        setTableCount(data.hotel.table_count || 5);
        setIsOpen(data.hotel.is_open !== false);
        setHotelType(data.hotel.hotel_type || "both");

        // Load auth settings separately
        fetch("/api/admin/auth-settings")
          .then(r => r.json())
          .then(d => {
            if (d.success) {
              setRequireCustomerAuth(d.requireCustomerAuth || false);
              setSuspiciousActivityMode(d.suspiciousActivityMode || false);
            }
          }).catch(() => {});

        // Bind location
        setLocationLat(data.hotel.latitude ? parseFloat(data.hotel.latitude) : null);
        setLocationLng(data.hotel.longitude ? parseFloat(data.hotel.longitude) : null);
        setLocationRadius(String(data.hotel.order_radius || 30));
        setLocationAddress(data.hotel.address || "");
        setLocationOrderingEnabled(data.hotel.location_ordering_enabled !== false);

        // Bind admin security
        if (data.admin) {
          setAdminName(data.admin.name || "");
          setAdminEmail(data.admin.email || "");
          setAdminPhone(data.admin.phone || "");
        }
      } else {
        Swal.fire(t("common.error"), getErrorMessage(data.message) || t("admin.settings.general"), "error");
      }
    } catch (err) {
      logger.error(err);
      Swal.fire(t("common.error"), "Could not connect to the settings endpoints", "error");
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    loadSettings();
    loadAuthLogs();
  }, []);

  // Handle image upload logic
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "banner") => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validation constraints check
      const maxSize = type === "logo" ? 200 * 1024 : 300 * 1024;
      if (file.size > maxSize) {
        Swal.fire(t("common.warning"), `${type === "logo" ? "Logo" : "Banner cover"} must be smaller than ${type === "logo" ? "200KB" : "300KB"}.`, "warning");
        return;
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire(t("common.warning"), "Only JPG, JPEG, PNG, or WEBP formats are supported.", "warning");
        return;
      }

      if (type === "logo") {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
      } else {
        setBannerFile(file);
        setBannerPreview(URL.createObjectURL(file));
      }
    }
  };

  const uploadAsset = async (type: "logo" | "banner") => {
    const file = type === "logo" ? logoFile : bannerFile;
    if (!file) return;

    if (type === "logo") setLogoUploading(true);
    else setBannerUploading(true);

    const formData = new FormData();
    formData.append("type", type);
    formData.append("image", file);

    try {
      const res = await fetch("/api/admin/settings/upload", {
        method: "POST",
        headers: { "x-csrf-token": getCsrfToken() || "" },
        body: formData
      });
      let data;
      try {
        data = await res.json();
      } catch {
        data = { success: false, message: "Server returned an invalid response." };
      }
      if (data.success) {
        Swal.fire({
          title: t("admin.settings.saved"),
          text: `${type === "logo" ? "Logo image" : "Banner cover"} uploaded successfully.`,
          icon: "success",
          timer: 1200,
          showConfirmButton: false
        });
        if (type === "logo") {
          setLogoFile(null);
          setLogoPreview(data.url);
        } else {
          setBannerFile(null);
          setBannerPreview(data.url);
        }
        loadSettings();
      } else {
        Swal.fire(t("common.error"), getErrorMessage(data.message) || "Failed to deliver asset to storage CDN", "error");
      }
    } catch (err) {
      logger.error(err);
      Swal.fire(t("common.error"), "Unable to complete asset upload connection.", "error");
    } finally {
      if (type === "logo") setLogoUploading(false);
      else setBannerUploading(false);
    }
  };

  const removeLocalAsset = (type: "logo" | "banner") => {
    if (type === "logo") {
      setLogoFile(null);
      setLogoPreview(hotel?.logo_url || "");
    } else {
      setBannerFile(null);
      setBannerPreview(hotel?.banner_url || "");
    }
  };

  // Submit profile details
  const getCsrfToken = () => {
    if (typeof document === "undefined") return "";
    const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
  };

  const saveHotelProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelName.trim()) {
      Swal.fire(t("common.warning"), "Hotel Name cannot be blank", "warning");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({
          name: hotelName.trim(),
          description: hotelDesc.trim() || null,
          address: hotelAddress.trim() || null,
          phone: hotelPhone.trim() || null,
          email: hotelEmail.trim() || null,
          tagline,
          show_logo: showLogo,
          show_banner: showBanner,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          enable_online_orders: enableOnline,
          enable_qr_ordering: enableQr,
          table_count: tableCount,
          is_open: isOpen,
          hotel_type: hotelType
        })
      });
      let data;
      try {
        data = await res.json();
      } catch {
        data = { success: false, message: "Server returned an invalid response." };
      }
      if (data.success) {
        Swal.fire({
          title: t("admin.settings.saved"),
          text: "Branding and profile settings loaded successfully.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
        loadSettings();
      } else {
        Swal.fire(t("common.error"), getErrorMessage(data.message) || "Failed to commit modifications", "error");
      }
    } catch (err) {
      logger.error(err);
      Swal.fire(t("common.error"), "Network connection issues", "error");
    } finally {
      setSaving(false);
    }
  };

  // Save account modifications
  const saveAccountSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim()) {
      Swal.fire(t("common.warning"), "Email details cannot be blank", "warning");
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        Swal.fire(t("common.warning"), "Please key in your current password to authorize password reset", "warning");
        return;
      }
      if (newPassword !== confirmPassword) {
        Swal.fire(t("common.warning"), "New passwords do not match", "warning");
        return;
      }
      if (newPassword.length < 6) {
        Swal.fire(t("common.warning"), "New password must be at least 6 characters", "warning");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/account", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({
          name: adminName.trim(),
          email: adminEmail.trim(),
          phone: adminPhone.trim() || null,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined
        })
      });
      let data;
      try {
        data = await res.json();
      } catch {
        data = { success: false, message: "Server returned an invalid response." };
      }
      if (data.success) {
        Swal.fire({
          title: t("admin.settings.saved"),
          text: "Admin information and security profiles updated.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        loadSettings();
      } else {
        Swal.fire(t("common.error"), getErrorMessage(data.message) || "Email/phone unique constraint conflicts", "error");
      }
    } catch (err) {
      logger.error(err);
      Swal.fire(t("common.error"), "Verification connection failure", "error");
    } finally {
      setSaving(false);
    }
  };

  // Terminate other sessions
  const terminateAllOtherDevices = async () => {
    const result = await Swal.fire({
      title: t("admin.settings.security.logoutOtherTitle"),
      text: t("admin.settings.security.logoutOtherMsg"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      confirmButtonText: t("admin.settings.security.logoutOtherBtn")
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch("/api/admin/settings/logout-devices", {
          method: "POST",
          headers: { "x-csrf-token": getCsrfToken() || "" },
        });
        let data;
        try {
          data = await res.json();
        } catch {
          data = { success: false, message: "Server returned an invalid response." };
        }
        if (data.success) {
          Swal.fire(t("admin.settings.security.loggedOut"), t("admin.settings.security.loggedOutMsg"), "success");
          loadSettings();
        } else {
          Swal.fire(t("common.error"), getErrorMessage(data.message) || "Failed to disconnect devices", "error");
        }
      } catch (err) {
        logger.error(err);
        Swal.fire(t("common.error"), "Unable to disconnect devices", "error");
      }
    }
  };

  // Save auth settings
  const saveAuthSettings = async () => {
    setAuthSettingsSaving(true);
    try {
      const res = await fetch("/api/admin/auth-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({
          requireCustomerAuth,
          suspiciousActivityMode,
          note: "Updated via Hotel Admin settings panel"
        })
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ title: t("admin.settings.saved"), text: "Authentication settings updated.", icon: "success", timer: 1500, showConfirmButton: false });
        // Reload auth logs
        loadAuthLogs();
      } else {
        Swal.fire(t("common.error"), data.message || t("admin.settings.saveFailed"), "error");
      }
    } catch { Swal.fire(t("common.error"), "Network connection issue", "error"); }
    finally { setAuthSettingsSaving(false); }
  };

  const [detectingLocation, setDetectingLocation] = useState(false);

  // Geocodes address text or parses Google Maps / OpenStreetMap URLs to extract exact coordinates
  const detectAndResolveLocation = async (inputText: string) => {
    if (!inputText.trim()) {
      Swal.fire("Address Required", "Please enter a plain address or paste a map link first.", "info");
      return;
    }

    setDetectingLocation(true);
    let coords: { lat: number; lng: number } | null = null;
    let text = inputText.trim();

    // 1. Detect if it's a URL
    const isUrl = /^(https?:\/\/[^\s]+)/i.test(text);

    if (isUrl) {
      // Resolve short URL proxy
      if (text.includes("maps.app.goo.gl") || text.includes("goo.gl/maps")) {
        try {
          const res = await fetch(`/api/geocode/resolve-short-url?url=${encodeURIComponent(text)}`);
          const data = await res.json();
          if (data.success && data.resolvedUrl) {
            text = data.resolvedUrl;
          }
        } catch (err) {
          logger.error("Failed to resolve short URL:", err);
        }
      }

      // Google Maps long URL contains coordinates in format @lat,lng
      const googleAtRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const matchAt = text.match(googleAtRegex);
      if (matchAt) {
        coords = { lat: parseFloat(matchAt[1]), lng: parseFloat(matchAt[2]) };
      } else {
        // Google Maps URL with q=lat,lng query parameters
        const googleParamRegex = /[?&](q|ll|query|cbll)=(-?\d+\.\d+),(-?\d+\.\d+)/;
        const matchParam = text.match(googleParamRegex);
        if (matchParam) {
          coords = { lat: parseFloat(matchParam[2]), lng: parseFloat(matchParam[3]) };
        } else {
          // OpenStreetMap map format map=zoom/lat/lng
          const osmMapRegex = /(map=\d+|#map=\d+)\/(-?\d+\.\d+)\/(-?\d+\.\d+)/;
          const matchOsm = text.match(osmMapRegex);
          if (matchOsm) {
            coords = { lat: parseFloat(matchOsm[2]), lng: parseFloat(matchOsm[3]) };
          } else {
            // OpenStreetMap query parameter format mlat=lat&mlon=lon
            const osmQueryRegex = /[?&]mlat=(-?\d+\.\d+)[&]mlon=(-?\d+\.\d+)/;
            const matchOsmQuery = text.match(osmQueryRegex);
            if (matchOsmQuery) {
              coords = { lat: parseFloat(matchOsmQuery[1]), lng: parseFloat(matchOsmQuery[2]) };
            }
          }
        }
      }

      if (!coords) {
        setDetectingLocation(false);
        Swal.fire("Parsing Error 📍", "Pasted link format not recognized. Please make sure to copy a full Google Maps or OpenStreetMap location link, or drag the marker manually.", "error");
        return;
      }
    } else {
      // 2. Normal address text: trigger forward geocoding request to Nominatim API
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=1`,
          { headers: { "Accept-Language": "en", "User-Agent": "HotByte-Admin/1.0" } }
        );
        const data = await res.json();
        if (data && data.length > 0) {
          coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          if (data[0].display_name) {
            setLocationAddress(data[0].display_name);
          }
        }
      } catch (err) {
        logger.error("Geocoding failed:", err);
      }

      if (!coords) {
        setDetectingLocation(false);
        Swal.fire("Geocoding Failed 📍", "We couldn't resolve this address to exact coordinates. Please check spelling, add city/country, or pin location manually.", "error");
        return;
      }
    }

    // 3. Update state
    setLocationLat(coords.lat);
    setLocationLng(coords.lng);
    setDetectingLocation(false);

    // 4. Update Leaflet map marker
    const map = mapRef.current;
    if (map) {
      map.setView([coords.lat, coords.lng], 17);
      
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });

      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:#FF5A1F;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        className: ""
      });

      const newMarker = L.marker([coords.lat, coords.lng], { draggable: true, icon }).addTo(map);
      newMarker.on("dragend", async (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        setLocationLat(lat);
        setLocationLng(lng);
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { "Accept-Language": "en", "User-Agent": "HotByte-Admin/1.0" } }
          );
          const d = await r.json();
          if (d.display_name) setLocationAddress(d.display_name);
        } catch {}
      });

      map.invalidateSize();
    }

    // 5. Success prompt
    Swal.fire({
      title: "Location detected successfully! 📍",
      icon: "success",
      toast: true,
      position: "top-end",
      timer: 3000,
      showConfirmButton: false
    });
  };

  // Save hotel location
  const saveLocationSettings = async () => {
    if (locationLat === null || locationLng === null) {
      Swal.fire("Location Required 📍", "Please pin your exact GPS location on the map or enter/paste a valid address before saving.", "warning");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/location", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({
          latitude: locationLat,
          longitude: locationLng,
          orderRadius: parseInt(locationRadius) || 30,
          address: locationAddress || undefined
        })
      });
      let data;
      try { data = await res.json(); } catch { data = { success: false }; }
      if (data.success) {
        Swal.fire({ title: "Location Saved!", text: "Hotel GPS coordinates updated.", icon: "success", timer: 1400, showConfirmButton: false });
        loadSettings();
      } else {
        Swal.fire("Error", getErrorMessage(data.message) || "Failed to save location", "error");
      }
    } catch { Swal.fire("Error", "Network connection issue", "error"); }
    finally { setSaving(false); }
  };

  // Save location-based ordering settings
  const saveLocationOrderingSetting = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/location-ordering", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({
          locationOrderingEnabled
        })
      });
      let data;
      try { data = await res.json(); } catch { data = { success: false }; }
      if (data.success) {
        Swal.fire({
          title: t("admin.settings.saved", "Settings Saved!"),
          text: "Location-based ordering preferences updated successfully.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false
        });
        loadSettings();
      } else {
        Swal.fire(t("common.error", "Error"), getErrorMessage(data.message) || "Failed to save location ordering settings", "error");
      }
    } catch {
      Swal.fire(t("common.error", "Error"), "Network connection issue", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Leaflet map for location tab ─────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "location") {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setLocationMapReady(false);
      }
      return;
    }

    const mapContainerId = "admin-location-map";

    const reverseGeocode = async (lat: number, lng: number) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
          headers: { "Accept-Language": "en", "User-Agent": "HotByte-Admin/1.0" }
        });
        const data = await res.json();
        if (data.display_name) setLocationAddress(data.display_name);
      } catch {}
    };

    let retryCount = 0;
    const initMap = () => {
      const container = document.getElementById(mapContainerId);
      if (!container) {
        if (retryCount < 10) {
          retryCount++;
          setTimeout(initMap, 100);
        }
        return;
      }

      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (_) {}
        mapRef.current = null;
      }

      const defaultLat = locationLat || 20.5937;
      const defaultLng = locationLng || 78.9629;
      const zoom = locationLat ? 17 : 5;

      const map = L.map(mapContainerId).setView([defaultLat, defaultLng], zoom);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:#FF5A1F;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </div>`,
        iconSize: [28, 28], iconAnchor: [14, 14], className: ""
      });

      let marker: L.Marker | null = null;
      if (locationLat && locationLng) {
        marker = L.marker([locationLat, locationLng], { draggable: true, icon }).addTo(map);
        marker.on("dragend", (e: any) => {
          const { lat, lng } = (e.target as L.Marker).getLatLng();
          setLocationLat(lat); setLocationLng(lng);
          reverseGeocode(lat, lng);
        });
      }

      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        setLocationLat(lat); setLocationLng(lng);
        if (marker) marker.setLatLng([lat, lng]);
        else {
          marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
          marker.on("dragend", (ev: any) => {
            const { lat: la, lng: lo } = (ev.target as L.Marker).getLatLng();
            setLocationLat(la); setLocationLng(lo);
            reverseGeocode(la, lo);
          });
        }
        await reverseGeocode(lat, lng);
      });

      setLocationMapReady(true);
      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 250);
      setTimeout(() => map.invalidateSize(), 500);
      setTimeout(() => map.invalidateSize(), 1000);
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setLocationMapReady(false);
      }
    };
  }, [activeTab, locationLat, locationLng]);

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-850 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Building className="text-[var(--orange)]" />
            <span>{t("admin.settings.pageTitle")}</span>
          </h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
            {t("admin.settings.pageSubtitle")}
          </p>
        </div>

        {/* Tab triggers */}
        <div className="flex flex-wrap bg-gray-900/60 p-1.5 rounded-2xl border border-gray-850">
          {[
            { id: "profile", label: t("admin.settings.tabs.profile"), icon: Building },
            { id: "branding", label: t("admin.settings.tabs.branding"), icon: Palette },
            { id: "operations", label: t("admin.settings.tabs.operations"), icon: Sliders },
            { id: "location", label: t("admin.settings.tabs.location"), icon: MapPin },
            { id: "payment", label: "Payment", icon: QrCode },
            { id: "security", label: t("admin.settings.tabs.security"), icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Workspace Column */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* TABS 1: HOTEL PROFILE */}
            {activeTab === "profile" && (
              <form onSubmit={saveHotelProfile} className="glass-card-dark p-6 rounded-3xl border border-gray-850/80 space-y-6 bg-[#111] shadow-xl">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-850">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[var(--orange)]">
                    <Building size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">Hotel Basic Information</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Edit store listing details, tags, and location data</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest flex items-center gap-1.5">
                      <FileText size={12} className="text-orange-500" />
                      <span>Hotel / Restaurant Name</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                      placeholder="e.g., Grand Palace Dine"
                      className="w-full px-4 py-3.5 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none transition-all focus:ring-1 focus:ring-orange-500/20"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin size={12} className="text-orange-500" />
                      <span>Store Address</span>
                    </label>
                    <input
                      type="text"
                      value={hotelAddress}
                      onChange={(e) => setHotelAddress(e.target.value)}
                      placeholder="e.g., Street Avenue, Block 4, Mumbai, India"
                      className="w-full px-4 py-3.5 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none transition-all focus:ring-1 focus:ring-orange-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest flex items-center gap-1.5">
                      <Phone size={12} className="text-orange-500" />
                      <span>Store Contact Number</span>
                    </label>
                    <input
                      type="text"
                      value={hotelPhone}
                      onChange={(e) => setHotelPhone(e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full px-4 py-3.5 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none transition-all focus:ring-1 focus:ring-orange-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest flex items-center gap-1.5">
                      <Mail size={12} className="text-orange-500" />
                      <span>Store Email Address</span>
                    </label>
                    <input
                      type="email"
                      value={hotelEmail}
                      onChange={(e) => setHotelEmail(e.target.value)}
                      placeholder="restaurant@example.com"
                      className="w-full px-4 py-3.5 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none transition-all focus:ring-1 focus:ring-orange-500/20"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest">About Us / Hotel Bio Description</label>
                    <textarea
                      value={hotelDesc}
                      onChange={(e) => setHotelDesc(e.target.value)}
                      rows={4}
                      placeholder="State a premium description of your gourmet cuisine, history, or chef notes..."
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none transition-all min-h-[100px] focus:ring-1 focus:ring-orange-500/20"
                    ></textarea>
                  </div>
                </div>

                {/* Hotel Type Selector */}
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest block flex items-center gap-1.5">
                    <span>🍽️</span>
                    <span>Hotel Dining Type</span>
                  </label>
                  <p className="text-[9px] text-gray-500 font-semibold -mt-1">
                    Controls badge display on customer menu, veg/non-veg filters, and item creation restrictions.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      {
                        value: "veg",
                        emoji: "🌱",
                        label: "Veg Only",
                        sub: "Pure Veg",
                        activeClass: "border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_12px_rgba(16,185,129,0.12)]",
                        iconActiveBg: "bg-emerald-500/10 text-emerald-400",
                        titleActiveColor: "text-emerald-400",
                        badgeBg: "bg-emerald-500",
                        badgeText: "text-black"
                      },
                      {
                        value: "nonveg",
                        emoji: "🍗",
                        label: "Non-Veg Only",
                        sub: "Non-Veg",
                        activeClass: "border-red-500/40 bg-red-500/5 shadow-[0_0_12px_rgba(239,68,68,0.12)]",
                        iconActiveBg: "bg-red-500/10 text-red-400",
                        titleActiveColor: "text-red-400",
                        badgeBg: "bg-red-500",
                        badgeText: "text-white"
                      },
                      {
                        value: "both",
                        emoji: "🍽️",
                        label: "Veg & Non-Veg",
                        sub: "Both categories",
                        activeClass: "border-orange-500/40 bg-orange-500/5 shadow-[0_0_12px_rgba(255,90,31,0.12)]",
                        iconActiveBg: "bg-orange-500/10 text-orange-400",
                        titleActiveColor: "text-orange-400",
                        badgeBg: "bg-[#ff5a1f]",
                        badgeText: "text-white"
                      }
                    ] as const).map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setHotelType(type.value)}
                        className={`relative flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                          hotelType === type.value
                            ? type.activeClass
                            : "border-gray-850 bg-gray-900/10 text-gray-400 hover:border-gray-850 hover:bg-[#0c0f14]"
                        }`}
                      >
                        {/* Compact Icon Wrap */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-colors ${
                          hotelType === type.value ? type.iconActiveBg : "bg-[#10141b] text-gray-500"
                        }`}>
                          {type.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className={`block text-[10px] font-black uppercase tracking-wider ${
                            hotelType === type.value ? type.titleActiveColor : "text-gray-305"
                          }`}>
                            {type.label}
                          </span>
                          <span className="block text-[8px] text-gray-550 font-semibold mt-0.5">
                            {type.sub}
                          </span>
                        </div>

                        {/* Elegant micro checkmark */}
                        {hotelType === type.value && (
                          <span className={`absolute top-2.5 right-2.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black ${type.badgeBg} ${type.badgeText}`}>
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-gray-850">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-orange px-6 py-3 rounded-xl text-xs font-black text-white cursor-pointer shadow-lg shadow-orange-500/10 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {saving && <RefreshCw size={14} className="animate-spin" />}
                    <span>Save Profile Information</span>
                  </button>
                </div>
              </form>
            )}

            {/* TABS 2: BRANDING & CUSTOM NEON THEME */}
            {activeTab === "branding" && (
              <form onSubmit={saveHotelProfile} className="space-y-8">
                
                {/* Visual Assets Panel */}
                <div className="glass-card-dark p-6 rounded-3xl border border-gray-850/80 bg-[#111] space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-850">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[var(--orange)]">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">Visual Assets Directory</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Upload hotel branding files and optimize visual settings</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest block">Neon Brand Tagline</label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g., Served with Love ❤️"
                      className="w-full px-4 py-3.5 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none transition-all"
                    />
                  </div>

                  {/* Logo Assets uploading section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    
                    {/* LOGO */}
                    <div className="p-5 border border-gray-850 bg-gray-900/10 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white tracking-tight uppercase">Circular Brand Logo</span>
                        <label className="text-[9px] font-black uppercase text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Max size 200KB</label>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-gray-950 border border-gray-800 overflow-hidden flex items-center justify-center text-gray-650 shrink-0 shadow-inner">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={28} />
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <label className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-800 bg-gray-900 hover:bg-gray-850 text-[10px] font-black uppercase tracking-wider text-gray-200 cursor-pointer transition-all">
                            <Upload size={12} />
                            <span>Select Logo</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageFileChange(e, "logo")} />
                          </label>
                          <p className="text-[8px] font-semibold text-gray-500">Supports PNG, JPEG, WEBP.</p>
                        </div>
                      </div>

                      {logoFile && (
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => uploadAsset("logo")}
                            disabled={logoUploading}
                            className="flex-grow bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
                          >
                            {logoUploading ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            <span>Confirm Upload</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLocalAsset("logo")}
                            className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 border border-gray-800 hover:border-red-500/20 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* BANNER COVER */}
                    <div className="p-5 border border-gray-850 bg-gray-900/10 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white tracking-tight uppercase">Hero Cover Banner</span>
                        <label className="text-[9px] font-black uppercase text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Max size 300KB</label>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-20 h-14 rounded-xl bg-gray-950 border border-gray-800 overflow-hidden flex items-center justify-center text-gray-650 shrink-0 shadow-inner">
                          {bannerPreview ? (
                            <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={24} />
                          )}
                        </div>

                        <div className="flex-grow space-y-2">
                          <label className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-800 bg-gray-900 hover:bg-gray-850 text-[10px] font-black uppercase tracking-wider text-gray-200 cursor-pointer transition-all">
                            <Upload size={12} />
                            <span>Select Cover</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageFileChange(e, "banner")} />
                          </label>
                          <p className="text-[8px] font-semibold text-gray-500">Supports PNG, JPEG, WEBP.</p>
                        </div>
                      </div>

                      {bannerFile && (
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => uploadAsset("banner")}
                            disabled={bannerUploading}
                            className="flex-grow bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
                          >
                            {bannerUploading ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            <span>Confirm Upload</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLocalAsset("banner")}
                            className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 border border-gray-800 hover:border-red-500/20 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visibility Toggles */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <label className="flex items-center gap-3 p-4 bg-gray-900/40 border border-gray-850 hover:border-gray-800 rounded-2xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showLogo}
                        onChange={(e) => setShowLogo(e.target.checked)}
                        className="w-4.5 h-4.5 rounded text-orange-500 accent-orange-500 cursor-pointer focus:ring-0 focus:ring-offset-0"
                      />
                      <div className="flex flex-col leading-none">
                        <span className="text-xs font-bold text-gray-200">Show Brand Logo</span>
                        <span className="text-[9px] text-gray-500 mt-1 font-semibold">Enable on customer menus</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-gray-900/40 border border-gray-850 hover:border-gray-800 rounded-2xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showBanner}
                        onChange={(e) => setShowBanner(e.target.checked)}
                        className="w-4.5 h-4.5 rounded text-orange-500 accent-orange-500 cursor-pointer focus:ring-0 focus:ring-offset-0"
                      />
                      <div className="flex flex-col leading-none">
                        <span className="text-xs font-bold text-gray-200">Show Banner Cover</span>
                        <span className="text-[9px] text-gray-500 mt-1 font-semibold">Render hero image banner</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Customized color palettes */}
                <div className="glass-card-dark p-6 rounded-3xl border border-gray-850/80 bg-[#111] space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-850">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[var(--orange)]">
                      <Palette size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">Dynamic Brand Hex Themes</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Control live colors rendered dynamically on customer panels</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Primary Color Picker */}
                    <div className="p-4 border border-gray-850 rounded-2xl space-y-3">
                      <span className="text-xs font-black text-gray-300 block uppercase">Primary Glow Theme</span>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl border border-gray-850 shrink-0 shadow-lg"
                          style={{ backgroundColor: primaryColor }}
                        ></div>
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-28 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-mono font-bold text-white uppercase outline-none"
                        />
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0 outline-none p-0 bg-transparent shrink-0"
                        />
                      </div>
                      <p className="text-[8px] font-semibold text-gray-500">Injects custom variables dynamically for active customer-facing checkouts.</p>
                    </div>

                    {/* Secondary Color Picker */}
                    <div className="p-4 border border-gray-850 rounded-2xl space-y-3">
                      <span className="text-xs font-black text-gray-300 block uppercase">Secondary Glow Theme</span>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl border border-gray-850 shrink-0 shadow-lg"
                          style={{ backgroundColor: secondaryColor }}
                        ></div>
                        <input
                          type="text"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-28 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-mono font-bold text-white uppercase outline-none"
                        />
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border-0 outline-none p-0 bg-transparent shrink-0"
                        />
                      </div>
                      <p className="text-[8px] font-semibold text-gray-500">Applies harmonious secondary visual overlays on headers and rating modules.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-gray-850">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-orange px-6 py-3 rounded-xl text-xs font-black text-white cursor-pointer shadow-lg shadow-orange-500/10 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {saving && <RefreshCw size={14} className="animate-spin" />}
                      <span>Save Visual Branding Settings</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TABS 3: OPERATIONS & ORDER PREFERENCES */}
            {activeTab === "operations" && (
              <form onSubmit={saveHotelProfile} className="glass-card-dark p-6 rounded-3xl border border-gray-850/80 bg-[#111] space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-850">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[var(--orange)]">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">Operations & Checkout preferences</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Control order permissions, dining configs, states and availability</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Table Count slider */}
                  <div className="md:col-span-3 p-5 bg-gray-900/30 border border-gray-850 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-black text-white block uppercase">Physical Table Count</span>
                        <span className="text-[9px] text-gray-500 font-bold mt-0.5">Maximum table capacity allowed for QR ordering</span>
                      </div>
                      <span className="text-2xl font-black text-orange-500 font-mono">{tableCount}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-gray-500">1</span>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={tableCount}
                        onChange={(e) => setTableCount(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <span className="text-[10px] font-black text-gray-500">50</span>
                    </div>
                  </div>

                  {/* Ordering Switches */}
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <label className="flex items-center gap-3.5 p-4 bg-gray-900/20 border border-gray-850 hover:border-gray-800 rounded-2xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={enableOnline}
                        onChange={(e) => setEnableOnline(e.target.checked)}
                        className="w-4.5 h-4.5 rounded text-orange-500 accent-orange-500 cursor-pointer focus:ring-0 focus:ring-offset-0"
                      />
                      <div className="flex flex-col leading-none">
                        <span className="text-xs font-bold text-gray-200">Online Card Checkout</span>
                        <span className="text-[9px] text-gray-500 mt-1 font-semibold">Allow customer payments online (Razorpay)</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3.5 p-4 bg-[#141414] border border-gray-850 hover:border-gray-800 rounded-2xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={enableQr}
                        onChange={(e) => setEnableQr(e.target.checked)}
                        className="w-4.5 h-4.5 rounded text-orange-500 accent-orange-500 cursor-pointer focus:ring-0 focus:ring-offset-0"
                      />
                      <div className="flex flex-col leading-none">
                        <span className="text-xs font-bold text-gray-205">QR Table Placement</span>
                        <span className="text-[9px] text-gray-500 mt-1 font-semibold">Enable order placement at table terminals</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3.5 p-4 bg-[#141414] border border-gray-850 hover:border-gray-800 rounded-2xl cursor-pointer select-none md:col-span-2">
                      <input
                        type="checkbox"
                        checked={isOpen}
                        onChange={(e) => setIsOpen(e.target.checked)}
                        className="w-4.5 h-4.5 rounded text-orange-500 accent-emerald-500 cursor-pointer focus:ring-0 focus:ring-offset-0"
                      />
                      <div className="flex flex-col leading-none">
                        <span className="text-xs font-bold text-gray-205">Store Operation status (ON/OFF Open)</span>
                        <span className="text-[9px] text-gray-500 mt-1 font-semibold">Instantly close restaurant and reject new orders when toggled OFF</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4 border-t border-gray-850">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-orange px-6 py-3 rounded-xl text-xs font-black text-white cursor-pointer shadow-lg shadow-orange-500/10 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {saving && <RefreshCw size={14} className="animate-spin" />}
                    <span>Save Operational Preferences</span>
                  </button>
                </div>
              </form>
            )}

            {/* TABS 4: GPS LOCATION */}
            {activeTab === "location" && (
              <div className="space-y-6 animate-fade-in-up">
                <div className="glass-card-dark p-6 rounded-3xl border border-gray-850/80 bg-[#111] space-y-6 shadow-xl">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-850">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[var(--orange)]">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">Hotel GPS Location & Geofence</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Pin exact location on map — customers must be within the radius to order</p>
                    </div>
                  </div>

                  {/* Map */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest flex items-center gap-1.5">
                        <MapPin size={12} className="text-orange-500" />
                        <span>Click map to pin hotel location</span>
                      </label>
                      {locationLat && locationLng && (
                        <button
                          type="button"
                          onClick={() => { setLocationLat(null); setLocationLng(null); }}
                          className="text-[9px] font-black uppercase text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          ✕ Clear Pin
                        </button>
                      )}
                    </div>
                    <div
                      id="admin-location-map"
                      style={{ height: "280px", borderRadius: "16px", overflow: "hidden", border: "1px solid #1a1a1a", zIndex: 1 }}
                      className="w-full bg-gray-900"
                    />
                    {locationLat && locationLng ? (
                      <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2.5">
                        <MapPin size={12} className="text-orange-500 shrink-0" />
                        <span className="text-[10px] font-mono font-bold text-orange-400">
                          {locationLat.toFixed(6)}, {locationLng.toFixed(6)}
                        </span>
                        <span className="ml-auto text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Pinned</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-yellow-500/5 border border-yellow-500/10 rounded-xl px-4 py-2.5">
                        <MapPin size={12} className="text-yellow-600 shrink-0" />
                        <p className="text-[9px] text-gray-500 font-semibold">No location set — click on the map above to place a pin. Orders will be accepted from any location until a pin is set.</p>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest">
                        Store Address & Map Link <span className="text-orange-500 normal-case">(auto-fills on pin drop)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => detectAndResolveLocation(locationAddress)}
                        disabled={detectingLocation}
                        className="text-[9px] font-black uppercase text-orange-500 hover:text-orange-400 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {detectingLocation ? (
                          <div className="w-2.5 h-2.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-1"></div>
                        ) : (
                          "🔍 "
                        )}
                        <span>Detect Location</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      onBlur={() => {
                        if (locationAddress.trim().startsWith("http") && !locationLat && !locationLng) {
                          detectAndResolveLocation(locationAddress);
                        }
                      }}
                      placeholder="Enter plain address OR paste Google Maps/OSM location link here..."
                      className="w-full px-4 py-3.5 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none transition-all"
                    />
                  </div>

                  {/* Radius */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest flex items-center justify-between">
                      <span>Customer Ordering Radius</span>
                      <span className="text-orange-500 font-mono text-base">{locationRadius}m</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-gray-500">10m</span>
                      <input
                        type="range"
                        min="10"
                        max="500"
                        value={locationRadius}
                        onChange={(e) => setLocationRadius(e.target.value)}
                        className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <span className="text-[10px] font-black text-gray-500">500m</span>
                    </div>
                    <p className="text-[9px] text-gray-600 font-semibold">Customers must be within {locationRadius} meters of this hotel to place an order. Default is 30 meters.</p>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-gray-850">
                    <button
                      type="button"
                      onClick={saveLocationSettings}
                      disabled={saving}
                      className="btn-orange px-6 py-3 rounded-xl text-xs font-black text-white cursor-pointer shadow-lg shadow-orange-500/10 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {saving && <RefreshCw size={14} className="animate-spin" />}
                      <span>Save Location & Geofence</span>
                    </button>
                  </div>
                </div>

                {/* Location-Based Ordering Control Card */}
                <div className="glass-card-dark p-6 rounded-3xl border border-gray-850/80 bg-[#111] space-y-6 shadow-xl">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-850">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[var(--orange)]">
                      <Sliders size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">Location-Based Ordering</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Toggle location requirements for customer orders</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                      Require customers to be within the hotel&apos;s configured radius before placing an order.
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-900/40 border border-gray-850 rounded-2xl">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-450 uppercase tracking-widest">Status:</span>
                          {locationOrderingEnabled ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                              🟢 Enabled (Recommended)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/15 border border-red-500/30 text-red-400">
                              🔴 Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-505 font-semibold">
                          {locationOrderingEnabled 
                            ? "Customers must be near the hotel to place orders." 
                            : "Customers can place orders from any location."}
                        </p>
                      </div>

                      {/* Premium Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={locationOrderingEnabled}
                          onChange={(e) => setLocationOrderingEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-gray-850">
                    <button
                      type="button"
                      onClick={saveLocationOrderingSetting}
                      disabled={saving}
                      className="btn-orange px-6 py-3 rounded-xl text-xs font-black text-white cursor-pointer shadow-lg shadow-orange-500/10 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {saving && <RefreshCw size={14} className="animate-spin" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TABS 5: PAYMENT SETTINGS */}
            {activeTab === "payment" && (
              <div className="glass-card-dark p-6 rounded-3xl border border-gray-850/80 bg-[#111] space-y-6 shadow-xl">
                <PaymentSettings />
              </div>
            )}

            {/* TABS 6: ACCOUNT SECURITY & LOGIN AUDIT LOGS */}
            {activeTab === "security" && (
              <div className="space-y-8 animate-fade-in-up">

                {/* ── Customer Authentication Control ── */}
                <div className="glass-card-dark p-6 rounded-3xl border border-gray-850/80 bg-[#111] space-y-6 shadow-xl">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-850">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[var(--orange)]">
                      <Key size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">Customer Authentication Required</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Control how customers identify before placing orders</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-start gap-4 p-5 bg-gray-900/40 border border-gray-850 hover:border-orange-500/30 rounded-2xl cursor-pointer select-none transition-all">
                      <input
                        type="checkbox"
                        checked={requireCustomerAuth}
                        onChange={(e) => {
                          setRequireCustomerAuth(e.target.checked);
                          if (!e.target.checked) setSuspiciousActivityMode(false);
                        }}
                        className="w-4 h-4 rounded text-orange-500 accent-orange-500 cursor-pointer mt-0.5 shrink-0"
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-gray-100">Require Customer Authentication</span>
                        <span className="text-xs text-gray-500">When ON — customers must login with Google before placing an order. When OFF — customers enter name only (guest checkout, no account needed).</span>
                        <div className="mt-2">
                          {requireCustomerAuth ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">Authentication Enabled</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/15 border border-red-500/30 text-red-400">Authentication Disabled</span>
                          )}
                        </div>
                      </div>
                    </label>

                    <label className={requireCustomerAuth ? "flex items-start gap-4 p-5 bg-gray-900/40 border border-gray-850 hover:border-amber-500/30 rounded-2xl cursor-pointer select-none transition-all" : "flex items-start gap-4 p-5 bg-gray-900/40 border border-gray-850/40 rounded-2xl cursor-not-allowed select-none opacity-40 transition-all"}>
                      <input
                        type="checkbox"
                        checked={suspiciousActivityMode}
                        disabled={!requireCustomerAuth}
                        onChange={(e) => setSuspiciousActivityMode(e.target.checked)}
                        className="w-4 h-4 rounded text-orange-500 accent-orange-500 cursor-pointer mt-0.5 shrink-0"
                      />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-gray-100">Suspicious Activity Protection</span>
                        <span className="text-xs text-gray-500">Displays a warning banner on the customer menu. Customers see: Identity Verification Active. Requires Authentication ON.</span>
                        {suspiciousActivityMode && (
                          <div className="mt-2 p-3 rounded-xl bg-amber-900/20 border border-amber-700/30 text-xs text-amber-400 font-semibold">
                            Protection badge is ACTIVE on customer menu.
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-gray-850">
                    <button
                      type="button"
                      onClick={saveAuthSettings}
                      disabled={authSettingsSaving}
                      className="btn-orange px-6 py-3 rounded-xl text-xs font-black text-white cursor-pointer shadow-lg shadow-orange-500/10 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {authSettingsSaving && <RefreshCw size={14} className="animate-spin" />}
                      <span>Save Authentication Settings</span>
                    </button>
                  </div>
                </div>

                {/* ── Auth Audit Log ── */}
                <div className="glass-card-dark p-6 rounded-3xl border border-gray-850/80 bg-[#111] space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-850">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[var(--orange)]">
                        <Globe size={20} />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">Auth Change Audit Log</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Admin ID · Hotel ID · Timestamp · Action history</p>
                      </div>
                    </div>
                    <button type="button" onClick={loadAuthLogs} className="text-[10px] font-black uppercase text-orange-500 hover:text-orange-400 flex items-center gap-1 cursor-pointer">
                      <RefreshCw size={12} /> Refresh
                    </button>
                  </div>
                  {authLogsLoading ? (
                    <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>
                  ) : authLogs.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-600 font-semibold">No authentication changes recorded yet.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-gray-850">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-850 bg-gray-900/40">
                            <th className="px-4 py-3 text-left font-black text-gray-500 uppercase tracking-wider">Timestamp</th>
                            <th className="px-4 py-3 text-left font-black text-gray-500 uppercase tracking-wider">Action</th>
                            <th className="px-4 py-3 text-left font-black text-gray-500 uppercase tracking-wider">Admin</th>
                            <th className="px-4 py-3 text-left font-black text-gray-500 uppercase tracking-wider">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {authLogs.map((log: any) => (
                            <tr key={log.id} className="border-b border-gray-850/50 hover:bg-gray-900/30 transition-colors">
                              <td className="px-4 py-3 text-gray-400 font-mono whitespace-nowrap text-[10px]">
                                {new Date(log.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                              </td>
                              <td className="px-4 py-3">
                                <span className={log.action.includes("enable") ? "inline-flex items-center px-2.5 py-1 rounded-full font-black uppercase text-[9px] bg-red-500/15 border border-red-500/30 text-red-400" : "inline-flex items-center px-2.5 py-1 rounded-full font-black uppercase text-[9px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"}>
                                  {log.action.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-300 font-semibold">{log.admin_username} <span className="text-gray-600">({log.admin_role})</span></td>
                              <td className="px-4 py-3 text-gray-500">{log.note || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                
                <form onSubmit={saveAccountSettings} className="glass-card-dark p-6 rounded-3xl border border-gray-850/80 bg-[#111] space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-850">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[var(--orange)]">
                      <Lock size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white">Administrator Credentials</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Secure profile names, update email notifications, and passwords</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest block">Administrator Full Name</label>
                      <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest block">Contact Mobile Number</label>
                      <input
                        type="text"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest block">Log Email Address</label>
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@example.com"
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none transition-all"
                      />
                    </div>

                    {/* Hashed Password Section */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-850/60">
                      
                      <div className="space-y-2 col-span-2">
                        <span className="text-xs font-black text-white block uppercase tracking-tight flex items-center gap-1.5">
                          <Key size={14} className="text-orange-500" />
                          <span>Reset Account Password</span>
                        </span>
                        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wide">Leave passwords blank if you do not desire changes.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest block">Current Active Password</label>
                        <div className="relative">
                          <input
                            type={showCurrentPass ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter existing password"
                            className="w-full pl-4 pr-10 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-250 focus:border-orange-500 outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPass(!showCurrentPass)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                          >
                            {showCurrentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest block">New Safe Password</label>
                        <div className="relative">
                          <input
                            type={showNewPass ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            className="w-full pl-4 pr-10 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-250 focus:border-orange-500 outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                          >
                            {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-gray-450 uppercase tracking-widest block">Verify New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-250 focus:border-orange-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-4 border-t border-gray-850">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-orange px-6 py-3 rounded-xl text-xs font-black text-white cursor-pointer shadow-lg shadow-orange-500/10 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {saving && <RefreshCw size={14} className="animate-spin" />}
                      <span>Save Account Settings</span>
                    </button>
                  </div>
                </form>

                {/* AUDIT LOG HISTORY */}
                <div className="glass-card-dark p-6 rounded-3xl border border-gray-850/80 bg-[#111] space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-850">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-[var(--orange)]">
                        <Laptop size={20} />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-white">Active Login Sessions Audit</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Auditing logs of active login devices, session keys and logs</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={terminateAllOtherDevices}
                      className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={12} />
                      <span>Logout from other devices</span>
                    </button>
                  </div>

                  {/* Sessions table */}
                  <div className="overflow-x-auto rounded-2xl border border-gray-850">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-850 bg-gray-900/40 text-gray-500 uppercase tracking-widest font-black">
                          <th className="p-4 pl-5">Status</th>
                          <th className="p-4">Terminal Device / Browser</th>
                          <th className="p-4">IP Address</th>
                          <th className="p-4">Login Time</th>
                          <th className="p-4 pr-5 text-right">Audit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850/60 font-semibold text-gray-400">
                        {sessions.map((sess, idx) => {
                          const isCurrent = idx === 0;
                          return (
                            <tr key={sess.id} className={`hover:bg-gray-900/15 ${isCurrent ? "bg-orange-500/5" : ""}`}>
                              <td className="p-4 pl-5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                  isCurrent
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-gray-800 text-gray-500 border border-gray-850"
                                }`}>
                                  <span>{isCurrent ? "Active Device" : "Logged Session"}</span>
                                </span>
                              </td>
                              <td className="p-4 text-xs font-bold text-gray-300 max-w-xs truncate" title={sess.user_agent || "Unknown"}>
                                <div className="flex items-center gap-2">
                                  {sess.user_agent?.toLowerCase().includes("mobile") ? (
                                    <Smartphone size={14} className="text-orange-500 shrink-0" />
                                  ) : (
                                    <Laptop size={14} className="text-orange-500 shrink-0" />
                                  )}
                                  <span className="truncate">{sess.user_agent || "Unknown Platform Agent"}</span>
                                </div>
                              </td>
                              <td className="p-4 font-mono text-[10px] font-bold text-gray-450">
                                <div className="flex items-center gap-1.5">
                                  <Globe size={11} className="text-gray-600" />
                                  <span>{sess.ip_address || "127.0.0.1 (Local)"}</span>
                                </div>
                              </td>
                              <td className="p-4 text-xs font-semibold text-gray-500">
                                {new Date(sess.created_at).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true
                                })}
                              </td>
                              <td className="p-4 pr-5 text-right font-mono text-[9px] text-gray-650">
                                ID #{sess.id}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Customer Menu Previews & Branding Card Column */}
          <div className="space-y-6">
            <div className="glass-card-dark p-6 rounded-3xl border border-gray-850/80 bg-[#111] space-y-6 shadow-xl sticky top-6">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 pb-4 border-b border-gray-850">
                <Globe size={16} className="text-orange-500 animate-pulse" />
                <span>Live Brand Preview</span>
              </h3>

              {/* Simulated Customer Device Screen */}
              <div className="border-[6px] border-gray-950 rounded-[28px] overflow-hidden bg-[#0c0c0c] shadow-2xl relative">
                
                {/* Simulated status bar */}
                <div className="bg-black text-[8px] font-bold text-gray-500 px-4 py-1.5 flex justify-between items-center border-b border-gray-900">
                  <span>9:41 AM</span>
                  <div className="w-10 h-1.5 bg-gray-800 rounded-full"></div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  </div>
                </div>

                {/* Hero Banner Cover image */}
                {showBanner && bannerPreview ? (
                  <div className="h-28 relative overflow-hidden bg-gray-900 border-b border-gray-900">
                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover opacity-85" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                  </div>
                ) : (
                  <div className="h-16 bg-gradient-to-r from-gray-900 to-gray-950 border-b border-gray-900 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
                  </div>
                )}

                {/* Details layout */}
                <div className="px-4 pb-6 -mt-8 relative z-10 flex flex-col items-center text-center">
                  
                  {/* Circular Brand Logo */}
                  {showLogo && logoPreview ? (
                    <div className="w-16 h-16 rounded-full bg-gray-900 border-3 border-gray-950 overflow-hidden flex items-center justify-center shrink-0 shadow-lg shadow-black/80">
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-1"></div>
                  )}

                  {/* Dynamic coloring details */}
                  <h4 className="text-sm font-black text-white mt-3 truncate max-w-full">
                    {hotelName || "Grand Palace Dine"}
                  </h4>
                  <p
                    className="text-[9px] font-extrabold tracking-tight mt-1 text-center"
                    style={{ color: primaryColor }}
                  >
                    {tagline || "Served with Love ❤️"}
                  </p>

                  <div className="w-full h-[1px] bg-gray-900 my-3"></div>

                  <div className="w-full space-y-2 text-left">
                    <div className="flex justify-between items-center bg-gray-950 p-2 rounded-lg border border-gray-900">
                      <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-widest">Operational State</span>
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                        isOpen
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {isOpen ? "Open" : "Closed"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-gray-950 p-2 rounded-lg border border-gray-900">
                      <span className="text-[8px] font-extrabold text-gray-500 uppercase tracking-widest">Checkout Options</span>
                      <div className="flex items-center gap-1.5">
                        {enableOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Online orders active" />}
                        {enableQr && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="QR ordering active" />}
                      </div>
                    </div>

                    {/* Disabled ordering simulator */}
                    {!isOpen && (
                      <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl text-center">
                        <AlertCircle size={14} className="text-red-500 mx-auto mb-1" />
                        <p className="text-[8px] font-bold text-red-400 leading-tight">
                          Hotel is currently closed and not accepting orders.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick statistics */}
              <div className="p-4 bg-gray-950 border border-gray-900 rounded-2xl flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Unique QR Slug</span>
                  <span className="font-extrabold text-white block">/{hotel?.slug || "loading"}</span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-[var(--orange)]">
                  <Globe size={16} />
                </div>
              </div>

              {/* Hotel Type Badge */}
              <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                hotelType === "veg" ? "bg-emerald-500/5 border-emerald-500/20" :
                hotelType === "nonveg" ? "bg-red-500/5 border-red-500/20" :
                "bg-yellow-500/5 border-yellow-500/20"
              }`}>
                <span className="text-2xl">{hotelType === "veg" ? "🌱" : hotelType === "nonveg" ? "🍗" : "🟡"}</span>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider block ${
                    hotelType === "veg" ? "text-emerald-400" :
                    hotelType === "nonveg" ? "text-red-400" : "text-yellow-400"
                  }`}>
                    {hotelType === "veg" ? "100% Pure Veg Restaurant" :
                     hotelType === "nonveg" ? "Non-Veg Speciality" : "Veg & Non-Veg Menu"}
                  </span>
                  <span className="text-[8px] text-gray-500 font-semibold block mt-0.5">Shown as badge on customer menu</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
