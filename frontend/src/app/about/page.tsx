import type { Metadata } from "next";
import CustomerNavbar from "@/components/CustomerNavbar";
import Footer from "@/components/Footer";
import { Building2, QrCode, ChefHat, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "About HotByte | Digital Menu & Restaurant Ordering Platform",
  description:
    "Learn about HotByte — the smart digital menu and QR ordering platform transforming the dining experience for restaurants and their customers.",
};

export default function About() {
  return (
    <div className="relative z-0 bg-[#050507] min-h-screen flex flex-col justify-between text-white font-sans selection:bg-orange-500/30 overflow-x-hidden antialiased">
      <CustomerNavbar hideActions />

      <main className="flex-grow max-w-[900px] mx-auto w-full px-6 py-12 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-400 items-center justify-center shadow-inner mb-4">
            <Building2 size={24} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            About HotByte
          </h1>
          <p className="mt-2 text-sm font-semibold text-gray-400">
            Powering the future of contactless dining.
          </p>
        </div>

        {/* Mission */}
        <div className="glass-card-dark rounded-3xl border border-gray-900/60 p-8 md:p-12 animate-fade-in-up mb-6">
          <h2 className="text-xl font-black text-white tracking-tight mb-4">
            Our Mission
          </h2>
          <p className="text-sm font-semibold text-gray-300 leading-relaxed">
            HotByte was built to modernise the way restaurants serve their guests.
            We replace paper menus and manual ordering with fast, contactless QR-based
            digital menus. Customers scan a QR code, browse the menu, customise their
            order, and pay — all from their own phone. Restaurants get a live kitchen
            display system, real-time analytics, and full control over their menu and
            pricing. Our platform supports Google SSO for secure authentication,
            Razorpay for payments, and multi-language localisation for Hindi and
            Marathi speakers.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { icon: QrCode, label: "QR Menus Deployed", value: "500+" },
            { icon: ChefHat, label: "Restaurant Partners", value: "50+" },
            { icon: Globe, label: "Languages Supported", value: "3" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card-dark rounded-2xl border border-gray-900/60 p-6 text-center"
            >
              <div className="inline-flex w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 items-center justify-center shadow-inner mb-3">
                <stat.icon size={20} />
              </div>
              <p className="text-2xl font-black text-white">
                {stat.value}
              </p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Story */}
        <div className="glass-card-dark rounded-3xl border border-gray-900/60 p-8 md:p-12 animate-fade-in-up">
          <h2 className="text-xl font-black text-white tracking-tight mb-4">
            Our Story
          </h2>
          <p className="text-sm font-semibold text-gray-300 leading-relaxed mb-4">
            HotByte started with a simple observation: restaurant menus were stuck in the
            past. Physical menus are expensive to print, hard to update, and unhygienic.
            Ordering requires staff attention, creates communication gaps, and slows down
            the table turnover cycle.
          </p>
          <p className="text-sm font-semibold text-gray-300 leading-relaxed mb-4">
            We built HotByte to give every restaurant — from a small dhaba to a
            multi-cuisine fine-dining chain — a professional digital presence at
            zero upfront cost. Our subscription model (Trial, Basic, Pro) ensures that
            even the smallest eatery can offer contactless ordering, dynamic QR menus,
            and direct-to-kitchen order routing.
          </p>
          <p className="text-sm font-semibold text-gray-300 leading-relaxed">
            Today, HotByte serves hundreds of hotels across India with features like
            real-time KDS (Kitchen Display System), Razorpay payment gateway, automatic
            trial-to-subscription management, and detailed sales analytics. We are
            committed to making dining smarter, faster, and safer for everyone.
          </p>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {[
            {
              title: "Privacy First",
              desc: "We encrypt all sessions and never sell customer data. Google SSO ensures no password fatigue.",
            },
            {
              title: "Academic Project",
              desc: "Built by the team at HotByte Technologies, Mental Corner, Vishrantwadi, Pune — 411015, as part of their vision to transform digital dining.",
            },
            {
              title: "Subscription Flexibility",
              desc: "Start with a free trial, upgrade to Basic or Pro as your restaurant grows. Cancel anytime.",
            },
            {
              title: "Made for India",
              desc: "Built with Indian restaurant workflows in mind, supporting Hindi, Marathi, and English.",
            },
          ].map((value) => (
            <div
              key={value.title}
              className="glass-card-dark rounded-2xl border border-gray-900/60 p-6"
            >
              <h3 className="text-sm font-black text-white tracking-tight mb-1">
                {value.title}
              </h3>
              <p className="text-xs font-semibold text-gray-400 leading-relaxed">
                {value.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
