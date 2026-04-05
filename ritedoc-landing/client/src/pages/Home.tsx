/*
 * DESIGN: Bold Authority — exact duplicate of ReadyCompliant RiteDoc.tsx
 * Colors: #2563EB blue, white backgrounds, slate-600 body text
 * Typography: Outfit 800 headlines, DM Sans body
 * Only addition: prominent demo button linking to https://marita-ready.github.io/ritedoc/
 * Waitlist form (Brevo List ID 3) + Stripe payment button included
 */

import { useState } from "react";
import SectionReveal from "@/components/SectionReveal";
import {
  ArrowRight,
  Shield,
  ShieldCheck,
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
  Lock,
  Loader2,
  Star,
  Menu,
  X,
  MapPin,
  Mail,
} from "lucide-react";

/* ── Asset URLs ── */
const LOGO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/5yP6mWFYcyzWM7gWgRGUtL/ritedoc-logo-v5_8d8ead38.png";
const PRODUCT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/9x8jEx5KEDKsd5jH6tTYGE/ritedoc-product-visual-VebZrgvyfZ39f8LV87eQif.webp";
const FEATURES_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/9x8jEx5KEDKsd5jH6tTYGE/compliance-features-EcxniSFuABbUU55kvcBnC8.webp";

/* ── Constants ── */
const STRIPE_LINK = "https://buy.stripe.com/cNibJ13wKdVc3AS9BqdIA00";
const DEMO_LINK = "https://marita-ready.github.io/ritedoc/";
// Set VITE_BREVO_API_KEY in your .env file (never commit the real key)
const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY as string;
const WAITLIST_LIST_ID = 3;

const platforms = [
  "ShiftCare",
  "Brevity",
  "Lumary",
  "Astalty",
  "SupportAbility",
  "CareMaster",
];

/* ── Brevo API ── */
async function submitToBrevoWaitlist(firstName: string, email: string) {
  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      attributes: { FIRSTNAME: firstName },
      listIds: [WAITLIST_LIST_ID],
      updateEnabled: true,
    }),
  });
  if (!res.ok && res.status !== 400) {
    throw new Error("Failed to add to waitlist");
  }
}

