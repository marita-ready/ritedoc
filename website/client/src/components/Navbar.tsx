import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";

const LOGO_URL = "/readycompliant-logo.png";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/ritedoc", label: "RiteDoc" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <nav className="container flex items-center justify-between py-3 md:py-4">
        {/* Logo + Company Name */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img
            src={LOGO_URL}
            alt="ReadyCompliant"
            className="h-10 md:h-12 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium tracking-wide transition-colors hover:text-[#2563EB] ${
                location === link.href
                  ? "text-[#2563EB]"
                  : "text-slate-600"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/waitlist"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-full hover:bg-[#1d4ed8] transition-colors shadow-sm"
          >
            Join Waitlist
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-slate-700"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <div className="container py-4 flex flex-col gap-3">
            {/* Show company name in mobile menu */}
            <div className="pb-2 mb-2 border-b border-gray-100">
              <img src={LOGO_URL} alt="ReadyCompliant" className="h-8 w-auto" />
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`text-base font-medium py-2 transition-colors ${
                  location === link.href
                    ? "text-[#2563EB]"
                    : "text-slate-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/waitlist"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-full hover:bg-[#1d4ed8] transition-colors mt-2"
            >
              Join Waitlist
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
