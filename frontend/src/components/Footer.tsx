import React from "react";
import Link from "next/link";

const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-gray-100 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/60 backdrop-blur-sm transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand + copyright */}
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest select-none">
          © 2026{" "}
          <span className="text-orange-500 font-black">HotByte</span>. All
          Rights Reserved.
        </p>

        {/* Navigation links */}
        <nav className="flex items-center gap-1">
          {[
            { href: "/privacy-policy", label: "Privacy Policy" },
            { href: "/terms-and-conditions", label: "Terms & Conditions" },
            { href: "/contact", label: "Contact Us" },
          ].map((link, i, arr) => (
            <span key={link.href} className="flex items-center">
              <Link
                href={link.href}
                className="text-[11px] font-bold text-gray-400 dark:text-gray-500 hover:text-orange-500 dark:hover:text-orange-400 uppercase tracking-wider transition-colors duration-200 px-2 py-1"
              >
                {link.label}
              </Link>
              {i < arr.length - 1 && (
                <span className="w-px h-3 bg-gray-200 dark:bg-zinc-700 flex-shrink-0" />
              )}
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
