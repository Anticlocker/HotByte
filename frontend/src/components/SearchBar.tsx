import React, { useState, useRef, useEffect } from "react";
import { Search, Leaf, X, Clock, ArrowRight, TrendingUp } from "lucide-react";
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
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggestions for quick search
  const suggestions = [
    t('search.paneer', 'Paneer'),
    t('search.pizza', 'Pizza'),
    t('search.burger', 'Burger'),
    t('search.noodles', 'Noodles'),
    t('search.dessert', 'Dessert'),
    t('search.mocktail', 'Mocktail')
  ];

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hotbyte_recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (err) {}
  }, []);

  const handleSearchSubmit = (query: string) => {
    if (!query.trim()) return;
    const cleanQuery = query.trim();
    setSearchQuery(cleanQuery);
    
    // Update recent searches
    const updated = [cleanQuery, ...recentSearches.filter((s) => s !== cleanQuery)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem("hotbyte_recent_searches", JSON.stringify(updated));
    } catch (err) {}
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (query: string) => {
    setSearchQuery(query);
    handleSearchSubmit(query);
  };

  const handleRemoveRecent = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== query);
    setRecentSearches(updated);
    try {
      localStorage.setItem("hotbyte_recent_searches", JSON.stringify(updated));
    } catch (err) {}
  };

  return (
    <div className="relative w-full space-y-2.5">
      {/* Input container */}
      <div
        className={`flex items-center h-12 w-full rounded-2xl border bg-white dark:bg-zinc-900 transition-all duration-300 shadow-sm px-3.5 ${
          isFocused
            ? "border-orange-500 dark:border-orange-500/60 ring-4 ring-orange-500/10"
            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700"
        }`}
      >
        <Search size={18} className={`shrink-0 ${isFocused ? "text-orange-500" : "text-zinc-400 dark:text-zinc-500"}`} />
        
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearchSubmit(searchQuery);
              inputRef.current?.blur();
            }
          }}
          onFocus={() => setIsFocused(true)}
          // Slight delay to allow clicking suggestions/recents dropdown
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={t('menu.searchPlaceholder', 'Search delicious food, drinks, desserts...')}
          className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 py-2.5 px-3"
        />

        {searchQuery && (
          <button
            onClick={handleClear}
            className="w-5 h-5 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors mr-2 cursor-pointer"
          >
            <X size={10} strokeWidth={2.5} />
          </button>
        )}

        {/* Veg Only Toggle Pill inside SearchBar */}
        {hotelType === "both" && (
          <div className="flex items-center shrink-0 h-full border-l border-zinc-100 dark:border-zinc-800 pl-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsVegOnly(!isVegOnly);
              }}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer select-none ${
                isVegOnly
                  ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/10"
                  : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:text-emerald-500"
              }`}
            >
              <Leaf size={11} className={isVegOnly ? "fill-white text-white" : ""} />
              <span>{t('menu.veg', 'Veg')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Suggestion Chips & Recent Searches Dropdown Panel */}
      {isFocused && (
        <div className="absolute inset-x-0 top-13 bg-white dark:bg-zinc-950 border border-zinc-150/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in space-y-4">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="space-y-2">
              <span className="text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest block">
                {t('search.recent', 'Recent Searches')}
              </span>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((s) => (
                  <div
                    key={s}
                    onClick={() => handleSuggestionClick(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:border-orange-500 transition-colors"
                  >
                    <Clock size={11} className="text-zinc-400" />
                    <span>{s}</span>
                    <button
                      onClick={(e) => handleRemoveRecent(e, s)}
                      className="w-4 h-4 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-650"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular Suggestions */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <TrendingUp size={11} className="text-orange-500" />
              <span className="text-[9px] font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest block">
                {t('search.popular', 'Popular Searches')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestionClick(s)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-orange-50 dark:hover:bg-orange-500/10 border border-zinc-150/40 dark:border-zinc-800/40 text-xs font-bold text-zinc-650 dark:text-zinc-400 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-500/40 transition-all cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
