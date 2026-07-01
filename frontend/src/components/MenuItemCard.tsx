import React, { useState } from "react";
import { Minus, Plus, Utensils, AlertTriangle, X, Clock, Star, ShieldCheck, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/i18n";

interface MenuItemVariant {
  id: number;
  variant_name: string;
  price: number;
}

interface MenuItem {
  item_id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category_name: string;
  is_veg: boolean;
  is_available: boolean;
  avg_rating?: string;
  is_active?: boolean;
  variants?: MenuItemVariant[];
}

interface Props {
  item: MenuItem;
  cart: any[];
  isOpen: boolean;
  handleAddToCart: (item: MenuItem, selectedVariant?: MenuItemVariant) => void;
  handleDecreaseQuantity: (itemId: number, selectedVariant?: MenuItemVariant) => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

const MenuItemCard: React.FC<Props> = React.memo(({
  item,
  cart,
  isOpen,
  handleAddToCart,
  handleDecreaseQuantity,
  handleImgError,
}) => {
  const { t } = useTranslation();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | undefined>(
    item.variants && item.variants.length > 0 ? item.variants[0] : undefined
  );
  
  // Future-ready add-ons state (mocked interaction)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [detailQuantity, setDetailQuantity] = useState(1);

  const currentQuantity = (() => {
    if (selectedVariant) {
      const cartItem = cart.find(
        (i) => i.item_id === item.item_id && i.selectedVariant?.id === selectedVariant.id
      );
      return cartItem ? cartItem.quantity : 0;
    }
    const cartItem = cart.find((i) => i.item_id === item.item_id && !i.selectedVariant);
    return cartItem ? cartItem.quantity : 0;
  })();

  const itemPrice = selectedVariant ? selectedVariant.price : item.price;
  const addonCost = selectedAddons.reduce((sum, addon) => {
    if (addon.includes("Cheese")) return sum + 20;
    if (addon.includes("Sauce") || addon.includes("Dressing")) return sum + 15;
    return sum;
  }, 0);
  const totalDetailPrice = (itemPrice + addonCost) * detailQuantity;

  const handleAddonClick = (addon: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addon) ? prev.filter((a) => a !== addon) : [...prev, addon]
    );
  };

  const handleDetailAddToCart = () => {
    for (let i = 0; i < detailQuantity; i++) {
      handleAddToCart(item, selectedVariant);
    }
    setIsDetailOpen(false);
    // Reset temporary detail states
    setDetailQuantity(1);
    setSelectedAddons([]);
  };

  const prepTime = item.item_id % 2 === 0 ? "10-15m" : "15-20m";

  return (
    <>
      <div
        className={`group bg-white dark:bg-zinc-900 border border-zinc-150/40 dark:border-zinc-800/55 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col relative transition-all duration-300 shadow-sm ${
          item.is_available
            ? "hover:shadow-xl hover:shadow-orange-500/[0.04] dark:hover:shadow-orange-500/[0.02] hover:-translate-y-1"
            : "opacity-75"
        }`}
      >
        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start pointer-events-none">
          {/* Veg/Non-Veg Badge */}
          <span
            className={`inline-flex items-center justify-center w-5 h-5 rounded-md border-2 bg-white/95 dark:bg-zinc-955/95 shadow-sm ${
              item.is_veg ? "border-emerald-500" : "border-rose-500"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`}></span>
          </span>

          {/* Bestseller Badge */}
          {item.avg_rating && parseFloat(item.avg_rating) >= 4.5 && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-md shadow-orange-500/20">
              🔥 {t('menu.bestseller', 'Bestseller')}
            </span>
          )}

          {/* Chef Recommended Badge */}
          {item.avg_rating && parseFloat(item.avg_rating) >= 4.8 && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md">
              👨‍🍳 {t('menu.chefRecommended', 'Chef Special')}
            </span>
          )}
        </div>

        {/* Rating and Prep Time overlay */}
        <div className="absolute top-3 right-3 z-10 flex gap-1 pointer-events-none">
          {item.avg_rating && parseFloat(item.avg_rating) > 0 && (
            <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[9px] font-black text-amber-400 shadow-md">
              ★ {parseFloat(item.avg_rating).toFixed(1)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[8px] font-black text-zinc-200 shadow-md">
            ⏱️ {prepTime}
          </span>
        </div>

        {/* Food Image Container */}
        <div 
          onClick={() => item.is_available && setIsDetailOpen(true)}
          className="relative pt-[62%] sm:pt-[68%] w-full overflow-hidden bg-zinc-55 dark:bg-zinc-800 cursor-pointer"
        >
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={handleImgError}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-505 bg-zinc-100 dark:bg-zinc-900">
              <Utensils size={30} className="opacity-80" />
            </div>
          )}

          {/* Out of Stock Overlay */}
          {!item.is_available && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-3 text-center">
              <AlertTriangle className="text-amber-500 mb-1 animate-bounce" size={22} />
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">{t('menu.outOfStock', 'Sold Out')}</p>
              <p className="text-[9px] text-zinc-300 font-bold mt-0.5">{t('menu.chefPreparing', 'Chef is restocked soon!')}</p>
            </div>
          )}
        </div>

        {/* Card details */}
        <div className="p-3.5 flex-grow flex flex-col justify-between gap-3 bg-white dark:bg-zinc-900">
          <div 
            onClick={() => item.is_available && setIsDetailOpen(true)}
            className="space-y-1 cursor-pointer"
          >
            <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-zinc-50 leading-tight line-clamp-1 group-hover:text-orange-500 transition-colors">
              {item.name}
            </h3>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-450 leading-snug line-clamp-2 h-8">
              {item.description}
            </p>
          </div>

          {/* Portion Selector pills */}
          {item.variants && item.variants.length > 0 && (
            <div className="flex flex-col gap-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/40">
              <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-505 uppercase tracking-widest block">
                {t('menu.portion', 'Portion')}
              </span>
              <div className="flex gap-1.5 mt-0.5">
                {item.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-orange-500 text-white shadow-md shadow-orange-500/15"
                          : "bg-zinc-50 dark:bg-zinc-855 border border-zinc-200/50 dark:border-zinc-700 text-zinc-655 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                      }`}
                    >
                      {v.variant_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 mt-auto">
            <div className="flex flex-col leading-none">
              <span className="text-[9px] text-zinc-400 dark:text-zinc-505 font-bold uppercase tracking-wider">
                {t('admin.itemPrice', 'Price')}
              </span>
              <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-white font-mono mt-0.5 leading-none">
                ₹{itemPrice}
              </span>
            </div>

            {!isOpen ? (
              <button
                disabled
                className="px-3.5 py-1.5 text-zinc-400 dark:text-zinc-505 font-bold text-[10px] sm:text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-800 rounded-xl cursor-not-allowed uppercase"
              >
                {t('menu.closed', 'Closed')}
              </button>
            ) : item.is_available ? (
              currentQuantity > 0 ? (
                <div className="flex items-center bg-orange-500 text-white rounded-xl shadow-md shadow-orange-500/15 border border-orange-600/10">
                  <button
                    type="button"
                    onClick={() => handleDecreaseQuantity(item.item_id, selectedVariant)}
                    className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer rounded-l-xl"
                  >
                    <Minus size={11} strokeWidth={3} />
                  </button>
                  <span className="text-xs font-black min-w-[20px] text-center">
                    {currentQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item, selectedVariant)}
                    className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer rounded-r-xl"
                  >
                    <Plus size={11} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAddToCart(item, selectedVariant)}
                  className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] sm:text-xs rounded-xl flex items-center gap-1 shadow-md shadow-orange-500/15 border border-orange-600/10 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus size={11} strokeWidth={3} />
                  <span>{t('menu.addToCart', 'Add')}</span>
                </button>
              )
            ) : (
              <button
                disabled
                className="px-3 py-1.5 text-zinc-400 dark:text-zinc-505 font-bold text-[10px] sm:text-xs bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl"
              >
                {t('menu.unavailable', 'Unavailable')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Premium Food Details Bottom Drawer / Modal */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <div 
            onClick={() => setIsDetailOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          ></div>

          {/* Slide up Drawer */}
          <div className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-t-[32px] md:rounded-3xl overflow-hidden p-6 max-h-[90vh] md:max-h-[85vh] overflow-y-auto shadow-2xl z-10 animate-slide-up border border-zinc-100 dark:border-zinc-850">
            
            {/* Close Button */}
            <button 
              onClick={() => setIsDetailOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/45 hover:bg-black/60 text-white flex items-center justify-center transition-all cursor-pointer z-20"
            >
              <X size={18} />
            </button>

            {/* Premium Header Banner Image */}
            <div className="relative -mx-6 -mt-6 pt-[60%] bg-zinc-100 dark:bg-zinc-800">
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.name} 
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={handleImgError}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-400 bg-zinc-50 dark:bg-zinc-900">
                  <Utensils size={40} className="opacity-50" />
                </div>
              )}

              {/* Tags overlay */}
              <div className="absolute bottom-4 left-4 flex gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-white shadow-md ${item.is_veg ? "bg-emerald-600" : "bg-rose-600"}`}>
                  {item.is_veg ? "🌱 Veg" : "🍖 Non-Veg"}
                </span>
                {item.avg_rating && parseFloat(item.avg_rating) > 0 && (
                  <span className="px-2 py-1 rounded-lg bg-black/75 text-[9px] font-black text-amber-400 shadow-md">
                    ★ {parseFloat(item.avg_rating).toFixed(1)} Rating
                  </span>
                )}
                <span className="px-2 py-1 rounded-lg bg-black/75 text-[9px] font-black text-zinc-200 shadow-md">
                  ⏱️ {prepTime} prep
                </span>
              </div>
            </div>

            {/* Food Info Body */}
            <div className="mt-5 space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-wide leading-tight">
                  {item.name}
                </h2>
                <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">
                  {item.category_name}
                </p>
              </div>

              <p className="text-[13px] font-semibold text-zinc-550 dark:text-zinc-400 leading-relaxed">
                {item.description}
              </p>

              {/* Ingredients List */}
              <div className="space-y-2 pt-1.5">
                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
                  🔍 Key Ingredients
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["Fresh Herbs", "Chef's Special Spices", "Local Produce", "Artisanal Dressing"].map((ing) => (
                    <span key={ing} className="px-3 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/40 dark:border-zinc-700/50 text-[10px] font-extrabold text-zinc-600 dark:text-zinc-300">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Variants Section */}
              {item.variants && item.variants.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/40">
                  <span className="text-[10px] font-black text-zinc-450 dark:text-zinc-505 uppercase tracking-widest block">
                    📏 Choose Portion size
                  </span>
                  <div className="flex gap-2.5">
                    {item.variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                              : "bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700 text-zinc-665 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                          }`}
                        >
                          {v.variant_name} - ₹{v.price}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add-ons Mockup Section */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/40">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-zinc-450 dark:text-zinc-505 uppercase tracking-widest">
                    ➕ Optional Add-ons (Future-Ready)
                  </span>
                  <span className="text-[9px] font-bold text-zinc-400">Select multiple</span>
                </div>
                <div className="space-y-2">
                  {[
                    { key: "cheese", label: "Extra Creamy Cheese", price: 20 },
                    { key: "sauce", label: "Premium Hot Sauce", price: 15 },
                  ].map((addon) => {
                    const isSelected = selectedAddons.includes(addon.label);
                    return (
                      <div 
                        key={addon.key} 
                        onClick={() => handleAddonClick(addon.label)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected 
                            ? "bg-orange-500/5 border-orange-500/50" 
                            : "bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200/60 dark:border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {}} // handled by div click
                            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer accent-orange-500"
                          />
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">{addon.label}</span>
                        </div>
                        <span className="text-xs font-black text-orange-600 dark:text-orange-400">+₹{addon.price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Safety Badges */}
              <div className="flex items-center gap-4 py-2 border-y border-zinc-100 dark:border-zinc-800/40 text-[10px] text-zinc-505 font-bold justify-center">
                <div className="flex items-center gap-1"><ShieldCheck size={14} className="text-emerald-500" /> Hygiene Safety Assured</div>
                <div className="flex items-center gap-1"><Heart size={14} className="text-rose-500" /> Freshly Prepared</div>
              </div>

              {/* Details Action Bar */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700 rounded-xl p-0.5 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setDetailQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-zinc-650 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors rounded-xl cursor-pointer"
                  >
                    <Minus size={13} strokeWidth={2.5} />
                  </button>
                  <span className="text-sm font-black text-zinc-900 dark:text-white min-w-[28px] text-center">
                    {detailQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDetailQuantity((q) => q + 1)}
                    className="w-10 h-10 flex items-center justify-center text-zinc-655 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors rounded-xl cursor-pointer"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                  </button>
                </div>

                <button
                  onClick={handleDetailAddToCart}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-sm rounded-xl flex items-center justify-between px-5 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span className="uppercase tracking-wider">Add to Table Order</span>
                  <span className="font-mono text-[15px]">₹{totalDetailPrice}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
});
MenuItemCard.displayName = 'MenuItemCard';

export default MenuItemCard;
