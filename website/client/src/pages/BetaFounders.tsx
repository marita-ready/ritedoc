import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle, ArrowRight, ShieldCheck } from "lucide-react";

export default function BetaFounders() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20 md:pt-24">
        {/* HERO SECTION */}
        <section className="bg-[#2563EB] py-20 md:py-28 text-white text-center">
          <div className="container px-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6">
              You're on the Private Beta Testing list!
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto">
              We'll be in touch soon with your access details.
            </p>
          </div>
        </section>

        {/* FOUNDERS OFFER SECTION */}
        <section className="bg-white py-20 md:py-28">
          <div className="container px-6 max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">
                While you wait, lock in your Founder rate — $97/mo.
              </h2>
            </div>

            <div className="bg-slate-50 rounded-3xl p-8 md:p-12 border border-slate-100 shadow-sm">
              <ul className="space-y-6 mb-12 max-w-2xl mx-auto">
                {[
                  "Free access to all RiteDoc features until August 1, 2026",
                  "First payment starts August 1 — not a cent before then",
                  "Lock in $97/mo for life — price increases for everyone else after the Private Beta Testing",
                ].map((point, i) => (
                  <li key={i} className="flex items-start gap-4 text-lg text-slate-700">
                    <CheckCircle className="text-[#2563EB] shrink-0 mt-1" size={24} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="text-center">
                <a
                  href="https://buy.stripe.com/cNibJ13wKdVc3AS9BqdIA00"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-10 py-5 bg-[#2563EB] text-white text-xl font-bold rounded-full hover:bg-[#1d4ed8] transition-all shadow-xl shadow-blue-500/25 mb-6"
                >
                  Secure My Founder Seat
                  <ArrowRight size={22} />
                </a>
                <p className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                  <ShieldCheck size={18} className="text-[#2563EB]" />
                  Cancel anytime before August 1 — no charge. No lock-in contracts.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
