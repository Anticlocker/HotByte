import type { Metadata } from "next";
import CustomerNavbar from "@/components/CustomerNavbar";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin, MessageSquare, Send } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact HotByte",
  description: "Get in touch with the HotByte team for support, partnerships, or general enquiries.",
};

export default function Contact() {
  return (
    <div className="mesh-gradient min-h-screen flex flex-col justify-between selection:bg-orange-100 selection:text-orange-700 bg-white dark:bg-[#0b0d11] transition-colors duration-300 pt-14">
      <CustomerNavbar hideActions />

      <main className="flex-grow max-w-[900px] mx-auto w-full px-6 py-12 relative overflow-hidden">
        {/* Glow elements */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/20 text-orange-500 items-center justify-center shadow-inner mb-4">
            <MessageSquare size={24} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Contact HotByte
          </h1>
          <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
            We&apos;re here to help. Reach out for support, partnerships, or general queries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Info Card */}
          <div className="bg-white/70 dark:bg-zinc-900/60 border border-gray-150/40 dark:border-zinc-800/40 shadow-2xl backdrop-blur-xl p-8 rounded-[28px] animate-fade-in-up space-y-6">
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
              Business Information
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center flex-shrink-0">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Support Email</p>
                  <a
                    href="mailto:support@hotbyte.in"
                    className="text-sm font-bold text-orange-500 hover:underline"
                  >
                    support@hotbyte.in
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center flex-shrink-0">
                  <Phone size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Business Contact</p>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">+91 93569 18260</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Registered Address</p>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    HotByte Technologies<br />
                    Mental Corner, Vishrantwadi, Pune<br />
                    Maharashtra – 411015, India
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100 dark:bg-zinc-800/50" />

            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-relaxed">
                Our team typically responds within <span className="font-black text-orange-500">24 hours</span> on business days. For urgent issues, please email us directly.
              </p>
            </div>
          </div>

          {/* Contact Form Card */}
          <div className="bg-white/70 dark:bg-zinc-900/60 border border-gray-150/40 dark:border-zinc-800/40 shadow-2xl backdrop-blur-xl p-8 rounded-[28px] animate-fade-in-up">
            <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight mb-6">
              Send a Message
            </h2>

            <form
              action="mailto:support@hotbyte.in"
              method="get"
              encType="text/plain"
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="contact-name"
                  className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5"
                >
                  Your Name
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. you@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="body"
                  required
                  rows={5}
                  placeholder="Describe your query or issue..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                id="contact-submit-btn"
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black py-3.5 rounded-xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-orange-500/20"
              >
                <Send size={15} />
                Send Message
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
