import React from "react";
import { Minus, Plus, Utensils, AlertTriangle } from "lucide-react";
import { Leaf } from "lucide-react"; // Assuming Leaf icon is imported from lucide-react
import { useTranslation } from "react-i18next";
import "@/i18n";

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
}

interface Props {
  item: MenuItem;
  cart: { item_id: number; quantity: number }[];
  isOpen: boolean;
  handleAddToCart: (item: MenuItem) => void;
  handleDecreaseQuantity: (itemId: number) => void;
  handleImgError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

const MenuItemCard: React.FC<Props> = ({
  item,
  cart,
  isOpen,
  handleAddToCart,
  handleDecreaseQuantity,
  handleImgError,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`menu-card-hover bg-white dark:bg-zinc-900 border border-gray-150/40 dark:border-zinc-800/55 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300 ${
        item.is_available
          ? "hover:shadow-xl hover:shadow-orange-100 dark:hover:shadow-orange-950/10 hover:-translate-y-1"
          : "opacity-75"
      }`}
    >
      {/* Veg/Non-Veg Badge */}
      <div className="absolute top-2.5 left-2.5 z-10 flex gap-2">
        <span
          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide uppercase shadow-md ${
            item.is_veg ? "bg-emerald-600 text-white" : "bg-red-650 text-white"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
          {item.is_veg ? t('menu.veg', 'Veg') : t('menu.nonVeg', 'Non-Veg')}
        </span>
      </div>

      {/* Rating Badge */}
      {item.avg_rating && parseFloat(item.avg_rating) > 0 && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-bold text-yellow-400 shadow-md">
            <i className="fas fa-star text-[8px]"></i>
            {parseFloat(item.avg_rating).toFixed(1)}
          </span>
        </div>
      )}

      {/* Food Image Container */}
      <div className="menu-card-img-wrap !pt-[60%] sm:!pt-[70%]">
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
          <div className="menu-card-img-placeholder flex flex-col items-center justify-center text-gray-300 dark:text-gray-650">
            <Utensils size={28} />
          </div>
        )}

        {/* Out of Stock Overlay */}
        {!item.is_available && (
          <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center text-white p-2 text-center">
            <AlertTriangle className="text-yellow-500 mb-0.5" size={18} />
            <p className="text-[10px] font-black uppercase tracking-wider">{t('menu.outOfStock', 'Unavailable')}</p>
            <p className="text-[8px] opacity-75 mt-0.5">{t('menu.chefPreparing', 'Chef preparing more!')}</p>
          </div>
        )}
      </div>

      {/* Card details */}
      <div className="menu-card-body p-2 sm:p-3 flex-1 flex flex-col justify-between gap-1.5 sm:gap-2.5 bg-white dark:bg-zinc-900">
        <div className="space-y-0.5">
          <h3 className="font-extrabold text-[12px] sm:text-[13px] md:text-sm text-gray-900 dark:text-white leading-snug line-clamp-2">
            {item.name}
          </h3>
          <p className="text-[10px] sm:text-xs font-semibold text-gray-450 dark:text-gray-550 line-clamp-1 sm:line-clamp-2">
            {item.description}
          </p>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col leading-none">
            <span className="text-[8px] sm:text-[9px] text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wider">
              {t('admin.itemPrice', 'Price')}
            </span>
            <span className="text-sm sm:text-base font-black text-gray-900 dark:text-white mt-0.5 font-mono">
              ₹{item.price}
            </span>
          </div>
          {!isOpen ? (
            <button
              disabled
              className="px-2 sm:px-3 py-1.5 text-gray-400 dark:text-gray-550 font-bold text-[9px] sm:text-xs bg-gray-150 dark:bg-zinc-800 border border-gray-250 dark:border-zinc-800 rounded-lg flex items-center gap-1 cursor-not-allowed uppercase"
            >
              {t('menu.closed', 'Closed')}
            </button>
          ) : item.is_available ? (
            cart.find((i) => i.item_id === item.item_id) ? (
              <div className="flex items-center gap-1 sm:gap-1.5 bg-orange-50 dark:bg-orange-950/15 border border-orange-200 dark:border-orange-900/30 rounded-lg p-0.5 shadow-sm">
                <button
                  onClick={() => handleDecreaseQuantity(item.item_id)}
                  className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-md active:bg-orange-100 dark:active:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400 transition-colors cursor-pointer"
                >
                  <Minus size={10} />
                </button>
                <span className="text-[11px] sm:text-xs font-extrabold text-orange-950 dark:text-orange-100 min-w-[12px] text-center">
                  {cart.find((i) => i.item_id === item.item_id)?.quantity}
                </span>
                <button
                  onClick={() => handleAddToCart(item)}
                  className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-md active:bg-orange-100 dark:active:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400 transition-colors cursor-pointer"
                >
                  <Plus size={10} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleAddToCart(item)}
                className="px-2 sm:px-3 py-1.5 text-white font-bold text-[9px] sm:text-xs rounded-lg flex items-center gap-1 btn-orange cursor-pointer"
              >
                <Plus size={10} />
                <span>{t('menu.addToCart', 'Add')}</span>
              </button>
            )
          ) : (
            <button
              disabled
              className="px-2 sm:px-3 py-1.5 text-gray-400 font-bold text-[9px] sm:text-xs bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800 rounded-lg flex items-center gap-1"
            >
              {t('menu.unavailable', 'Unavailable')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
