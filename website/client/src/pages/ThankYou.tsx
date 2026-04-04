/**
 * Thank You page — shown after Stripe Founders payment
 * "Welcome aboard. Exciting." copy
 */

import { Link } from "wouter";
import Layout from "@/components/Layout";
import { CheckCircle, Mail, ArrowRight } from "lucide-react";

export default function ThankYou() {
  return (
    <Layout>
      <section className="min-h-[70vh] flex items-center justify-center py-24 bg-white">
        <div className="max-w-xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#F5F0E8] flex items-center justify-center">
              <CheckCircle size={36} className="text-[#006B3F]" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F0E8] text-[#006B3F] text-xs font-semibold uppercase tracking-widest mb-6">
            Founders Seat Secured
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold text-[#006B3F] mb-3 leading-tight">
            Welcome aboard.{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #006B3F 0%, #D4A843 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Exciting.
            </span>
          </h1>

          <p className="text-slate-600 text-lg mb-6">
            You've locked in your Founders seat at <strong>$97/month forever</strong>. That price never goes up — ever.
          </p>

          <div className="bg-[#F8F4ED] rounded-2xl p-6 mb-8 text-left space-y-3">
            <p className="text-sm font-semibold text-slate-900">What happens next:</p>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#006B3F] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
              <p className="text-slate-600 text-sm">You'll receive a confirmation email from Stripe with your payment receipt.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#006B3F] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
              <p className="text-slate-600 text-sm">We'll be in touch directly from <strong>hello@readycompliant.com</strong> with your early access details as we get closer to launch.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#006B3F] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
              <p className="text-slate-600 text-sm">You'll get priority support and early access to all future updates — as a Founder, you're part of building this.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:hello@readycompliant.com"
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-full text-sm transition-all"
            >
              <Mail size={14} />
              Say hello
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-slate-500 text-sm hover:text-slate-700 transition-colors"
            >
              ← Back to ReadyCompliant
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
