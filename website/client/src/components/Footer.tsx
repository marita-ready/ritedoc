import { Link } from "wouter";
import { MapPin, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold mb-3">ReadyCompliant</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              All documentation drafts are returned for your review and final approval. RiteDoc does not provide legal or compliance advice.
            </p>
            <div className="flex items-center gap-2 mt-4 text-slate-400 text-sm">
              <MapPin size={16} className="shrink-0" />
              <span>Mornington, Victoria, Australia</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-slate-400 text-sm">
              <Mail size={16} className="shrink-0" />
              <a href="mailto:hello@readycompliant.com" className="hover:text-white transition-colors">
                hello@readycompliant.com
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">Pages</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-slate-400 text-sm hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/about" className="text-slate-400 text-sm hover:text-white transition-colors">About</Link>
              </li>
              <li>
                <Link href="/ritedoc" className="text-slate-400 text-sm hover:text-white transition-colors">RiteDoc</Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-400 text-sm hover:text-white transition-colors">Contact</Link>
              </li>
            </ul>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://marita-ready.github.io/ritedoc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 text-sm hover:text-white transition-colors"
                >
                  RiteDoc Demo
                </a>
              </li>
              <li>
                <a
                  href="https://ritedoclp-dqtvlarf.manus.space/#waitlist"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 text-sm hover:text-white transition-colors"
                >
                  Join Waitlist
                </a>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-400 text-sm hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-400 text-sm hover:text-white transition-colors">Terms of Service</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-slate-800 mt-12 pt-8">
          <p className="text-slate-500 text-xs leading-relaxed mb-6">
            All documentation drafts are returned for your review and final approval. RiteDoc does not provide legal or compliance advice.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            &copy; 2026 ReadyCompliant. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-slate-500 text-sm hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-slate-500 text-sm hover:text-slate-300 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
