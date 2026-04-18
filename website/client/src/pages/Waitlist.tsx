/**
 * Waitlist page — RiteDoc Founders offer + Brevo waitlist form
 * ReadyCompliant colour scheme: white/cream backgrounds, emerald headings, green buttons
 */

import { useState } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { ShieldCheck, ArrowRight, CheckCircle, Loader2, Lock, Star } from "lucide-react";
import SchemaMarkup, { productSchema, organisationSchema } from "@/components/SchemaMarkup";

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

  return (
    <Layout>
      {/* Product + Organisation schema for SEO/AEO */}
      <SchemaMarkup schemas={[productSchema, organisationSchema]} />
      {/* Hero */}
      <section className="pt-24 pb-10 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5F0E8] text-[#006B3F] text-xs font-semibold uppercase tracking-widest mb-6">
            <Star size={12} />
            Limited Founders Offer
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            <span className="text-[#006B3F]">Join the </span>
            <span className="text-[#2563EB]">Rite</span><span className="text-slate-900">Doc</span>
            <span className="text-[#006B3F]"> Waitlist</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto mb-4">
            Lock in Founders pricing at <strong>$97/month forever</strong> — or join the free waitlist and be first to know when we launch.
          </p>
          <p className="flex items-start justify-center gap-1.5 text-slate-400 text-sm max-w-lg mx-auto">
            <ShieldCheck size={14} className="shrink-0 mt-0.5 text-[#16A34A]" />
            Try RiteDoc risk-free. From the day you receive access, you have 30 days to try it. If you’re not completely satisfied, we’ll refund you in full — no questions asked.
          </p>
        </div>
      </section>

      {/* Stripe CTA — Founders Offer */}
      <section className="py-10 bg-[#F8F4ED]">
        <div className="max-w-2xl mx-auto px-6">
          <div className="bg-white rounded-2xl border-2 border-[#006B3F]/20 p-8 text-center shadow-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F0E8] text-[#006B3F] text-xs font-semibold uppercase tracking-widest mb-4">
              Only 17 Seats Available
            </div>
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
                  <CheckCircle size={15} className="text-[#16A34A] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a
              href={STRIPE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-full text-base transition-all shadow-md shadow-green-500/20"
            >
              <Lock size={16} />
              Lock in Founders Price — $97/month
              <ArrowRight size={16} />
            </a>
            <p className="flex items-start justify-center gap-1.5 mt-3 text-slate-500 text-xs max-w-sm mx-auto text-center">
              <ShieldCheck size={13} className="text-[#16A34A] shrink-0 mt-0.5" />
              Try RiteDoc risk-free. From the day you receive access, you have 30 days to try it. If you're not completely satisfied, we'll refund you in full — no questions asked.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="flex items-center gap-4 max-w-2xl mx-auto px-6 py-6">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-slate-400 text-sm font-medium">or</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Brevo free waitlist form */}
      <section className="pb-20 bg-white">
        <div className="max-w-2xl mx-auto px-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-[#006B3F] mb-1">Not ready to commit yet?</h2>
            <p className="text-slate-500 text-sm mb-6">
              Join the free waitlist — no payment required. We'll let you know when RiteDoc launches and remind you about Founders pricing.
            </p>

            {formState === "success" ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle size={40} className="text-[#16A34A]" />
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] transition"
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] transition"
                  />
                </div>
                {formState === "error" && (
                  <p className="text-red-500 text-sm">{errorMsg}</p>
                )}
                <button
                  type="submit"
                  disabled={formState === "loading"}
                  className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-full transition-all disabled:opacity-60"
                >
                  {formState === "loading" ? (
                    <><Loader2 size={16} className="animate-spin" /> Adding you...</>
                  ) : (
                    <>Not now — just add me to the waitlist <ArrowRight size={16} /></>
                  )}
                </button>
                <p className="text-center text-slate-400 text-xs">We respect your privacy. No spam, ever.</p>
              </form>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