/* ── Navbar ── */
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <nav className="container flex items-center justify-between py-3 md:py-4">
        <a
          href="#"
          className="flex items-center gap-2 shrink-0"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span className="text-xl md:text-2xl font-extrabold tracking-tight">
            <span style={{ background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Rite</span><span style={{ color: '#1E3A5F' }}>Doc</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {[
            { id: "features", label: "Features" },
            { id: "pricing", label: "Pricing" },
            { id: "waitlist", label: "Waitlist" },
          ].map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className="text-sm font-medium tracking-wide transition-colors text-slate-600 hover:text-[#2563EB]"
            >
              {link.label}
            </button>
          ))}
          <a
            href={DEMO_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-full hover:bg-[#1d4ed8] transition-colors shadow-sm"
          >
            Try the Demo
            <ExternalLink size={14} />
          </a>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-slate-700"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="container py-4 flex flex-col gap-3">
            {[
              { id: "features", label: "Features" },
              { id: "pricing", label: "Pricing" },
              { id: "waitlist", label: "Waitlist" },
            ].map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-base font-medium py-2 transition-colors text-slate-600 text-left"
              >
                {link.label}
              </button>
            ))}
            <a
              href={DEMO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-full hover:bg-[#1d4ed8] transition-colors mt-2"
            >
              Try the Demo
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="bg-[#1e40af] text-white">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold mb-3 text-white">RiteDoc</h3>
            <p className="text-white/60 text-xs mt-1 mb-2">RiteDoc is a product of ReadyCompliant</p>
            <p className="text-white/75 text-sm leading-relaxed max-w-md">
              All documentation drafts are returned for your review and final approval. RiteDoc does not provide legal or compliance advice.
            </p>
            <div className="flex items-center gap-2 mt-4 text-white/75 text-sm">
              <MapPin size={16} className="shrink-0" />
              <span>Mornington, Victoria, Australia</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-white/75 text-sm">
              <Mail size={16} className="shrink-0" />
              <a href="mailto:hello@readycompliant.com" className="hover:text-white transition-colors">
                hello@readycompliant.com
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/90 mb-4">Pages</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="https://readycompliant.com" target="_blank" rel="noopener noreferrer" className="text-white/75 text-sm hover:text-white transition-colors">Home</a>
              </li>
              <li>
                <a href="https://readycompliant.com/about" target="_blank" rel="noopener noreferrer" className="text-white/75 text-sm hover:text-white transition-colors">About</a>
              </li>
              <li>
                <a href="https://readycompliant.com/contact" target="_blank" rel="noopener noreferrer" className="text-white/75 text-sm hover:text-white transition-colors">Contact</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/90 mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li>
                <a href={DEMO_LINK} target="_blank" rel="noopener noreferrer" className="text-white/75 text-sm hover:text-white transition-colors">RiteDoc Demo</a>
              </li>
              <li>
                <a href="#waitlist" className="text-white/75 text-sm hover:text-white transition-colors">Join Waitlist</a>
              </li>
              <li>
                <a href="https://readycompliant.com/privacy" target="_blank" rel="noopener noreferrer" className="text-white/75 text-sm hover:text-white transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="https://readycompliant.com/terms" target="_blank" rel="noopener noreferrer" className="text-white/75 text-sm hover:text-white transition-colors">Terms of Service</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-700 mt-12 pt-8">
          <p className="text-white/60 text-xs leading-relaxed mb-6">
            All documentation drafts are returned for your review and final approval. RiteDoc does not provide legal or compliance advice.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/60 text-sm">
            &copy; 2026 ReadyCompliant. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://readycompliant.com/privacy" target="_blank" rel="noopener noreferrer" className="text-white/60 text-sm hover:text-white transition-colors">Privacy Policy</a>
            <a href="https://readycompliant.com/terms" target="_blank" rel="noopener noreferrer" className="text-white/60 text-sm hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Waitlist Form ── */
function WaitlistForm() {
  const [formState, setFormState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) return;
    setFormState("loading");
    try {
      await submitToBrevoWaitlist(firstName.trim(), email.trim());
      setFormState("success");
      setFirstName("");
      setEmail("");
    } catch (err) {
      console.error("Waitlist submission error:", err);
      setErrorMsg("Something went wrong. Please try again or email us at hello@readycompliant.com.");
      setFormState("error");
    }
  };

  if (formState === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle size={40} className="text-[#2563EB]" />
        <p className="text-lg font-semibold text-slate-900">You're on the list!</p>
        <p className="text-slate-500 text-sm">We'll be in touch when RiteDoc is ready.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">
          First Name
        </label>
        <input
          id="firstName"
          type="text"
          placeholder="Your first name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] transition"
        />
      </div>
      {formState === "error" && (
        <p className="text-red-500 text-sm">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={formState === "loading"}
        className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold rounded-full transition-all disabled:opacity-60"
      >
        {formState === "loading" ? (
          <><Loader2 size={16} className="animate-spin" /> Adding you...</>
        ) : (
          <>Join Waitlist <ArrowRight size={16} /></>
        )}
      </button>
      <p className="text-center text-slate-400 text-xs">We respect your privacy. No spam, ever.</p>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE — exact duplicate of RiteDoc.tsx with one added demo button
   ══════════════════════════════════════════════════════════════════ */

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 md:pt-24">

        {/* ===== HERO ===== */}
        <section className="bg-white py-16 md:py-24 lg:py-28">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-12 lg:gap-20 items-center">
              <div className="animate-fade-in-up text-center">
                <div className="flex justify-center mt-0 mb-6">
                  <img
                    src={LOGO_IMG}
                    alt="RiteDoc — Notes Done Right"
                    className="h-40 md:h-52 lg:h-60 w-auto object-contain"
                    style={{ border: 'none', outline: 'none', boxShadow: 'none', display: 'block' }}
                  />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-[#2563EB] mb-6">
                  Notes Done Right.
                </p>
                <p className="text-lg md:text-xl text-slate-600 leading-relaxed mx-auto mb-8">
                  An offline desktop app that rewrites raw NDIS support worker progress notes
                  into audit-prepared drafts for your team to review — on your device, in minutes.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="#waitlist"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#2563EB] text-white font-semibold rounded-full hover:bg-[#1d4ed8] transition-all shadow-lg shadow-blue-500/25"
                  >
                    Join the Waitlist
                    <ArrowRight size={18} />
                  </a>
                  <a
                    href={DEMO_LINK}
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
        <section id="features" className="bg-[#F8FAFC] py-20 md:py-28">
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
                        "No internet required. No data ever leaves your device. Sensitive participant information stays in your organisation's hands.",
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
        <section id="pricing" className="bg-[#F8FAFC] py-20 md:py-28">
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
                      href={STRIPE_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-white text-[#2563EB] font-bold rounded-full hover:bg-blue-50 transition-all"
                    >
                      <Lock size={16} />
                      Claim Founders Spot
                      <ArrowRight size={16} />
                    </a>
                    <p className="flex items-start justify-center gap-1.5 mt-3 text-blue-200 text-xs max-w-xs mx-auto text-center">
                      <ShieldCheck size={13} className="shrink-0 mt-0.5" />
                      Try RiteDoc risk-free. From the day you receive access, you have 30 days to try it. If you're not completely satisfied, we'll refund you in full — no questions asked.
                    </p>
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
                    href="#waitlist"
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
                    href="#waitlist"
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
                    href="mailto:hello@readycompliant.com"
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
                  href={DEMO_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#2563EB] font-bold rounded-full hover:bg-blue-50 transition-all shadow-lg"
                >
                  Try the Demo
                  <ExternalLink size={18} />
                </a>
                <a
                  href="#waitlist"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-white font-bold rounded-full border-2 border-white/50 hover:border-white hover:bg-white/10 transition-all"
                >
                  Join the Waitlist
                  <ArrowRight size={18} />
                </a>
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ===== WAITLIST + STRIPE SECTION ===== */}
        <section id="waitlist" className="bg-white py-20 md:py-28">
          <div className="container">
            {/* Hero */}
            <SectionReveal className="text-center max-w-3xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#2563EB] text-xs font-semibold uppercase tracking-widest mb-6">
                <Star size={12} />
                Limited Founders Offer
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
                <span className="text-[#2563EB]">Join the </span>
                <span className="text-[#2563EB]">Rite</span><span className="text-slate-900">Doc</span>
                <span className="text-[#2563EB]"> Waitlist</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-4">
                Pay a $97 deposit now to secure your Founders seat. This deposit covers your first month's subscription. Your <strong>$97/month</strong> billing begins 30 days after RiteDoc launches — or join the free waitlist and be first to know when we launch.
              </p>
              <p className="flex items-start justify-center gap-1.5 text-slate-400 text-sm max-w-lg mx-auto">
                <ShieldCheck size={14} className="shrink-0 mt-0.5 text-[#2563EB]" />
                Try RiteDoc risk-free. From the day you receive access, you have 30 days to try it. If you're not completely satisfied, we'll refund you in full — no questions asked.
              </p>
            </SectionReveal>

            {/* Pricing Cards — Side by side on desktop, stacked on mobile */}
            <SectionReveal>
              <div className="max-w-4xl mx-auto px-6 mb-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Founders Card */}
                  <div className="bg-white rounded-2xl border-2 border-[#2563EB]/20 p-8 text-center shadow-sm relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-semibold uppercase tracking-widest mb-4">
                      Only 17 Seats Available
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 mb-1">Founders</h3>
                    <div className="text-5xl font-extrabold text-slate-900 mb-1">
                      $97<span className="text-2xl font-semibold text-slate-400">/month</span>
                    </div>
                    <p className="text-slate-500 text-sm mb-6">Locked in forever. Your price never goes up.</p>
                    <ul className="text-left space-y-2 mb-8 max-w-xs mx-auto">
                      {[
                        "Full RiteDoc desktop app",
                        "All 6 NDIS platform formats",
                        "Traffic-light scoring",
                        "Red flag detection",
                        "All future updates included",
                        "Priority support",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                          <CheckCircle size={15} className="text-[#2563EB] shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <a
                      href={STRIPE_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold rounded-full text-base transition-all shadow-md shadow-blue-500/20"
                    >
                      <Lock size={16} />
                      Lock in Founders Price
                      <ArrowRight size={16} />
                    </a>
                    <p className="flex items-start justify-center gap-1.5 mt-3 text-slate-500 text-xs max-w-sm mx-auto text-center">
                      <ShieldCheck size={13} className="text-[#2563EB] shrink-0 mt-0.5" />
                      Try RiteDoc risk-free. From the day you receive access, you have 30 days to try it. If you're not completely satisfied, we'll refund you in full — no questions asked.
                    </p>
                  </div>

                  {/* Standard Card — Greyed out / faded */}
                  <div className="bg-gray-50 rounded-2xl border-2 border-gray-200 p-8 text-center opacity-60 relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
                      Coming Soon
                    </div>
                    <h3 className="text-xl font-extrabold text-gray-400 mb-1">Standard</h3>
                    <div className="text-5xl font-extrabold text-gray-400 mb-1">
                      $197<span className="text-2xl font-semibold text-gray-300">/month</span>
                    </div>
                    <p className="text-gray-400 text-sm mb-6">Available at launch</p>
                    <ul className="text-left space-y-2 mb-8 max-w-xs mx-auto">
                      {[
                        "Full RiteDoc desktop app",
                        "All 6 NDIS platform formats",
                        "Traffic-light scoring",
                        "Red flag detection",
                        "All future updates included",
                        "Priority support",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
                          <CheckCircle size={15} className="text-gray-300 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <button
                      disabled
                      className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-gray-300 text-gray-500 font-bold rounded-full text-base cursor-not-allowed"
                    >
                      Available at Launch
                    </button>
                  </div>
                </div>
              </div>
            </SectionReveal>

            {/* Divider */}
            <div className="flex items-center gap-4 max-w-4xl mx-auto px-6 py-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-slate-400 text-sm font-medium">or</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Brevo free waitlist form */}
            <SectionReveal>
              <div className="max-w-4xl mx-auto px-6 pb-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                  <h3 className="text-2xl font-bold text-[#2563EB] mb-1">Free Waitlist</h3>
                  <p className="text-slate-500 text-sm mb-6">
                    Join the free waitlist — no payment required. We'll let you know when RiteDoc launches and remind you about Founders pricing.
                  </p>
                  <WaitlistForm />
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
