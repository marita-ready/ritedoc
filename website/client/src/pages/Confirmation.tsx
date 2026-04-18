/**
 * Confirmation page — shown after free waitlist signup via Brevo
 */

import { Link } from "wouter";
import Layout from "@/components/Layout";
import { CheckCircle, ArrowRight, Lock } from "lucide-react";
import SchemaMarkup, { productSchema, organisationSchema } from "@/components/SchemaMarkup";

const STRIPE_LINK = "https://buy.stripe.com/cNibJ13wKdVc3AS9BqdIA00";

export default function Confirmation() {
  return (
    <Layout>
      {/* Product + Organisation schema for SEO/AEO */}
      <SchemaMarkup schemas={[productSchema, organisationSchema]} />
      <section className="min-h-[70vh] flex items-center justify-center py-24 bg-white">
        <div className="max-w-xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle size={36} className="text-green-500" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#006B3F] mb-3">
            You're on the list!
          </h1>
          <p className="text-slate-600 text-lg mb-8">
            Thanks for joining the RiteDoc waitlist. We'll be in touch as soon as we're ready to launch — and we'll remind you about Founders pricing before it closes.
          </p>

          {/* Upsell to Founders */}
          <div className="bg-[#F8F4ED] rounded-2xl p-6 mb-8 text-left">
            <p className="text-sm font-semibold text-[#006B3F] uppercase tracking-widest mb-2">Still interested in Founders pricing?</p>
            <p className="text-slate-700 text-sm mb-4">
              Lock in <strong>$97/month forever</strong> — only 17 seats available. You can still secure your spot now before they're gone.
            </p>
            <a
              href={STRIPE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#16A34A] text-white font-bold rounded-full text-sm hover:bg-[#15803D] transition-all shadow-md shadow-green-500/20"
            >
              <Lock size={14} />
              Lock in $97/month Founders Price
              <ArrowRight size={14} />
            </a>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-500 text-sm hover:text-slate-700 transition-colors"
          >
            ← Back to ReadyCompliant
          </Link>
        </div>
      </section>
    </Layout>
  );
}
