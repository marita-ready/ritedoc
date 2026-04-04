/*
 * DESIGN: Bold Authority — danmartell.com layout style (bold headlines, white space, modern)
 * Content: Authentic ReadyCompliant brand. NOT generic SaaS pitch.
 * ReadyCompliant = company. RiteDoc = product.
 * Colors: #2563EB blue, white backgrounds, slate-600 body text
 * Typography: Outfit 800 for headlines, DM Sans for body
 */

import Layout from "@/components/Layout";
import SectionReveal from "@/components/SectionReveal";
import { Link } from "wouter";
import {
  Shield,
  Zap,
  MonitorSmartphone,
  ArrowRight,
  Lock,
  Layers,
  AlertTriangle,
  Clipboard,
  Package,
  Rocket,
} from "lucide-react";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/9x8jEx5KEDKsd5jH6tTYGE/hero-illustration-8n5tjxggeaDNWunGsXwZpU.webp";
const PRODUCT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/9x8jEx5KEDKsd5jH6tTYGE/ritedoc-product-visual-VebZrgvyfZ39f8LV87eQif.webp";

export default function Home() {
  return (
    <Layout>
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden bg-white">
        <div className="container py-16 md:py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — Text */}
            <div className="animate-fade-in-up">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
                ReadyCompliant
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 leading-relaxed max-w-lg mb-4">
                Practical tools for NDIS providers and their admin teams.
              </p>
              <p className="text-lg text-slate-500 leading-relaxed max-w-lg mb-8">
                We've built software that helps you spend less time rewriting notes
                and more time on what matters — the people you support.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/ritedoc"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#2563EB] text-white font-semibold rounded-full hover:bg-[#1d4ed8] transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                >
                  Discover RiteDoc
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-slate-700 font-semibold rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  Our Story
                </Link>
              </div>
            </div>

            {/* Right — Illustration */}
            <div className="animate-fade-in-up-delay-2">
              <img
                src={HERO_IMG}
                alt="NDIS documentation tools illustration"
                className="w-full rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== THE PROBLEM WE SOLVE ===== */}
      <section className="bg-[#F8FAFC] py-20 md:py-28">
        <div className="container">
          <SectionReveal className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3 mb-5">
              The Problem We Solve
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              Support workers write rough notes. Someone on your admin team has to rewrite
              every one of them into something audit-ready. It takes hours. Every week.
              We built tools to fix that.
            </p>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="text-[#2563EB]" size={28} />,
                title: "Audit-Prepared Drafts",
                description:
                  "RiteDoc rewrites raw progress notes into audit-prepared drafts. Your admin team reviews, then copies them back into your platform.",
              },
              {
                icon: <Zap className="text-[#2563EB]" size={28} />,
                title: "Hours Back Every Week",
                description:
                  "Stop spending hours rewriting notes manually. Import a CSV, get polished drafts back in seconds.",
              },
              {
                icon: <Lock className="text-[#2563EB]" size={28} />,
                title: "Your Data Stays Put",
                description:
                  "Everything runs on your device. No cloud uploads, no third-party access. Your participant data never leaves your computer.",
              },
            ].map((feature, i) => (
              <SectionReveal key={i} delay={i * 0.1}>
                <div className="bg-white rounded-xl p-8 border border-slate-100 hover:border-[#2563EB]/20 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 h-full">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-5">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== RITEDOC — OUR FIRST PRODUCT ===== */}
      <section className="bg-white py-20 md:py-28">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <SectionReveal>
              <img
                src={PRODUCT_IMG}
                alt="RiteDoc desktop application showing note transformation"
                className="w-full rounded-2xl shadow-xl shadow-slate-200/50"
              />
            </SectionReveal>

            <SectionReveal delay={0.15}>
              <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">
                Our First Product
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3 mb-5">
                RiteDoc — Notes Done Right
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                A desktop app that takes the CSV export from your NDIS platform and rewrites
                the rough notes into audit-prepared drafts for your team to review.
                Offline. On your device. In minutes.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { icon: <MonitorSmartphone size={20} />, text: "Runs offline — nothing leaves your device" },
                  { icon: <Layers size={20} />, text: "Works with ShiftCare, Brevity, Lumary & more" },
                  { icon: <AlertTriangle size={20} />, text: "Traffic-light scoring and red flag detection" },
                  { icon: <Clipboard size={20} />, text: "Platform-aware clipboard — copy drafts straight back in" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="text-[#2563EB] mt-0.5 shrink-0">{item.icon}</div>
                    <span className="text-slate-700">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/ritedoc"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#2563EB] text-white font-semibold rounded-full hover:bg-[#1d4ed8] transition-all shadow-lg shadow-blue-500/25"
                >
                  Learn More
                  <ArrowRight size={18} />
                </Link>
                <a
                  href="https://marita-ready.github.io/ritedoc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-slate-700 font-semibold rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  Try the Demo
                </a>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ===== WHAT'S NEXT ===== */}
      <section className="bg-[#F8FAFC] py-20 md:py-28">
        <div className="container">
          <SectionReveal className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3 mb-5">
              What's Next
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              RiteDoc is our first product. We're building more tools for NDIS providers
              who need practical solutions, not more complexity.
            </p>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <SectionReveal>
              <div className="bg-white rounded-xl p-8 border border-slate-100 border-dashed h-full">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-5">
                  <Package className="text-[#2563EB]" size={28} />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold text-slate-900">BIAB — Business in a Box</h3>
                  <span className="text-xs font-semibold bg-blue-50 text-[#2563EB] px-2.5 py-1 rounded-full">
                    Coming Soon
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  A complete package for compliance and audit agencies, or anyone wanting to start
                  a note-checking or documentation service.
                </p>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <div className="bg-white rounded-xl p-8 border border-slate-100 border-dashed h-full">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-5">
                  <Rocket className="text-[#2563EB]" size={28} />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold text-slate-900">More Platform Integrations</h3>
                  <span className="text-xs font-semibold bg-blue-50 text-[#2563EB] px-2.5 py-1 rounded-full">
                    Coming Soon
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Deeper integrations with NDIS management platforms to streamline your
                  entire documentation workflow.
                </p>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="bg-[#2563EB] py-20 md:py-24">
        <div className="container text-center">
          <SectionReveal>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5">
              Join the RiteDoc Waitlist
            </h2>
            <p className="text-blue-100 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Be among the first to access RiteDoc at founders pricing —
              $97/month, locked in forever.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://ritedoclp-dqtvlarf.manus.space/#waitlist"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#2563EB] font-bold rounded-full hover:bg-blue-50 transition-all shadow-lg"
              >
                Join the Waitlist
                <ArrowRight size={18} />
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-white font-semibold rounded-full border-2 border-white/30 hover:border-white/60 transition-all"
              >
                Get in Touch
              </Link>
            </div>
          </SectionReveal>
        </div>
      </section>
    </Layout>
  );
}
