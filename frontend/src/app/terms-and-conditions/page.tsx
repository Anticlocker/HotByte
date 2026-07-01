import type { Metadata } from "next";
import CustomerNavbar from "@/components/CustomerNavbar";
import Footer from "@/components/Footer";
import { Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions | HotByte",
  description:
    "Read the Terms and Conditions governing your use of the HotByte digital menu and ordering platform.",
};

export default function TermsAndConditions() {
  return (
    <div className="relative z-0 bg-[#050507] min-h-screen flex flex-col justify-between text-white font-sans selection:bg-orange-500/30 overflow-x-hidden antialiased">
      <CustomerNavbar hideActions />

      <main className="flex-grow max-w-[800px] mx-auto w-full px-6 py-12 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="glass-card-dark rounded-3xl border border-gray-900/60 p-8 md:p-12 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center shadow-inner">
              <Scale size={22} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Terms &amp; Conditions
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
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using the HotByte platform, you agree to be bound by
                these Terms and Conditions and our Privacy Policy. If you do not agree,
                please discontinue use immediately. These terms apply to all users
                including customers, hotel administrators, and super administrators.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                2. Platform Services
              </h2>
              <p>
                HotByte provides a digital menu and ordering platform to registered
                hotel partners. Core services include:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>QR-code-based digital menus accessible from customer mobile devices.</li>
                <li>Online ordering with real-time routing to the kitchen display system.</li>
                <li>Google SSO and OTP-based customer authentication.</li>
                <li>Admin dashboard for menu management, order tracking, and sales analytics.</li>
                <li>Razorpay payment gateway integration for secure transactions.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                3. User Responsibilities
              </h2>
              <p>
                Customers agree to provide accurate information when placing orders and
                authenticating. Hotel administrators are responsible for maintaining the
                confidentiality of their login credentials and for all activities
                conducted under their account. Misuse of the platform, including
                attempted unauthorised access, data scraping, or disruption of services,
                is strictly prohibited.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                4. Subscriptions &amp; Billing
              </h2>
              <p>
                Hotel partners subscribe to HotByte under defined pricing tiers:
                Trial (14-day free), Basic (₹999/month), and Pro (₹2,499/month).
                All payments are processed securely via Razorpay. Subscription fees
                are non-refundable as detailed in our Refund Policy. Failure to renew
                will result in restricted access to the admin dashboard; customer-facing
                menus may also be frozen until the account is reactivated.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                5. Google SSO &amp; Authentication
              </h2>
              <p>
                Customers may log in using Google Single Sign-On. By using Google SSO,
                you authorise HotByte to receive your name, email address, and profile
                picture from Google. This information is used solely for authentication
                and is stored securely. You may revoke this access at any time from
                your Google Account settings.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                6. Intellectual Property
              </h2>
              <p>
                All branding, source code, design elements, and content within the
                HotByte platform are the exclusive intellectual property of HotByte
                and its licensors. Reproduction, redistribution, or reverse engineering
                is prohibited without express written permission. Hotel partners retain
                ownership of their menu content and branding assets.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                7. Limitation of Liability
              </h2>
              <p>
                HotByte shall not be liable for any indirect, incidental, or
                consequential damages arising from your use of the platform, including
                but not limited to order errors, payment disputes, or service
                interruptions. Service availability is provided on a best-effort basis
                and may be subject to scheduled maintenance. HotByte is not responsible
                for the quality or preparation of food items ordered through the platform.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                8. Termination
              </h2>
              <p>
                HotByte reserves the right to suspend or terminate access to the
                platform for any violation of these Terms, including fraudulent
                activity, abuse of the ordering system, or non-payment of subscription
                fees. Customers may delete their account at any time by contacting
                support.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                9. Modifications
              </h2>
              <p>
                HotByte reserves the right to update these Terms at any time. Changes
                will be posted on this page with an updated revision date. Continued
                use of the platform following any changes constitutes your acceptance
                of the revised Terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                10. Contact
              </h2>
              <p>
                For any queries regarding these Terms, please contact us at{" "}
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
