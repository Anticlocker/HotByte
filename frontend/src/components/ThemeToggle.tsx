"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("hotbyte_theme") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("hotbyte_theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  };

  if (!mounted) {
    return <div className="w-16 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse opacity-50"></div>;
  }

  return (
    <button
      onClick={toggleTheme}
      className="group relative w-16 h-8 rounded-full bg-gradient-to-r from-slate-200 to-slate-100 dark:from-zinc-900 dark:to-zinc-800 border border-slate-300/40 dark:border-zinc-700/50 shadow-inner flex items-center justify-between px-1.5 cursor-pointer outline-none transition-all duration-300 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-orange-500/20 select-none"
      title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
    >
      {/* Halo Glow effect */}
      <span className="absolute inset-0 w-full h-full rounded-full opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 bg-orange-500/5 blur-md"></span>

      {/* Track Indicator Icons (fixed background) */}
      <Sun size={12} className="text-amber-500 font-bold transition-opacity duration-300 dark:opacity-30" />
      <Moon size={12} className="text-indigo-400 font-bold transition-opacity duration-300 opacity-30 dark:opacity-100" />

      {/* Sliding Glowing Knob */}
      <span
        className={`absolute top-0.5 left-0.5 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 ease-out shadow-md border ${
          theme === "dark"
            ? "translate-x-8 bg-zinc-950 border-zinc-800 text-indigo-400 shadow-indigo-500/10"
            : "translate-x-0 bg-gradient-to-tr from-amber-400 to-orange-500 border-amber-300 text-white shadow-orange-500/20"
        }`}
      >
        {theme === "dark" ? (
          <Moon size={13} className="animate-spin-slow rotate-12" />
        ) : (
          <Sun size={13} className="animate-spin-slow" />
        )}
      </span>
    </button>
  );
}
