import React, { useState, useRef } from "react";
import { Search, Leaf, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isVegOnly: boolean;
  setIsVegOnly: (v: boolean) => void;
  hotelType: "veg" | "nonveg" | "both";
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  isVegOnly,
  setIsVegOnly,
  hotelType,
}) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery("");
    inputRef.current?.focus();
  };

  return (
    <div
      className={`flex items-center h-11 rounded-full border bg-white dark:bg-zinc-900/80 transition-all duration-300 relative shadow-sm max-w-full ${
        isFocused
          ? "border-orange-500 dark:border-orange-500/60 ring-2 ring-orange-500/15 w-44 sm:w-60"
          : "border-gray-200 dark:border-zinc-805 hover:border-gray-300 dark:hover:border-zinc-700 w-36 sm:w-48"
      }`}
    >
      <div className="flex items-center justify-center w-8 h-8 shrink-0 text-gray-400 dark:text-gray-550 pl-1.5">
        <Search size={14} className={isFocused ? "text-orange-500" : ""} />
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={t('menu.searchPlaceholder', 'Search dishes...')}
        className="w-full bg-transparent border-0 outline-none text-[11px] font-semibold text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 py-2 pr-6 pl-0"
      />

      {searchQuery && (
        <button
          onClick={handleClear}
          className="absolute right-9 top-1/2 -translate-y-1/2 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-550 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <X size={9} />
        </button>
      )}

      {/* Embedded Veg Only Toggle on the right */}
      {hotelType === "both" && (
        <div className="flex items-center shrink-0 pr-1 h-full">
          <div className="w-[1px] h-4 bg-gray-200 dark:bg-zinc-800 mx-1 shrink-0" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsVegOnly(!isVegOnly);
            }}
            title={t('menu.vegOnly', 'Veg Only')}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 select-none active:scale-90 ${
              isVegOnly
                ? "bg-emerald-500/15 text-emerald-555 dark:text-emerald-400"
                : "text-gray-455 dark:text-gray-500 hover:text-emerald-500"
            }`}
          >
            <Leaf
              size={14}
              className={`transition-all duration-200 ${
                isVegOnly ? "fill-emerald-500/10 text-emerald-500 dark:text-emerald-400" : ""
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
