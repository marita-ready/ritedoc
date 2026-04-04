/*
 * DESIGN: Bold Authority — danmartell.com layout style (bold headlines, white space, modern)
 * About page: First-person founder story by Marita Frith
 * Uses user's EXACT words for the intro section
 * Colors: #2563EB blue, white backgrounds, slate-600 body text
 * Typography: Outfit 800 for headlines, DM Sans for body
 */

import Layout from "@/components/Layout";
import SectionReveal from "@/components/SectionReveal";
import { Link } from "wouter";
import { ArrowRight, MapPin, Heart, Target } from "lucide-react";

const MARITA_PHOTO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/9x8jEx5KEDKsd5jH6tTYGE/marita_photo_f64f8790.jpg";
const MORNINGTON_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/9x8jEx5KEDKsd5jH6tTYGE/about-mornington-MbsSJcznJ25NYeHPupaCyd.webp";

export default function About() {
  return (
    <Layout>
      {/* ===== HERO — User's exact words ===== */}
      <section className="bg-white py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl animate-fade-in-up">
            <span className="text-[#006B3F] text-sm font-semibold uppercase tracking-widest">
              The Founder
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#006B3F] leading-[1.1] tracking-tight mt-3 mb-6">
              I Built This Because<br />
              <span className="text-[#006B3F]">We Need It.</span>
            </h1>
            <div className="text-xl text-slate-600 leading-relaxed space-y-4">
              <p>
                I'm Marita Frith, founder of ReadyCompliant. Working in the NDIS sector on the
                Mornington Peninsula in Victoria, it quickly became clear that too many admin have
                the extra duty of rewriting support worker notes, into something audit-ready —
                so I built a solution.
              </p>
              <p>
                The pressure to get documentation right is real. The audit stress is real.
              </p>
              <p>
                So I built <strong>RiteDoc</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOUNDER STORY ===== */}
      <section className="bg-[#F8F4ED] py-20 md:py-28">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">
            {/* Photo column */}
            <SectionReveal className="lg:col-span-2">
              <div className="relative">
                <img
                  src={MARITA_PHOTO}
                  alt="Marita Frith, Founder of ReadyCompliant"
                  className="w-full max-w-sm mx-auto lg:mx-0 rounded-2xl shadow-xl"
                />
                <div className="mt-4 flex items-center gap-2 text-slate-500 text-sm justify-center lg:justify-start">
                  <MapPin size={16} />
                  <span>Mornington Peninsula, Victoria</span>
                </div>
              </div>
            </SectionReveal>

            {/* Story column */}
            <SectionReveal className="lg:col-span-3" delay={0.1}>
              <span className="text-[#006B3F] text-sm font-semibold uppercase tracking-widest">
                My Story
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#006B3F] mt-3 mb-6">
                What RiteDoc Does
              </h2>

              <div className="space-y-5 text-slate-600 text-lg leading-relaxed">
                <p>
                  RiteDoc takes the raw CSV export from your NDIS platform, rewrites the rough
                  notes into audit-prepared drafts, and gives your admin team back their time.
                  No cloud uploads. No complicated setup. No data leaving your device. Just a
                  desktop app that does the job right.
                </p>
                <p>
                  ReadyCompliant is the company I built around that tool. It's not a faceless
                  tech company. It's me — someone who understands the sector because I'm in it
                  every day.
                </p>
                <blockquote className="border-l-4 border-[#006B3F] pl-5 py-1 my-4">
                  <p className="text-slate-700 italic text-lg leading-relaxed">
                    "RiteDoc and the upcoming BIAB package are built from real experience in the
                    NDIS sector — practical tools for people who do the work, not just talk about it."
                  </p>
                  <footer className="text-slate-500 text-sm mt-2 not-italic">— Marita Frith, Founder</footer>
                </blockquote>
              </div>

              <div className="mt-8">
                <Link
                  href="/ritedoc"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#16A34A] text-white font-semibold rounded-full hover:bg-[#15803D] transition-all shadow-lg shadow-green-500/25"
                >
                  See What I Built
                  <ArrowRight size={18} />
                </Link>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ===== VALUES — Only 2 values, Sector Understanding removed ===== */}
      <section className="bg-white py-20 md:py-28">
        <div className="container">
          <SectionReveal className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[#006B3F] text-sm font-semibold uppercase tracking-widest">
              What I Believe
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#006B3F] mt-3 mb-5">
              What Drives This Work
            </h2>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <SectionReveal delay={0}>
              <div className="text-center p-8">
                <div className="w-14 h-14 rounded-xl bg-[#F5F0E8] flex items-center justify-center mx-auto mb-5">
                  <Heart className="text-[#D4A843]" size={28} />
                </div>
                <h3 className="text-lg font-bold text-[#006B3F] mb-3">People First</h3>
                <p className="text-slate-600 leading-relaxed">
                  Everything I build starts with the people who use it. I design for real NDIS admin teams, not theoretical users.
                </p>
              </div>
            </SectionReveal>
            <SectionReveal delay={0.1}>
              <div className="text-center p-8">
                <div className="w-14 h-14 rounded-xl bg-[#F5F0E8] flex items-center justify-center mx-auto mb-5">
                  <Target className="text-[#D4A843]" size={28} />
                </div>
                <h3 className="text-lg font-bold text-[#006B3F] mb-3">Practical Solutions</h3>
                <p className="text-slate-600 leading-relaxed">
                  Every feature solves a real problem.
                </p>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ===== LOCATION ===== */}
      <section className="relative">
        <img
          src={MORNINGTON_IMG}
          alt="Mornington Peninsula coastline"
          className="w-full h-64 md:h-80 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container py-8 md:py-12">
            <SectionReveal>
              <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                <MapPin size={16} />
                <span>Based in</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white">
                Mornington, Victoria
              </h3>
              <p className="text-white/80 mt-2 max-w-md">
                Proudly Australian. Built on the beautiful Mornington Peninsula.
              </p>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-white py-16 md:py-20 border-t border-slate-100">
        <div className="container text-center">
          <SectionReveal>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-5">
              Want to Learn More?
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto mb-8">
              Check out <span className="font-semibold text-[#2563EB]">Rite</span><span className="font-semibold text-[#1E293B]">Doc</span> or get in touch — I'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/ritedoc"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#16A34A] text-white font-bold rounded-full hover:bg-[#15803D] transition-all shadow-lg shadow-green-500/25"
              >
                Explore RiteDoc
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 font-semibold rounded-full border-2 border-slate-200 hover:border-slate-400 transition-all"
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
