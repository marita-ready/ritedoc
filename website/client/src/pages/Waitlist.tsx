/**
 * Waitlist page — RiteDoc Founders offer + Brevo waitlist form
 * Colour scheme: RiteDoc blue (#2563EB) / white — clean blue, NOT navy, NOT teal
 * Mirrors the RiteDoc.com.au waitlist section exactly.
 *
 * NOTE: This page uses Navbar directly (not Layout) so it can render its own
 * RiteDoc-blue footer without affecting any other page on the site.
 */

import { useState } from "react";
import Navbar from "@/components/Navbar";
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle,
  Loader2,
  Lock,
  Star,
  MapPin,
  Mail,
} from "lucide-react";

const BREVO_API_KEY = "BREVO_API_KEY_HERE";
// List ID 3 = RiteDoc Waitlist list in Brevo
const WAITLIST_LIST_ID = 3;

const STRIPE_LINK = "https://buy.stripe.com/cNibJ13wKdVc3AS9BqdIA00";

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

/* ── Waitlist-only RiteDoc Blue Footer ── */
function WaitlistFooter() {
  return (
    <footer className="bg-[#1e40af] text-white">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold mb-1 text-white">RiteDoc</h3>
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

          {/* Pages */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/90 mb-4">Pages</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="https://readycompliant.com" className="text-white/75 text-sm hover:text-white transition-colors">Home</a>
              </li>
              <li>
                <a href="https://readycompliant.com/about" className="text-white/75 text-sm hover:text-white transition-colors">About</a>
              </li>
              <li>
                <a href="https://readycompliant.com/contact" className="text-white/75 text-sm hover:text-white transition-colors">Contact</a>
              </li>
            </ul>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/90 mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://marita-ready.github.io/ritedoc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/75 text-sm hover:text-white transition-colors"
                >
                  RiteDoc Demo
                </a>
              </li>
              <li>
                <a href="#waitlist" className="text-white/75 text-sm hover:text-white transition-colors">Join Waitlist</a>
              </li>
              <li>
                <a href="https://readycompliant.com/privacy" className="text-white/75 text-sm hover:text-white transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="https://readycompliant.com/terms" className="text-white/75 text-sm hover:text-white transition-colors">Terms of Service</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-blue-700 mt-12 pt-8">
          <p className="text-white/60 text-xs leading-relaxed mb-6">
            All documentation drafts are returned for your review and final approval. RiteDoc does not provide legal or compliance advice.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/60 text-sm">
            &copy; 2026 ReadyCompliant. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://readycompliant.com/privacy" className="text-white/60 text-sm hover:text-white transition-colors">Privacy Policy</a>
            <a href="https://readycompliant.com/terms" className="text-white/60 text-sm hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Main Waitlist Page ── */
export default function Waitlist() {
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
      // Redirect to confirmation page
      window.location.href = "/confirmation";
    } catch (err) {
      console.error("Waitlist submission error:", err);
      setErrorMsg("Something went wrong. Please try again or email us at hello@readycompliant.com.");
      setFormState("error");
    }
  };

  const features = [
    "Full RiteDoc desktop app",
    "All 6 NDIS platform formats",
    "Traffic-light scoring",
    "Red flag detection",
    "All future updates included",
    "Priority support",
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 md:pt-24">

        {/* Hero */}
        <section className="pt-24 pb-10 bg-white">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#2563EB] text-xs font-semibold uppercase tracking-widest mb-6">
              <Star size={12} />
              Limited Founders Offer
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              <span className="text-[#2563EB]">Join the </span>
              <span className="text-[#2563EB]">Rite</span><span className="text-slate-900">Doc</span>
              <span className="text-[#2563EB]"> Waitlist</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-4">
              Pay a $97 deposit now to secure your Founders seat. This deposit covers your first month's subscription. Your <strong>$97/month</strong> billing begins 30 days after RiteDoc launches — or join the free waitlist and be first to know when we launch.
            </p>
            <p className="flex items-start justify-center gap-1.5 text-slate-400 text-sm max-w-lg mx-auto">
              <ShieldCheck size={14} className="shrink-0 mt-0.5 text-[#2563EB]" />
              Try RiteDoc risk-free. From the day you receive access, you have 30 days to try it. If you're not completely satisfied, we'll refund you in full — no questions asked.
            </p>
          </div>
        </section>

        {/* Pricing Cards — Side by side on desktop, stacked on mobile */}
        <section className="py-10 bg-[#F8FAFC]">
          <div className="max-w-4xl mx-auto px-6">
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
                  {features.map((item) => (
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

              {/* Standard Card — Greyed out / disabled */}
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
                  {features.map((item) => (
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
        </section>

        {/* Divider */}
        <div className="flex items-center gap-4 max-w-4xl mx-auto px-6 py-6">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-slate-400 text-sm font-medium">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Brevo free waitlist form */}
        <section className="pb-20 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#2563EB] mb-1">Free Waitlist</h2>
              <p className="text-slate-500 text-sm mb-6">
                Join the free waitlist — no payment required. We'll let you know when RiteDoc launches and remind you about Founders pricing.
              </p>

              {formState === "success" ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle size={40} className="text-[#2563EB]" />
                  <p className="text-lg font-semibold text-slate-900">You're on the list!</p>
                  <p className="text-slate-500 text-sm">We'll be in touch when RiteDoc is ready.</p>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </section>

      </main>
      <WaitlistFooter />
    </div>
  );
}
