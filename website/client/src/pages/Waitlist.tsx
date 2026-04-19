import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowRight,
  CheckCircle,
  Loader2,
  Star,
} from "lucide-react";

async function submitToBrevoWaitlist(firstName: string, email: string) {
  const res = await fetch("/api/join-beta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      name: firstName,
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
    } catch (err) {
      console.error("Waitlist submission error:", err);
      setErrorMsg("Something went wrong. Please try again or email us at hello@readycompliant.com.");
      setFormState("error");
    }
  };

  if (formState === "success") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-20">
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle size={40} className="text-[#2563EB]" />
            <p className="text-lg font-semibold text-slate-900">You're on the list!</p>
            <p className="text-slate-500 text-sm">We'll be in touch when RiteDoc is ready.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-20">
        <div className="w-full max-w-md mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-[#2563EB] text-xs font-semibold uppercase tracking-widest mb-4">
              <Star size={12} />
              Limited Founders Offer
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
              Join the Waitlist
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              Join the free waitlist — no payment required. We'll let you know when RiteDoc launches and remind you about Founders pricing.
            </p>
          </div>

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
        </div>
      </main>
      <Footer />
    </div>
  );
}

