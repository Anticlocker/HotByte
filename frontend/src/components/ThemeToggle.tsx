"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  currentTheme?: string;
  onToggle?: (newTheme: string) => void;
}

export default function ThemeToggle({ currentTheme, onToggle }: ThemeToggleProps) {
  const [localTheme, setLocalTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!currentTheme) {
      const savedTheme = localStorage.getItem("hotbyte_theme") || "dark";
      setLocalTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [currentTheme]);

  const activeTheme = currentTheme || localTheme;

  const toggleTheme = () => {
    const nextTheme = activeTheme === "dark" ? "light" : "dark";
    if (onToggle) {
      onToggle(nextTheme);
    } else {
      setLocalTheme(nextTheme);
      localStorage.setItem("hotbyte_theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      }
    }
  };

  if (!mounted) {
    return <div className="w-11 h-6 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse opacity-50"></div>;
  }

  return (
    <button
      onClick={toggleTheme}
      className="group relative w-11 h-6 rounded-full bg-gray-200 dark:bg-slate-700/80 border border-gray-300/30 dark:border-slate-600/50 shadow-inner flex items-center cursor-pointer outline-none transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:ring-offset-2 select-none"
      title={`Switch to ${activeTheme === "dark" ? "Light" : "Dark"} Mode`}
      aria-label={`Switch to ${activeTheme === "dark" ? "Light" : "Dark"} Mode`}
    >
      {/* Sliding Knob */}
      <span
        className={`absolute top-[1px] left-[1px] w-[22px] h-[22px] rounded-full flex items-center justify-center transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) shadow-sm border ${
          activeTheme === "dark"
            ? "translate-x-[20px] bg-slate-900 border-slate-800 shadow-indigo-500/10"
            : "translate-x-0 bg-white border-gray-200 shadow-orange-500/10"
        }`}
      >
        {activeTheme === "dark" ? (
          <Moon size={11} className="text-indigo-300 transition-transform duration-300" />
        ) : (
          <Sun size={11} className="text-amber-500 transition-transform duration-300" />
        )}
      </span>
    </button>
  );
}
