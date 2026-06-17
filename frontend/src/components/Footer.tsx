import React from "react";
import Link from "next/link";

const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-gray-100 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/60 backdrop-blur-sm transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center">
                <i className="fas fa-fire text-white text-[10px]"></i>
              </div>
              <span className="text-sm font-black text-gray-800 dark:text-white">
                Hot<span className="text-orange-500">Byte</span>
              </span>
            </div>
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 leading-relaxed max-w-[220px]">
              Smart digital menu &amp; ordering platform for modern restaurants.
            </p>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Company
            </span>
            <nav className="flex flex-col items-start gap-2">
              <Link
                href="/about"
                className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
              >
                About Us
              </Link>
              <Link
                href="/contact"
                className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
              >
                Contact Us
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Legal
            </span>
            <nav className="flex flex-col items-start gap-2">
              <Link
                href="/privacy-policy"
                className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-and-conditions"
                className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
              >
                Terms &amp; Conditions
              </Link>
              <Link
                href="/refund-policy"
                className="text-[12px] font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
              >
                Refund Policy
              </Link>
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 dark:bg-zinc-800/50 my-6" />

        {/* Copyright */}
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center select-none">
          &copy; 2026 HotByte. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
