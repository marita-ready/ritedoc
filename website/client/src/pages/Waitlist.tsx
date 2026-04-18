/**
 * Waitlist page — RiteDoc Private Beta Testing contact collection
 * Colour scheme: RiteDoc blue (#2563EB) / white — clean blue, NOT navy, NOT teal
 */

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  CheckCircle,
  Loader2,
  Star,
} from "lucide-react";

async function submitToWaitlist(firstName: string, email: string) {
  const res = await fetch("https://api.readycompliant.com", {

    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: firstName,
      email,
    }),
  });
  if (!res.ok && res.status !== 400) {
    throw new Error("Failed to add to waitlist");
  }
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
      await submitToWaitlist(firstName.trim(), email.trim());
      setFormState("success");
      setFirstName("");
      setEmail("");
      // Redirect to beta-founders page
      window.location.href = "/beta-founders";
    } catch (err) {
      console.error("Waitlist submission error:", err);
      setErrorMsg("Something went wrong. Please try again or email us at hello@readycompliant.com.");
      setFormState("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 md:pt-24">

        {/* Hero */}
        <section className="pt-24 pb-10 bg-white">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#2563EB] text-xs font-semibold uppercase tracking-widest mb-6">
              <Star size={12} />
              Private Beta Testing
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              Join the <span className="text-[#2563EB]">RiteDoc</span> Private Beta Testing
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-4">
              Be among the first to experience documentation done right. Enter your details below and we'll be in touch.
            </p>
          </div>
        </section>

        {/* Contact form */}
        <section className="pb-20 bg-white">
          <div className="max-w-xl mx-auto px-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
              {formState === "success" ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle size={40} className="text-[#2563EB]" />
                  <p className="text-lg font-semibold text-slate-900">You're on the list!</p>
                  <p className="text-slate-500 text-sm">Redirecting you now...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">
                      Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      placeholder="Your name"
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
                      <><Loader2 size={16} className="animate-spin" /> Joining...</>
                    ) : (
                      <>Join the Private Beta Testing <ArrowRight size={16} /></>
                    )}
                  </button>
                  <p className="text-center text-slate-400 text-xs">We respect your privacy. No spam, ever.</p>
                </form>
              )}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
