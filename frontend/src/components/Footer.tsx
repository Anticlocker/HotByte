import React from "react";
import Link from "next/link";

interface FooterProps {
  dark?: boolean;
}

const Footer: React.FC<FooterProps> = ({ dark }) => {
  const footerCls = dark
    ? "w-full border-t border-gray-900 bg-[#050507]/40 backdrop-blur-md transition-colors duration-300"
    : "w-full border-t border-gray-100 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/60 backdrop-blur-sm transition-colors duration-300";

  const brandTextCls = dark
    ? "text-sm font-black text-white"
    : "text-sm font-black text-gray-800 dark:text-white";

  const descTextCls = dark
    ? "text-[11px] font-semibold text-gray-500 leading-relaxed max-w-[220px]"
    : "text-[11px] font-semibold text-gray-400 dark:text-gray-500 leading-relaxed max-w-[220px]";

  const sectionTitleCls = dark
    ? "text-[10px] font-bold text-gray-500 uppercase tracking-widest"
    : "text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest";

  const linkCls = dark
    ? "text-[12px] font-semibold text-gray-400 hover:text-orange-500 transition-colors"
    : "text-[12px] font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors";

  const dividerCls = dark
    ? "h-px bg-gray-900/50 my-6"
    : "h-px bg-gray-100 dark:bg-zinc-800/50 my-6";

  const copyrightCls = dark
    ? "text-[11px] font-bold text-gray-500 uppercase tracking-widest text-center select-none"
    : "text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center select-none";

  return (
    <footer className={footerCls}>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center">
                <i className="fas fa-fire text-white text-[10px]"></i>
              </div>
              <span className={brandTextCls}>
                Hot<span className="text-orange-500">Byte</span>
              </span>
            </div>
            <p className={descTextCls}>
              Smart digital menu &amp; ordering platform for modern restaurants.
            </p>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-3">
            <span className={sectionTitleCls}>
              Company
            </span>
            <nav className="flex flex-col items-start gap-2">
              <Link
                href="/about"
                className={linkCls}
              >
                About Us
              </Link>
              <Link
                href="/contact"
                className={linkCls}
              >
                Contact Us
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <span className={sectionTitleCls}>
              Legal
            </span>
            <nav className="flex flex-col items-start gap-2">
              <Link
                href="/privacy-policy"
                className={linkCls}
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-and-conditions"
                className={linkCls}
              >
                Terms &amp; Conditions
              </Link>
              <Link
                href="/refund-policy"
                className={linkCls}
              >
                Refund Policy
              </Link>
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className={dividerCls} />

        {/* Copyright */}
        <p className={copyrightCls}>
          &copy; 2026 HotByte. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
