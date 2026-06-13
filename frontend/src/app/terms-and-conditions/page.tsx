import type { Metadata } from "next";
import CustomerNavbar from "@/components/CustomerNavbar";
import Footer from "@/components/Footer";
import { Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "HotByte Terms & Conditions",
  description: "Read the Terms and Conditions governing your use of the HotByte platform.",
};

export default function TermsAndConditions() {
  return (
    <div className="mesh-gradient min-h-screen flex flex-col justify-between selection:bg-orange-100 selection:text-orange-700 bg-white dark:bg-[#0b0d11] transition-colors duration-300">
      <CustomerNavbar />

      <main className="flex-grow max-w-[800px] mx-auto w-full px-6 py-12 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="bg-white/70 dark:bg-zinc-900/60 border border-gray-150/40 dark:border-zinc-800/40 shadow-2xl backdrop-blur-xl p-8 md:p-12 rounded-[32px] animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/20 text-orange-500 flex items-center justify-center shadow-inner">
              <Scale size={22} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Terms &amp; Conditions
              </h1>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                Last Updated: June 2026
              </p>
            </div>
          </div>

          <div className="h-px bg-gray-150 dark:bg-zinc-800/50 my-6" />

          <div className="space-y-6 text-sm text-gray-600 dark:text-gray-400 font-semibold leading-relaxed">
            <section className="space-y-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using the HotByte platform, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, please discontinue use immediately.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                2. Use of the Platform
              </h2>
              <p>
                HotByte is a digital menu and ordering platform provided to registered hotel partners. Customers may browse menus, place orders, and authenticate using Google Single Sign-On (SSO). Misuse, unauthorized access attempts, or any activity that disrupts platform operations is strictly prohibited.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                3. Subscriptions & Payments
              </h2>
              <p>
                Hotel partners subscribe to HotByte under defined pricing tiers (Trial, Basic, Pro). All payments are processed securely via Razorpay. Subscription fees are non-refundable unless expressly stated. Failure to renew a subscription will result in restricted access to the administrative dashboard.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                4. Intellectual Property
              </h2>
              <p>
                All branding, source code, design elements, and content within the HotByte platform are the exclusive intellectual property of HotByte and its licensors. Reproduction, redistribution, or reverse engineering is prohibited without express written permission.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                5. Limitation of Liability
              </h2>
              <p>
                HotByte shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform. Service availability is provided on a best-effort basis and may be subject to scheduled maintenance.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                6. Modifications
              </h2>
              <p>
                HotByte reserves the right to update these Terms at any time. Continued use of the platform following any changes constitutes your acceptance of the revised Terms.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-gray-900 dark:text-white tracking-tight">
                7. Contact
              </h2>
              <p>
                For any queries regarding these Terms, please contact us at{" "}
                <a
                  href="mailto:support@hotbyte.in"
                  className="text-orange-500 hover:underline font-bold"
                >
                  support@hotbyte.in
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
