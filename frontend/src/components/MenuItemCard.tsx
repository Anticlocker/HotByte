import React, { useState } from "react";
import { Minus, Plus, Utensils, AlertTriangle } from "lucide-react";
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
  
  // Local state for variant selection, defaults to first variant if exists
  const [selectedVariant, setSelectedVariant] = useState<MenuItemVariant | undefined>(
    item.variants && item.variants.length > 0 ? item.variants[0] : undefined
  );

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

  return (
    <div
      className={`menu-card-hover bg-white dark:bg-zinc-900 border border-gray-100/40 dark:border-zinc-800/55 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300 ${
        item.is_available
          ? "hover:shadow-xl hover:shadow-orange-100 dark:hover:shadow-orange-950/10 hover:-translate-y-1"
          : "opacity-75"
      }`}
    >
      {/* Veg/Non-Veg Badge */}
      <div className="absolute top-2.5 left-2.5 z-10 flex gap-2">
        <span
          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide uppercase shadow-md ${
            item.is_veg ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          {item.is_veg ? t('menu.veg', 'Veg') : t('menu.nonVeg', 'Non-Veg')}
        </span>
      </div>

      {/* Rating Badge */}
      {item.avg_rating && parseFloat(item.avg_rating) > 0 && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-bold text-yellow-400 shadow-md">
            <i className="fas fa-star text-[9px]"></i>
            {parseFloat(item.avg_rating).toFixed(1)}
          </span>
        </div>
      )}

      {/* Food Image Container */}
      <div className="menu-card-img-wrap pt-[60%] sm:pt-[70%]">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={handleImgError}
          />
        ) : (
          <div className="menu-card-img-placeholder flex flex-col items-center justify-center text-gray-300 dark:text-gray-500">
            <Utensils size={28} />
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!item.is_available && (
          <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center text-white p-2 text-center">
            <AlertTriangle className="text-yellow-500 mb-0.5" size={18} />
            <p className="text-[10px] font-black uppercase tracking-wider">{t('menu.outOfStock', 'Unavailable')}</p>
            <p className="text-[10px] opacity-75 mt-0.5">{t('menu.chefPreparing', 'Chef preparing more!')}</p>
          </div>
        )}
      </div>

      {/* Card details */}
      <div className="menu-card-body p-2 sm:p-3 flex-1 flex flex-col justify-between gap-1.5 sm:gap-2.5 bg-white dark:bg-zinc-900">
        <div className="space-y-0.5">
          <h3 className="font-extrabold text-[12px] sm:text-[13px] md:text-sm text-gray-900 dark:text-white leading-snug line-clamp-2">
            {item.name}
          </h3>
          <p className="text-[9px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 line-clamp-1 sm:line-clamp-2">
            {item.description}
          </p>
        </div>

        {/* Portion Selector pills */}
        {item.variants && item.variants.length > 0 && (
          <div className="flex flex-col gap-1 mt-1 border-t border-gray-100 dark:border-zinc-800/40 pt-2 pb-0.5">
            <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              Choose Portion:
            </span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {item.variants.map((v) => {
                const isSelected = selectedVariant?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-gray-50 dark:bg-zinc-800 border border-gray-200/50 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {v.variant_name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col leading-none">
            <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              {t('admin.itemPrice', 'Price')}
            </span>
            <span className="text-sm sm:text-base font-black text-gray-900 dark:text-white mt-0.5 font-mono">
              ₹{selectedVariant ? selectedVariant.price : item.price}
            </span>
          </div>
          {!isOpen ? (
            <button
              disabled
              className="px-2 sm:px-3 py-1.5 text-gray-400 dark:text-gray-500 font-bold text-[9px] sm:text-xs bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800 rounded-lg flex items-center gap-1 cursor-not-allowed uppercase"
            >
              {t('menu.closed', 'Closed')}
            </button>
          ) : item.is_available ? (
            currentQuantity > 0 ? (
              <div className="flex items-center gap-1 sm:gap-1.5 bg-orange-50 dark:bg-orange-950/15 border border-orange-200 dark:border-orange-900/30 rounded-lg p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => handleDecreaseQuantity(item.item_id, selectedVariant)}
                  className="w-9 h-9 sm:w-9 sm:h-9 rounded-md active:bg-orange-100 dark:active:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400 transition-colors cursor-pointer touch-action-manipulation"
                >
                  <Minus size={14} />
                </button>
                <span className="text-[11px] sm:text-xs font-extrabold text-orange-950 dark:text-orange-100 min-w-[18px] text-center">
                  {currentQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleAddToCart(item, selectedVariant)}
                  className="w-9 h-9 sm:w-9 sm:h-9 rounded-md active:bg-orange-100 dark:active:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400 transition-colors cursor-pointer touch-action-manipulation"
                >
                  <Plus size={11} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleAddToCart(item, selectedVariant)}
                className="px-2 sm:px-3 py-1.5 text-white font-bold text-[9px] sm:text-xs rounded-lg flex items-center gap-1 btn-orange cursor-pointer"
              >
                <Plus size={10} />
                <span>{t('menu.addToCart', 'Add')}</span>
              </button>
            )
          ) : (
            <button
              disabled
              className="px-2 sm:px-3 py-1.5 text-gray-400 dark:text-gray-500 font-bold text-[9px] sm:text-xs bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800 rounded-lg flex items-center gap-1"
            >
              {t('menu.unavailable', 'Unavailable')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default MenuItemCard;
