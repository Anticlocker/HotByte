import type { Metadata } from "next";
import CustomerNavbar from "@/components/CustomerNavbar";
import Footer from "@/components/Footer";
import { RotateCcw } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund Policy | HotByte",
  description: "HotByte subscription refund and cancellation policy for restaurant partners.",
};

export default function RefundPolicy() {
  return (
    <div className="relative z-0 bg-[#050507] min-h-screen flex flex-col justify-between text-white font-sans selection:bg-orange-500/30 overflow-x-hidden antialiased">
      <CustomerNavbar hideActions />

      <main className="flex-grow max-w-[800px] mx-auto w-full px-6 py-12 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="glass-card-dark rounded-3xl border border-gray-900/60 p-8 md:p-12 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center shadow-inner">
              <RotateCcw size={22} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Refund Policy
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
                1. Subscription Plans
              </h2>
              <p>
                HotByte operates on a subscription billing model. Plans are offered as
                monthly or yearly recurring payments. You may choose to start with a
                free trial before committing to a paid plan.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                2. Free Trial Period
              </h2>
              <p>
                New hotel partners receive a 14-day free trial with full access to all
                Pro-level features. No payment information is required during the trial
                period. You may cancel at any time before the trial ends at no cost.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                3. Paid Subscription Refunds
              </h2>
              <p>
                All subscription fees are non-refundable once the billing cycle has
                commenced, except as required by applicable law or as expressly stated
                in this policy. Refunds are not provided for partial months of service
                or unused portions of a subscription period.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                4. Cancellation Policy
              </h2>
              <p>
                You may cancel your subscription at any time from the admin dashboard.
                Upon cancellation, your account will remain active until the end of the
                current billing period. After that, access to the admin dashboard and
                premium features will be restricted. No further charges will be made.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                5. Service Downtime &amp; Credits
              </h2>
              <p>
                In the rare event of extended service downtime exceeding 48 consecutive
                hours due to a fault on our infrastructure, HotByte may, at its sole
                discretion, issue a pro-rated service credit. This does not apply to
                scheduled maintenance or downtime caused by third-party services.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                6. Chargebacks &amp; Disputes
              </h2>
              <p>
                If you believe a charge was made in error, please contact our support
                team at{" "}
                <a
                  href="mailto:support@hotbyte.in"
                  className="text-orange-400 hover:underline font-bold"
                >
                  support@hotbyte.in
                </a>{" "}
                before initiating a chargeback. We are committed to resolving billing
                disputes promptly and fairly.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-base font-black text-white tracking-tight">
                7. Contact
              </h2>
              <p>
                For any refund or billing inquiries, reach out to us at{" "}
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

      <Footer />
    </div>
  );
}
