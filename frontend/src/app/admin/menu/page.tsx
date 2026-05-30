"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      Swal.fire("Required Fields", "Please populate Name, Category, and Price.", "warning");
      return;
    }

    Swal.fire({
      title: "Saving Item...",
      text: "Uploading photo and saving configurations...",
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
          title: "Saved!",
          text: editingItem ? "Item modified successfully." : "New item created.",
          icon: "success",
          timer: 1200,
          showConfirmButton: false,
        });
        setIsItemModalOpen(false);
        resetItemForm();
        fetchSettingsData();
      } else {
        Swal.fire("Failure", data.message || "Failed to commit record.", "error");
      }
    } catch (err) {
      Swal.fire("Network Error", "Unable to establish communication with API.", "error");
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
      title: "Delete Item?",
      text: "Are you sure? This removes this food item from all menus.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Delete",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/items/${itemId}`, { method: "DELETE" });
        const data = await res.json();

        if (data.success) {
          Swal.fire("Deleted", "Item has been deleted.", "success");
          fetchSettingsData();
        } else {
          Swal.fire("Failure", data.message || "Could not delete.", "error");
        }
      } catch (err) {
        Swal.fire("Error", "Server communications offline.", "error");
      }
    }
  };

  // Category Actions
  const handleAddCategory = async () => {
    const { value: catName } = await Swal.fire({
      title: "Add Food Category",
      input: "text",
      inputLabel: "Category Name",
      inputPlaceholder: "e.g., Cool Drinks, Pizzas",
      showCancelButton: true,
      confirmButtonColor: "#FF5A1F",
      inputValidator: (value) => {
        if (!value.trim()) {
          return "You need to write something!";
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
          Swal.fire("Created!", `Category "${catName}" added.`, "success");
          fetchSettingsData();
        } else {
          Swal.fire("Error", data.message || "Conflict occurred.", "error");
        }
      } catch (err) {
        Swal.fire("Error", "Failed to add category.", "error");
      }
    }
  };

  const handleEditCategory = async (cat: Category) => {
    const { value: catName } = await Swal.fire({
      title: "Edit Category Name",
      input: "text",
      inputValue: cat.category_name,
      showCancelButton: true,
      confirmButtonColor: "#FF5A1F",
      inputValidator: (value) => {
        if (!value.trim()) {
          return "Name cannot be empty!";
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
          Swal.fire("Updated!", "Category updated successfully.", "success");
          fetchSettingsData();
        } else {
          Swal.fire("Error", data.message || "Failed.", "error");
        }
      } catch (err) {
        Swal.fire("Error", "Network offline.", "error");
      }
    }
  };

  const handleDeleteCategory = async (catId: number) => {
    const result = await Swal.fire({
      title: "Delete Category?",
      text: "Warning: Category cannot be deleted if active items are nested in it!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Delete",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/categories/${catId}`, { method: "DELETE" });
        const data = await res.json();

        if (data.success) {
          Swal.fire("Deleted", "Category cleared successfully.", "success");
          fetchSettingsData();
        } else {
          Swal.fire("Unavailable", data.message || "Please remove its items first.", "error");
        }
      } catch (err) {
        Swal.fire("Error", "Operation failed.", "error");
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
            <span>Menu & Categories</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
              Configure menu list, categories, and inventory items
            </p>
            {/* Hotel Type Badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
              hotelType === "veg" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" :
              hotelType === "nonveg" ? "bg-red-500/10 border-red-500/25 text-red-400" :
              "bg-yellow-500/10 border-yellow-500/25 text-yellow-400"
            }`}>
              <span>{hotelType === "veg" ? "🌱 Veg Only" : hotelType === "nonveg" ? "🍗 Non-Veg Only" : "🟡 Both"}</span>
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
            Menu Items
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              activeTab === "categories"
                ? "bg-orange-500 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Categories
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
              <span>Available Food Cards ({items.length})</span>
            </h2>

            <button
              onClick={handleOpenAddModal}
              className="btn-orange px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/10"
            >
              <Plus size={14} />
              <span>Add Menu Item</span>
            </button>
          </div>

          <div className="glass-card-dark rounded-2xl overflow-hidden border border-gray-850">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-850 bg-gray-900/30 text-gray-500 uppercase tracking-widest font-black">
                    <th className="p-4 pl-6">Food Photo</th>
                    <th className="p-4">Item Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Veg Status</th>
                    <th className="p-4">Pricing</th>
                    <th className="p-4">Instock Toggle</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
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
                          {item.description || "No descriptions available"}
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
                          <span>{item.is_veg ? "Veg" : "Non-Veg"}</span>
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
                              <span>In Stock</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={10} />
                              <span>Sold Out</span>
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
                            title="Edit Item"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.item_id)}
                            className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                            title="Delete Item"
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
              <span>Menu Categories Directory ({categories.length})</span>
            </h2>

            <button
              onClick={handleAddCategory}
              className="btn-orange px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/10"
            >
              <Plus size={14} />
              <span>Add Category</span>
            </button>
          </div>

          <div className="glass-card-dark rounded-2xl overflow-hidden border border-gray-850">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-850 bg-gray-900/30 text-gray-500 uppercase tracking-widest font-black">
                  <th className="p-4 pl-6">ID #</th>
                  <th className="p-4">Category Name</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
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
                <span>{editingItem ? "Edit Menu Item Details" : "Create New Menu Item"}</span>
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
                    Dish Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Butter Chicken"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none transition-all"
                  />
                </div>

                {/* Category select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block">
                    Category Group
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
                    Price (INR)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="₹ 299"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-bold text-white focus:border-orange-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block">
                  Dish Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Tell customers about key ingredients, taste modifiers, and chef specials..."
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-xs font-semibold text-gray-200 focus:border-orange-500 outline-none min-h-[70px] transition-all"
                ></textarea>
              </div>

              {/* File Upload Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block">
                  Dish Photo
                </label>
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div className="col-span-3">
                    <label className="flex flex-col items-center justify-center border border-dashed border-gray-800 hover:border-orange-500/50 rounded-xl p-4 cursor-pointer bg-gray-900/40 hover:bg-gray-900/60 transition-all text-center">
                      <Upload size={18} className="text-gray-500 mb-1.5" />
                      <span className="text-[10px] font-bold text-gray-400">Choose Image File</span>
                      <span className="text-[8px] text-gray-650 mt-0.5">PNG, JPG up to 10MB</span>
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
                      <span className="text-[11px] font-extrabold text-gray-300">Pure Vegetarian</span>
                      <span className="text-[8px] text-gray-500 font-semibold mt-0.5">Leaf status mark</span>
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
                        {hotelType === "veg" ? "🌱 Veg Only Hotel" : "🍗 Non-Veg Only Hotel"}
                      </span>
                      <span className="text-[8px] text-gray-500 font-semibold mt-0.5">Veg status is locked by hotel type</span>
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
                    <span className="text-[11px] font-extrabold text-gray-305">Instock & Active</span>
                    <span className="text-[8px] text-gray-500 font-semibold mt-0.5">Visible on browse</span>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-orange px-6 py-2.5 rounded-xl text-xs font-black text-white cursor-pointer shadow-lg shadow-orange-500/10"
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
