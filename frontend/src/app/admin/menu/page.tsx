"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/i18n";
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  PlusCircle,
  FolderOpen,
  Leaf,
  X,
  Upload,
} from "lucide-react";
import Swal from "sweetalert2";

interface Category {
  category_id: number;
  category_name: string;
}

interface MenuItem {
  item_id: number;
  item_name: string;
  description: string;
  price: number;
  image_url: string;
  category_id: number;
  category_name: string;
  is_available: boolean;
  is_veg: boolean;
}

export default function AdminMenu() {
  const router = useRouter();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hotelType, setHotelType] = useState<"veg" | "nonveg" | "both">("both");

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Form fields
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsVeg, setFormIsVeg] = useState(true);
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFilePreview, setFormFilePreview] = useState("");

  const fetchSettingsData = async () => {
    try {
      // 1. Session verification
      const sessionRes = await fetch("/api/auth/admin/session-check");
      const sessionData = await sessionRes.json();
      if (!sessionData.authenticated) {
        router.push("/admin/login");
        return;
      }

      // 2. Fetch hotel type from settings
      const settingsRes = await fetch("/api/admin/settings");
      const settingsData = await settingsRes.json();
      if (settingsData.success && settingsData.hotel?.hotel_type) {
        const ht = settingsData.hotel.hotel_type;
        setHotelType(ht);
        // Lock formIsVeg based on hotel type
        if (ht === "veg") setFormIsVeg(true);
        if (ht === "nonveg") setFormIsVeg(false);
      }

      // 3. Fetch categories (use admin-authenticated route scoped to this hotel)
      const catRes = await fetch("/api/admin/categories");
      const catData = await catRes.json();
      if (catData.success) {
        setCategories(catData.categories);
      }

      // 4. Fetch menu items (use admin-authenticated route scoped to this hotel)
      const itemsRes = await fetch("/api/admin/items");
      const itemsData = await itemsRes.json();
      if (itemsData.success) {
        setItems(itemsData.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, [router]);

  const resetItemForm = () => {
    setEditingItem(null);
    setFormName("");
    setFormCategory("");
    setFormPrice("");
    setFormDescription("");
    setFormIsVeg(true);
    setFormIsAvailable(true);
    setFormFile(null);
    setFormFilePreview("");
  };

  const handleOpenAddModal = () => {
    resetItemForm();
    // Lock veg status based on hotel type
    if (hotelType === "veg") setFormIsVeg(true);
    else if (hotelType === "nonveg") setFormIsVeg(false);
    else setFormIsVeg(true);
    if (categories.length > 0) {
      setFormCategory(categories[0].category_id.toString());
    }
    setIsItemModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.item_name);
    setFormCategory(item.category_id.toString());
    setFormPrice(item.price.toString());
    setFormDescription(item.description || "");
    setFormIsVeg(item.is_veg);
    setFormIsAvailable(item.is_available);
    setFormFile(null);
    setFormFilePreview(item.image_url || "");
    setIsItemModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormFile(file);
      setFormFilePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCategory || !formPrice) {
      Swal.fire(t("admin.menu.requiredFields"), t("admin.menu.requiredFieldsMsg"), "warning");
      return;
    }

    Swal.fire({
      title: t("admin.menu.savingItem"),
      text: t("admin.menu.savingItemMsg"),
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const formData = new FormData();
    formData.append("item_name", formName.trim());
    formData.append("category_id", formCategory);
    formData.append("price", formPrice);
    formData.append("description", formDescription.trim());
    formData.append("is_veg", String(formIsVeg));
    formData.append("is_available", String(formIsAvailable));
    if (formFile) {
      formData.append("image", formFile);
    } else if (editingItem) {
      formData.append("existing_image_url", editingItem.image_url || "");
    }

    try {
      const url = editingItem
        ? `/api/admin/items/${editingItem.item_id}`
        : "/api/admin/items";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, { method, body: formData });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          title: t("admin.menu.saved"),
          text: editingItem ? t("admin.menu.itemModified") : t("admin.menu.itemCreated"),
          icon: "success",
          timer: 1200,
          showConfirmButton: false,
        });
        setIsItemModalOpen(false);
        resetItemForm();
        fetchSettingsData();
      } else {
        Swal.fire(t("admin.menu.failure"), data.message || t("admin.menu.failedToCommit"), "error");
      }
    } catch (err) {
      Swal.fire(t("admin.menu.networkError"), t("admin.menu.networkErrorMsg"), "error");
    }
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    try {
      const formData = new FormData();
      formData.append("item_name", item.item_name);
      formData.append("category_id", item.category_id.toString());
      formData.append("price", item.price.toString());
      formData.append("description", item.description || "");
      formData.append("is_veg", String(item.is_veg));
      formData.append("is_available", String(!item.is_available));
      formData.append("existing_image_url", item.image_url || "");

      const res = await fetch(`/api/admin/items/${item.item_id}`, {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        fetchSettingsData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    const result = await Swal.fire({
      title: t("admin.menu.deleteItemTitle2"),
      text: t("admin.menu.deleteItemMsg"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#aaa",
      confirmButtonText: t("admin.deleteItem"),
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/items/${itemId}`, { method: "DELETE" });
        const data = await res.json();

        if (data.success) {
          Swal.fire(t("admin.menu.deleted"), t("admin.menu.itemDeleted"), "success");
          fetchSettingsData();
        } else {
          Swal.fire(t("admin.menu.failure"), data.message || t("admin.menu.couldNotDelete"), "error");
        }
      } catch (err) {
        Swal.fire(t("common.error"), t("admin.menu.serverOffline"), "error");
      }
    }
  };

  // Category Actions
  const handleAddCategory = async () => {
    const { value: catName } = await Swal.fire({
      title: t("admin.menu.addFoodCategory"),
      input: "text",
      inputLabel: t("admin.menu.categoryName"),
      inputPlaceholder: t("admin.menu.categoryPlaceholder"),
      showCancelButton: true,
      confirmButtonColor: "#FF5A1F",
      inputValidator: (value) => {
        if (!value.trim()) {
          return t("admin.menu.categoryRequired");
        }
      },
    });

    if (catName) {
      try {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category_name: catName }),
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire(t("admin.menu.categoryCreated"), t("admin.menu.categoryCreatedMsg"), "success");
          fetchSettingsData();
        } else {
          Swal.fire(t("common.error"), data.message || t("admin.menu.categoryConflict"), "error");
        }
      } catch (err) {
        Swal.fire(t("common.error"), t("admin.menu.failedToAdd"), "error");
      }
    }
  };

  const handleEditCategory = async (cat: Category) => {
    const { value: catName } = await Swal.fire({
      title: t("admin.menu.editCategoryTitle"),
      input: "text",
      inputValue: cat.category_name,
      showCancelButton: true,
      confirmButtonColor: "#FF5A1F",
      inputValidator: (value) => {
        if (!value.trim()) {
          return t("admin.menu.categoryNameRequired");
        }
      },
    });

    if (catName) {
      try {
        const res = await fetch(`/api/admin/categories/${cat.category_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category_name: catName }),
        });
        const data = await res.json();

        if (data.success) {
          Swal.fire(t("admin.menu.updated"), t("admin.menu.categoryUpdated"), "success");
          fetchSettingsData();
        } else {
          Swal.fire(t("common.error"), data.message || t("admin.menu.failed"), "error");
        }
      } catch (err) {
        Swal.fire(t("common.error"), t("admin.menu.networkOffline"), "error");
      }
    }
  };

  const handleDeleteCategory = async (catId: number) => {
    const result = await Swal.fire({
      title: t("admin.menu.deleteCategoryTitle"),
      text: t("admin.menu.deleteCategoryMsg"),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#aaa",
      confirmButtonText: t("admin.deleteCategory"),
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/categories/${catId}`, { method: "DELETE" });
        const data = await res.json();

        if (data.success) {
          Swal.fire(t("admin.menu.deleted"), t("admin.menu.categoryDeleted"), "success");
          fetchSettingsData();
        } else {
          Swal.fire(t("common.warning"), data.message || t("admin.menu.removeItemsFirst"), "error");
        }
      } catch (err) {
        Swal.fire(t("common.error"), t("admin.menu.operationFailed"), "error");
      }
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Settings className="text-[var(--orange)]" />
            <span>{t("admin.menu.title")}</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
              {t("admin.menu.subtitle")}
            </p>
            {/* Hotel Type Badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
              hotelType === "veg" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" :
              hotelType === "nonveg" ? "bg-red-500/10 border-red-500/25 text-red-400" :
              "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
            }`}>
              <span>{hotelType === "veg" ? t("admin.menu.vegOnly") : hotelType === "nonveg" ? t("admin.menu.nonVegOnly") : t("admin.menu.both")}</span>
            </span>
          </div>
        </div>

        <div className="flex bg-gray-900/60 p-1 rounded-xl border border-gray-850">
          <button
            onClick={() => setActiveTab("items")}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              activeTab === "items"
                ? "bg-orange-500 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t("admin.menu.menuItemsTab")}
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              activeTab === "categories"
                ? "bg-orange-500 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t("admin.menu.categoriesTab")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === "items" ? (
        /* Tab 1: Menu Items List */
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <FolderOpen size={16} className="text-orange-500" />
              <span>{t("admin.menu.availableFoodCards")} ({items.length})</span>
            </h2>

            <button
              onClick={handleOpenAddModal}
              className="btn-orange px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/10"
            >
              <Plus size={14} />
              <span>{t("admin.menu.addMenuItem")}</span>
            </button>
          </div>

          <div className="glass-card-dark rounded-2xl overflow-hidden border border-gray-850">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-850 bg-gray-900/30 text-gray-500 uppercase tracking-widest font-black">
                    <th className="p-4 pl-6">{t("admin.menu.foodPhoto")}</th>
                    <th className="p-4">{t("admin.menu.itemName")}</th>
                    <th className="p-4">{t("admin.menu.categoryCol")}</th>
                    <th className="p-4">{t("admin.menu.vegStatus")}</th>
                    <th className="p-4">{t("admin.menu.pricing")}</th>
                    <th className="p-4">{t("admin.menu.instockToggle")}</th>
                    <th className="p-4 pr-6 text-right">{t("admin.menu.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850/60 font-semibold text-gray-300">
                  {items.map((item) => (
                    <tr key={item.item_id} className="hover:bg-gray-900/20">
                      {/* Image */}
                      <td className="p-4 pl-6">
                        <div className="w-10 h-10 rounded-lg bg-gray-900 overflow-hidden border border-gray-800 flex items-center justify-center text-gray-600">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.item_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon size={16} />
                          )}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="p-4">
                        <span className="font-extrabold text-sm text-white block">
                          {item.item_name}
                        </span>
                        <span className="text-[10px] text-gray-500 block truncate max-w-xs mt-0.5">
                          {item.description || t("admin.menu.noDescription")}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="p-4 text-xs font-bold text-gray-400">
                        {item.category_name}
                      </td>

                      {/* Veg Status */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            item.is_veg
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          <Leaf size={10} className={item.is_veg ? "fill-emerald-400" : ""} />
                          <span>{item.is_veg ? t("admin.menu.veg") : t("admin.menu.nonVeg")}</span>
                        </span>
                      </td>

                      {/* Price */}
                      <td className="p-4 text-sm font-black text-white">
                        ₹{item.price}
                      </td>

                      {/* Stock Switch */}
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleAvailable(item)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase cursor-pointer transition-colors ${
                            item.is_available
                              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20"
                          }`}
                        >
                          {item.is_available ? (
                            <>
                              <CheckCircle size={10} />
                              <span>{t("admin.menu.inStock")}</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={10} />
                              <span>{t("admin.menu.soldOut")}</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title={t("admin.menu.editItemTitle")}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.item_id)}
                            className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                            title={t("admin.menu.deleteItemTitle")}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Category list */
        <div className="space-y-6 max-w-xl">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <PlusCircle size={16} className="text-orange-500" />
              <span>{t("admin.menu.menuCategoriesDirectory")} ({categories.length})</span>
            </h2>

            <button
              onClick={handleAddCategory}
              className="btn-orange px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/10"
            >
              <Plus size={14} />
              <span>{t("admin.menu.addCategory")}</span>
            </button>
          </div>

          <div className="glass-card-dark rounded-2xl overflow-hidden border border-gray-850">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-850 bg-gray-900/30 text-gray-500 uppercase tracking-widest font-black">
                  <th className="p-4 pl-6">{t("admin.menu.idCol")}</th>
                  <th className="p-4">{t("admin.menu.categoryNameCol")}</th>
                  <th className="p-4 pr-6 text-right">{t("admin.menu.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850/60 font-semibold text-gray-300">
                {categories.map((cat) => (
                  <tr key={cat.category_id} className="hover:bg-gray-900/20">
                    <td className="p-4 pl-6 text-gray-500">#{cat.category_id}</td>
                    <td className="p-4 font-extrabold text-sm text-white">
                      {cat.category_name}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => handleEditCategory(cat)}
                          className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.category_id)}
                          className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FULLY OPAQUE MODAL FOR ADD/EDIT ITEM */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Opaque dark overlay */}
          <div
            onClick={() => setIsItemModalOpen(false)}
            className="absolute inset-0 bg-[#060606]/85 backdrop-blur-sm"
          ></div>

          {/* Modal Card */}
          <div className="relative w-full max-w-lg bg-[#141414] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 animate-fade-in-up">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-850 flex justify-between items-center">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <ImageIcon size={18} className="text-orange-500" />
                <span>{editingItem ? t("admin.menu.editMenuItemDetails") : t("admin.menu.createNewMenuItem")}</span>
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-800 text-gray-450 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveItem} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block">
                    {t("admin.menu.dishName")}
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t("admin.menu.dishNamePlaceholder")}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none transition-all"
                  />
                </div>

                {/* Category select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block">
                    {t("admin.menu.categoryGroup")}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-bold text-gray-300 focus:border-orange-500 outline-none cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block">
                    {t("admin.menu.priceINR")}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder={t("admin.menu.pricePlaceholder")}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-bold text-white focus:border-orange-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block">
                  {t("admin.menu.dishDescription")}
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t("admin.menu.dishDescriptionPlaceholder")}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none min-h-[70px] transition-all"
                ></textarea>
              </div>

              {/* File Upload Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block">
                  {t("admin.menu.dishPhoto")}
                </label>
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div className="col-span-3">
                    <label className="flex flex-col items-center justify-center border border-dashed border-gray-800 hover:border-orange-500/50 rounded-xl p-4 cursor-pointer bg-gray-900/40 hover:bg-gray-900/60 transition-all text-center">
                      <Upload size={18} className="text-gray-500 mb-1.5" />
                      <span className="text-[10px] font-bold text-gray-400">{t("admin.menu.chooseImageFile")}</span>
                      <span className="text-[8px] text-gray-650 mt-0.5">{t("admin.menu.imageHint")}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Preview Container */}
                  <div className="col-span-2 aspect-[4/3] rounded-xl bg-gray-900 border border-gray-850 overflow-hidden flex items-center justify-center text-gray-650">
                    {formFilePreview ? (
                      <img
                        src={formFilePreview}
                        alt="Upload Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={20} />
                    )}
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Veg selection */}
                {hotelType === "both" ? (
                  <label className="flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-850 hover:border-gray-800 rounded-xl cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!formIsVeg}
                      onChange={(e) => setFormIsVeg(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-500 focus:ring-0 focus:ring-offset-0 accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex flex-col leading-none">
                      <span className="text-[11px] font-extrabold text-gray-300">{t("admin.menu.pureVegetarian")}</span>
                      <span className="text-[8px] text-gray-500 font-semibold mt-0.5">{t("admin.menu.leafStatusMark")}</span>
                    </div>
                  </label>
                ) : (
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                    hotelType === "veg"
                      ? "bg-emerald-500/10 border-emerald-500/25"
                      : "bg-red-500/10 border-red-500/25"
                  }`}>
                    <div className="flex flex-col leading-none">
                      <span className={`text-[11px] font-extrabold ${ hotelType === "veg" ? "text-emerald-400" : "text-red-400" }`}>
                        {hotelType === "veg" ? t("admin.menu.vegOnlyHotel") : t("admin.menu.nonVegOnlyHotel")}
                      </span>
                      <span className="text-[8px] text-gray-500 font-semibold mt-0.5">{t("admin.menu.vegStatusLocked")}</span>
                    </div>
                  </div>
                )}

                {/* Available selection */}
                <label className="flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-850 hover:border-gray-800 rounded-xl cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!formIsAvailable}
                    onChange={(e) => setFormIsAvailable(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-0 focus:ring-offset-0 accent-orange-500 cursor-pointer"
                  />
                  <div className="flex flex-col leading-none">
                    <span className="text-[11px] font-extrabold text-gray-305">{t("admin.menu.instockActive")}</span>
                    <span className="text-[8px] text-gray-500 font-semibold mt-0.5">{t("admin.menu.visibleOnBrowse")}</span>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-850">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl text-xs font-bold border border-gray-800 transition-colors cursor-pointer"
                >
                  {t("admin.menu.cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-orange px-6 py-2.5 rounded-xl text-xs font-black text-white cursor-pointer shadow-lg shadow-orange-500/10"
                >
                  {t("admin.menu.saveChanges")}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
