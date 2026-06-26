import type { Metadata } from "next";
import CustomerNavbar from "@/components/CustomerNavbar";
import Footer from "@/components/Footer";
import { Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | HotByte",
  description:
    "HotByte privacy policy detailing how we collect, use, and protect your data on our digital menu and ordering platform.",
};

export default function PrivacyPolicy() {
  return (
    <div className="relative z-0 bg-[#050507] min-h-screen flex flex-col justify-between text-white font-sans selection:bg-orange-500/30 overflow-x-hidden antialiased">
      <CustomerNavbar hideActions />

      <main className="flex-grow max-w-[800px] mx-auto w-full px-6 py-12 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="glass-card-dark rounded-3xl border border-gray-900/60 p-8 md:p-12 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center shadow-inner">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Privacy Policy
              </h1>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
                Last Updated: June 2026
              </p>
            </div>
          </div>

          <div className="h-px bg-gray-900/50 my-6" />

          <div className="space-y-6 text-sm text-gray-300 font-semibold leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                1. Information We Collect
              </h2>
              <p>
                We collect information necessary to provide and improve the HotByte
                platform. This includes:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong className="text-gray-100">Account data:</strong>{" "}
                  Name, email address, phone number, and Google SSO profile information
                  when you register or authenticate.
                </li>
                <li>
                  <strong className="text-gray-100">Order data:</strong>{" "}
                  Menu items ordered, table number, order timestamps, and payment
                  transaction IDs (processed via Razorpay).
                </li>
                <li>
                  <strong className="text-gray-100">Hotel data:</strong>{" "}
                  Restaurant name, address, branding assets, menu items, pricing, and
                  admin account credentials (hashed).
                </li>
                <li>
                  <strong className="text-gray-100">Device data:</strong>{" "}
                  IP address, browser user-agent, and language preference for session
                  management and localisation.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                2. How We Use Your Information
              </h2>
              <p>Your data is used exclusively for the following purposes:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Processing and delivering food orders to the restaurant kitchen.</li>
                <li>Authenticating your identity via OTP or Google SSO.</li>
                <li>Managing hotel subscriptions, billing, and account access.</li>
                <li>Sending transactional notifications related to orders and account status.</li>
                <li>Generating anonymised sales analytics for restaurant partners.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                3. Data Storage &amp; Security
              </h2>
              <p>
                All data is stored securely on Neon PostgreSQL databases with encrypted
                connections (SSL/TLS). Session tokens are cryptographically signed and
                stored as HttpOnly cookies. Passwords are hashed using bcrypt with a
                cost factor of 12. We implement industry-standard security headers
                (Helmet CSP), rate limiting, and CORS policies to protect against
                common web vulnerabilities.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                4. Third-Party Integrations
              </h2>
              <p>
                HotByte integrates with the following third-party services:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong className="text-gray-100">Razorpay:</strong>{" "}
                  Payment processing for subscription billing and customer orders.
                  We do not store full card details; all payment data is handled by
                  Razorpay&apos;s PCI-compliant infrastructure.
                </li>
                <li>
                  <strong className="text-gray-100">Google Identity Services:</strong>{" "}
                  SSO authentication. We receive only the profile information you
                  authorise (name, email, avatar).
                </li>
                <li>
                  <strong className="text-gray-100">MessageCentral:</strong>{" "}
                  SMS-based OTP verification. Phone numbers are used solely for
                  authentication and are not shared with third parties.
                </li>
                <li>
                  <strong className="text-gray-100">Bunny CDN:</strong>{" "}
                  Image storage and delivery for menu item photos and branding assets.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                5. Data Retention
              </h2>
              <p>
                We retain your data for as long as your account is active or as needed
                to provide the service. After account deletion or subscription
                termination, we retain limited data for up to 90 days for legal and
                audit purposes, after which it is permanently anonymised or deleted.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                6. Your Rights
              </h2>
              <p>
                You have the right to access, correct, or delete your personal data at
                any time. Hotel partners can update their information from the admin
                dashboard. Customers may contact us to request data deletion. To
                exercise these rights, email{" "}
                <a
                  href="mailto:support@hotbyte.in"
                  className="text-orange-400 hover:underline font-bold"
                >
                  support@hotbyte.in
                </a>.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                7. Cookies &amp; Local Storage
              </h2>
              <p>
                We use HttpOnly cookies for session management and localStorage for
                user preferences (language and theme). No third-party tracking cookies
                are used. You can clear this data at any time from your browser settings.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                8. Contact
              </h2>
              <p>
                For privacy-related inquiries, contact us at{" "}
                <a
                  href="mailto:support@hotbyte.in"
                  className="text-orange-400 hover:underline font-bold"
                >
                  support@hotbyte.in
                </a>{" "}
                or visit our{" "}
                <a
                  href="/contact"
                  className="text-orange-400 hover:underline font-bold"
                >
                  Contact page
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer dark />
    </div>
  );
}
