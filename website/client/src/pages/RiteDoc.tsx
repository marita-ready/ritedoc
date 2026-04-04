/*
 * DESIGN: Bold Authority — danmartell.com inspired
 * RiteDoc product page: Feature showcase, 3-tier monthly pricing, CTAs
 * Colors: #2563EB blue, white backgrounds, slate-600 body text
 * Typography: Outfit 800 headlines, DM Sans body
 */

import Layout from "@/components/Layout";
import SectionReveal from "@/components/SectionReveal";
import {
  ArrowRight,
  Shield,
  WifiOff,
  Layers,
  AlertTriangle,
  Clipboard,
  CheckCircle,
  Monitor,
  ExternalLink,
  FileDown,
  FileUp,
  Copy,
} from "lucide-react";

const PRODUCT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/9x8jEx5KEDKsd5jH6tTYGE/ritedoc-product-visual-VebZrgvyfZ39f8LV87eQif.webp";
const FEATURES_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/9x8jEx5KEDKsd5jH6tTYGE/compliance-features-EcxniSFuABbUU55kvcBnC8.webp";

const platforms = [
  "ShiftCare",
  "Brevity",
  "Lumary",
  "Astalty",
  "SupportAbility",
  "CareMaster",
];

export default function RiteDoc() {
  return (
    <Layout>
      {/* ===== HERO ===== */}
      <section className="bg-white py-16 md:py-24 lg:py-28">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-12 lg:gap-20 items-center">
            <div className="animate-fade-in-up text-center">
              <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">
                Our Flagship Product
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mt-3 mb-4">
                RiteDoc
              </h1>
              <p className="text-2xl md:text-3xl font-bold text-[#2563EB] mb-6">
                Notes Done Right.
              </p>
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed mx-auto mb-8">
                An offline desktop app that rewrites raw NDIS support worker progress notes
                into audit-prepared drafts for your team to review — on your device, in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="https://ritedoclp-dqtvlarf.manus.space/#waitlist"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#2563EB] text-white font-semibold rounded-full hover:bg-[#1d4ed8] transition-all shadow-lg shadow-blue-500/25"
                >
                  Join the Waitlist
                  <ArrowRight size={18} />
                </a>
                <a
                  href="https://marita-ready.github.io/ritedoc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-slate-700 font-semibold rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  Try the Demo
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            <div className="animate-fade-in-up-delay-2">
              <img
                src={PRODUCT_IMG}
                alt="RiteDoc application showing support worker notes being transformed into audit-prepared drafts"
                className="w-full rounded-2xl shadow-xl shadow-slate-200/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="bg-[#F8FAFC] py-20 md:py-28">
        <div className="container">
          <SectionReveal className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3 mb-5">
              Three Steps. Done.
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              Your admin team exports the CSV from your NDIS platform, imports it into RiteDoc,
              and gets polished audit-prepared drafts back — ready to copy straight in.
            </p>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                icon: <FileDown size={28} className="text-[#2563EB]" />,
                title: "Export CSV from Your Platform",
                description:
                  "Export the support worker progress notes from your NDIS platform (ShiftCare, Brevity, Lumary, etc.) as a CSV file.",
              },
              {
                step: "02",
                icon: <FileUp size={28} className="text-[#2563EB]" />,
                title: "Import into RiteDoc",
                description:
                  "Import the CSV into RiteDoc. The app rewrites the rough notes into professional, audit-prepared drafts — offline, on your device.",
              },
              {
                step: "03",
                icon: <Copy size={28} className="text-[#2563EB]" />,
                title: "Copy Drafts Back",
                description:
                  "Review each draft, then copy it back into your platform using the one-click clipboard.",
              },
            ].map((step, i) => (
              <SectionReveal key={i} delay={i * 0.1}>
                <div className="relative bg-white rounded-xl p-8 border border-slate-100 h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl font-extrabold text-blue-50 leading-none">{step.step}</span>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      {step.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRAFFIC LIGHT SCORING ===== */}
      <section className="bg-white py-20 md:py-28">
        <div className="container">
          <SectionReveal className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">
              Smart Scoring
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3 mb-5">
              Traffic-Light Scoring System
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              Every note gets scored instantly. Your admin team knows exactly what needs attention
              before anything goes back into the platform.
            </p>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <SectionReveal delay={0}>
              <div className="bg-white rounded-2xl p-8 border-2 border-green-100 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-5 h-5 rounded-full bg-green-500 shrink-0" />
                  <span className="text-green-700 font-bold text-lg">Green</span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-3">Good to Go</h3>
                <p className="text-slate-600 leading-relaxed">
                  Your audit-prepared draft is ready for your review and approval.
                </p>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <div className="bg-white rounded-2xl p-8 border-2 border-orange-100 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-5 h-5 rounded-full bg-orange-400 shrink-0" />
                  <span className="text-orange-600 font-bold text-lg">Orange</span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-3">Missing Data</h3>
                <p className="text-slate-600 leading-relaxed">
                  Something's missing. RiteDoc prompts you to fill in the gaps before
                  the note is ready to go back into the platform.
                </p>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.2}>
              <div className="bg-white rounded-2xl p-8 border-2 border-red-100 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-5 h-5 rounded-full bg-red-500 shrink-0" />
                  <span className="text-red-600 font-bold text-lg">Red</span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-3">Incident Occurred</h3>
                <p className="text-slate-600 leading-relaxed">
                  An incident has been detected. All required incident documentation
                  is filled in and ready for you to review and submit.
                </p>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ===== KEY FEATURES ===== */}
      <section className="bg-[#F8FAFC] py-20 md:py-28">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <SectionReveal>
              <img
                src={FEATURES_IMG}
                alt="RiteDoc features illustration"
                className="w-full rounded-2xl"
              />
            </SectionReveal>

            <div>
              <SectionReveal>
                <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">
                  Key Features
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3 mb-8">
                  Built for the People Behind the Paperwork
                </h2>
              </SectionReveal>

              <div className="space-y-6">
                {[
                  {
                    icon: <WifiOff size={22} />,
                    title: "100% Offline & Private",
                    description:
                      "No internet required. No data ever leaves your device. Sensitive participant information stays in your organisation.",
                  },
                  {
                    icon: <Layers size={22} />,
                    title: "6 Platform Support",
                    description:
                      "Works with ShiftCare, Brevity, Lumary, Astalty, SupportAbility, and CareMaster out of the box.",
                  },
                  {
                    icon: <AlertTriangle size={22} />,
                    title: "Traffic-Light Scoring",
                    description:
                      "Instant visual feedback on every note. Green = ready. Orange = missing data. Red = incident occurred.",
                  },
                  {
                    icon: <Shield size={22} />,
                    title: "Red Flag Detection",
                    description:
                      "A red flag incident has occurred. Notes written, required documentation drafted for your review and approval.",
                  },
                  {
                    icon: <Clipboard size={22} />,
                    title: "Platform-Aware Clipboard",
                    description:
                      "Copy and paste back to your platform.",
                  },
                  {
                    icon: <Monitor size={22} />,
                    title: "Desktop Application",
                    description:
                      "A proper desktop app — not a browser tool. Fast, reliable, and always available when you need it.",
                  },
                ].map((feature, i) => (
                  <SectionReveal key={i} delay={i * 0.05}>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-[#2563EB]">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 mb-1">{feature.title}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </SectionReveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SUPPORTED PLATFORMS ===== */}
      <section className="bg-white py-20 md:py-28">
        <div className="container">
          <SectionReveal className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">
              Compatibility
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3 mb-5">
              Works With Your Platform
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              RiteDoc supports the most popular NDIS management platforms, with more being added.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
              {platforms.map((platform) => (
                <div
                  key={platform}
                  className="bg-[#F8FAFC] rounded-xl p-5 border border-slate-100 text-center hover:border-[#2563EB]/20 hover:shadow-md transition-all"
                >
                  <CheckCircle className="text-[#2563EB] mx-auto mb-2" size={24} />
                  <span className="text-sm font-semibold text-slate-700">{platform}</span>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="bg-[#F8FAFC] py-20 md:py-28">
        <div className="container">
          <SectionReveal className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">
              Pricing
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3 mb-5">
              Simple, Flat Pricing
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-2xl mx-auto mb-4 border border-slate-200 rounded-lg p-4 bg-white">
              <strong>Important:</strong> RiteDoc produces audit-prepared drafts — not final documentation. Every draft should be reviewed and approved by your team before being entered into your platform. RiteDoc does not guarantee compliance and does not provide legal or compliance advice.
            </p>
            <p className="text-slate-600 text-lg leading-relaxed">
              One flat fee per organisation. No per-user charges. No tiers.
              Lock in founders pricing before the seats are gone.
            </p>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Founders */}
            <SectionReveal delay={0}>
              <div className="relative bg-[#2563EB] rounded-2xl p-8 h-full text-white">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
                    Only 17 Seats
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-xl font-extrabold mb-1">Founders</h3>
                  <p className="text-blue-200 text-sm mb-6">Locked in forever</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-5xl font-extrabold">$97</span>
                    <span className="text-blue-200 text-lg">/month</span>
                  </div>
                  <p className="text-blue-200 text-sm mb-8">Per organisation · Price never increases</p>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Full RiteDoc desktop app",
                      "All 6 platform integrations",
                      "Traffic-light scoring",
                      "Red flag detection",
                      "All future updates included",
                      "Price locked in forever",
                    ].map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle size={16} className="text-blue-200 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="https://ritedoclp-dqtvlarf.manus.space/#waitlist"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-white text-[#2563EB] font-bold rounded-full hover:bg-blue-50 transition-all"
                  >
                    Claim Founders Spot
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </SectionReveal>

            {/* Standard Monthly */}
            <SectionReveal delay={0.1}>
              <div className="bg-white rounded-2xl p-8 border border-slate-100 h-full">
                <h3 className="text-xl font-extrabold text-slate-900 mb-1">Standard Monthly</h3>
                <p className="text-slate-500 text-sm mb-6">After founders seats close</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-5xl font-extrabold text-slate-900">$197</span>
                  <span className="text-slate-400 text-lg">/month</span>
                </div>
                <p className="text-slate-500 text-sm mb-8">Per organisation · Cancel anytime</p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Full RiteDoc desktop app",
                    "All 6 platform integrations",
                    "Traffic-light scoring",
                    "Red flag detection",
                    "All future updates included",
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <CheckCircle size={16} className="text-[#2563EB] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="https://ritedoclp-dqtvlarf.manus.space/#waitlist"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#2563EB] text-white font-bold rounded-full hover:bg-[#1d4ed8] transition-all"
                >
                  Join Waitlist
                  <ArrowRight size={16} />
                </a>
              </div>
            </SectionReveal>

            {/* Standard Annual */}
            <SectionReveal delay={0.2}>
              <div className="bg-white rounded-2xl p-8 border border-slate-100 h-full">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-xl font-extrabold text-slate-900">Standard Annual</h3>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                    Save 36%
                  </span>
                </div>
                <p className="text-slate-500 text-sm mb-6">After founders seats close</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-5xl font-extrabold text-slate-900">$1,497</span>
                  <span className="text-slate-400 text-lg">/year</span>
                </div>
                <p className="text-slate-500 text-sm mb-8">Per organisation · Billed annually</p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Full RiteDoc desktop app",
                    "All 6 platform integrations",
                    "Traffic-light scoring",
                    "Red flag detection",
                    "All future updates included",
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <CheckCircle size={16} className="text-[#2563EB] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="https://ritedoclp-dqtvlarf.manus.space/#waitlist"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#2563EB] text-white font-bold rounded-full hover:bg-[#1d4ed8] transition-all"
                >
                  Join Waitlist
                  <ArrowRight size={16} />
                </a>
              </div>
            </SectionReveal>
          </div>

          {/* BIAB teaser */}
          <SectionReveal>
            <div className="mt-10 max-w-5xl mx-auto bg-slate-900 rounded-2xl p-8 md:p-10 text-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">Coming Soon</span>
                  <h3 className="text-2xl font-extrabold mt-2 mb-2">Business in a Box (BIAB)</h3>
                  <p className="text-slate-300 leading-relaxed max-w-xl">
                    A complete package for compliance and audit agencies, or anyone wanting to start
                    a note-checking or documentation service. $1,997 setup + $500/month + $67/seat/month.
                  </p>
                </div>
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#2563EB] text-white font-bold rounded-full hover:bg-[#1d4ed8] transition-all shrink-0"
                >
                  Register Interest
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ===== DEMO CTA ===== */}
      <section className="bg-[#2563EB] py-16 md:py-20">
        <div className="container text-center">
          <SectionReveal>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5">
              See RiteDoc in Action
            </h2>
            <p className="text-blue-100 text-lg max-w-xl mx-auto mb-8">
              Try the interactive demo and see how RiteDoc transforms raw notes into
              audit-prepared drafts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://marita-ready.github.io/ritedoc/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#2563EB] font-bold rounded-full hover:bg-blue-50 transition-all shadow-lg"
              >
                Try the Demo
                <ExternalLink size={18} />
              </a>
              <a
                href="https://ritedoclp-dqtvlarf.manus.space/#waitlist"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-white font-bold rounded-full border-2 border-white/50 hover:border-white hover:bg-white/10 transition-all"
              >
                Join the Waitlist
                <ArrowRight size={18} />
              </a>
            </div>
          </SectionReveal>
        </div>
      </section>
    </Layout>
  );
}
