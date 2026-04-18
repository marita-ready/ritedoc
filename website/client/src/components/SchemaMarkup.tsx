/**
 * SchemaMarkup — Injects JSON-LD structured data into document.head for SEO/AEO.
 * Supports: Organisation, Product (SoftwareApplication), FAQPage schemas.
 * Usage: <SchemaMarkup type="organisation" /> — can be composed per page.
 */
import { useEffect } from "react";

// ─── Organisation Schema ─────────────────────────────────────────────────────
export const organisationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ReadyCompliant",
  url: "https://readycompliant.com",
  logo: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/9x8jEx5KEDKsd5jH6tTYGE/blue_gradient_logo_clean_f5c79469.png",
  description:
    "ReadyCompliant builds practical tools for NDIS providers and their admin teams. RiteDoc rewrites support worker progress notes into audit-prepared drafts — offline, on your device.",
  email: "hello@readycompliant.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Mornington",
    addressRegion: "Victoria",
    addressCountry: "AU",
  },
  founder: {
    "@type": "Person",
    name: "Marita Frith",
  },
  sameAs: ["https://readycompliant.com"],
};

// ─── Product (SoftwareApplication) Schema ────────────────────────────────────
export const productSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "RiteDoc",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Windows",
  description:
    "RiteDoc is an offline Windows desktop application that rewrites raw NDIS support worker progress notes into audit-prepared drafts. It uses local AI to process notes securely on your device — no internet required.",
  url: "https://readycompliant.com/ritedoc",
  screenshot:
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/9x8jEx5KEDKsd5jH6tTYGE/ritedoc-product-visual-VebZrgvyfZ39f8LV87eQif.webp",
  offers: [
    {
      "@type": "Offer",
      name: "Founders Pricing",
      price: "97.00",
      priceCurrency: "AUD",
      priceSpecification: {
        "@type": "RecurringChargeSpecification",
        billingPeriod: "P1M",
        price: "97.00",
        priceCurrency: "AUD",
      },
      description:
        "Founders pricing — $97/month locked in forever. Limited to 17 seats.",
      availability: "https://schema.org/LimitedAvailability",
      url: "https://readycompliant.com/waitlist",
    },
    {
      "@type": "Offer",
      name: "Standard Monthly",
      price: "197.00",
      priceCurrency: "AUD",
      priceSpecification: {
        "@type": "RecurringChargeSpecification",
        billingPeriod: "P1M",
        price: "197.00",
        priceCurrency: "AUD",
      },
      description: "Standard monthly pricing after Founders seats close.",
      availability: "https://schema.org/PreOrder",
      url: "https://readycompliant.com/waitlist",
    },
    {
      "@type": "Offer",
      name: "Standard Annual",
      price: "1497.00",
      priceCurrency: "AUD",
      priceSpecification: {
        "@type": "RecurringChargeSpecification",
        billingPeriod: "P1Y",
        price: "1497.00",
        priceCurrency: "AUD",
      },
      description: "Standard annual pricing — save 36% compared to monthly.",
      availability: "https://schema.org/PreOrder",
      url: "https://readycompliant.com/waitlist",
    },
  ],
  featureList: [
    "100% offline — no internet required",
    "Supports ShiftCare, Brevity, Lumary, Astalty, SupportAbility, CareMaster",
    "Traffic-light scoring system (Green / Orange / Red)",
    "Red flag incident detection",
    "Platform-aware clipboard for one-click copy-back",
    "Local AI processing — participant data never leaves your device",
  ],
  author: {
    "@type": "Organization",
    name: "ReadyCompliant",
    url: "https://readycompliant.com",
  },
};

// ─── FAQ Schema (Home page) ───────────────────────────────────────────────────
export const homeFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is ReadyCompliant?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ReadyCompliant is an Australian company that builds practical tools for NDIS providers and their admin teams. Our flagship product, RiteDoc, rewrites rough support worker progress notes into audit-prepared drafts — saving your admin team hours every week.",
      },
    },
    {
      "@type": "Question",
      name: "What is RiteDoc?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RiteDoc is an offline Windows desktop application that rewrites raw NDIS support worker progress notes into audit-prepared drafts. It uses local AI to process notes securely on your device — no internet required, and no data ever leaves your computer.",
      },
    },
    {
      "@type": "Question",
      name: "Who is RiteDoc designed for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RiteDoc is designed specifically for NDIS provider admin teams who are responsible for rewriting and quality-checking support worker progress notes before they are entered into the provider's platform.",
      },
    },
    {
      "@type": "Question",
      name: "Does RiteDoc require an internet connection?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. RiteDoc is fully offline. All processing happens on your device using a local AI model. No data ever leaves your computer, ensuring complete privacy and security for sensitive participant information.",
      },
    },
    {
      "@type": "Question",
      name: "What NDIS platforms does RiteDoc support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RiteDoc supports CSV exports from ShiftCare, Brevity, Lumary, Astalty, SupportAbility, and CareMaster. More platforms are being added.",
      },
    },
    {
      "@type": "Question",
      name: "How much does RiteDoc cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RiteDoc offers three pricing tiers: Founders pricing at $97/month (locked in forever, limited to 17 seats), Standard Monthly at $197/month, and Standard Annual at $1,497/year (saving 36%). Founders pricing is available through the waitlist.",
      },
    },
  ],
};

// ─── FAQ Schema (RiteDoc product page) ───────────────────────────────────────
export const ritedocFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does RiteDoc work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RiteDoc works in three steps: (1) Export a CSV of support worker progress notes from your NDIS platform (ShiftCare, Brevity, Lumary, etc.), (2) Import the CSV into RiteDoc — the app rewrites the rough notes into professional, audit-prepared drafts offline on your device, (3) Review each draft and copy it back into your platform using the one-click clipboard.",
      },
    },
    {
      "@type": "Question",
      name: "What does the traffic-light scoring system mean?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RiteDoc uses a traffic-light system to indicate the status of each note: Green means the note is audit-ready and good to go. Orange means something is missing — RiteDoc prompts you to fill in the gaps. Red means an incident has been detected — all required incident documentation is pre-filled and ready for your review.",
      },
    },
    {
      "@type": "Question",
      name: "Is participant data kept private?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. RiteDoc is 100% offline. No data ever leaves your device. Sensitive participant information stays within your organisation at all times. There is no cloud upload, no third-party access, and no internet connection required.",
      },
    },
    {
      "@type": "Question",
      name: "Does RiteDoc replace my existing NDIS platform?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. RiteDoc works alongside your existing NDIS management platform. You export notes from your platform as a CSV, process them in RiteDoc, then copy the polished drafts back into your platform. RiteDoc does not store or manage participant records.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to review the drafts RiteDoc produces?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, absolutely. RiteDoc produces audit-prepared drafts — not final documentation. Every draft must be reviewed and approved by your team before being entered into your platform. RiteDoc does not provide legal or compliance advice.",
      },
    },
    {
      "@type": "Question",
      name: "What are the minimum computer requirements for RiteDoc?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "To run RiteDoc smoothly, your computer should have at least 16GB of RAM, an Intel i7 or i5 processor, and run Windows 10 or Windows 11.",
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel my RiteDoc subscription anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Billing is monthly and you can cancel at any time. There are no lock-in contracts. Founders pricing subscribers keep their locked-in rate for as long as they remain subscribed.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to process a batch of notes?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Processing times depend on your hardware. On minimum specs (Intel i5/i7, 16GB RAM), it typically takes 5 to 13 minutes to process a batch of 50 notes. It will be faster on better hardware.",
      },
    },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────
interface SchemaMarkupProps {
  schemas: object[];
}

export default function SchemaMarkup({ schemas }: SchemaMarkupProps) {
  useEffect(() => {
    const injected: HTMLScriptElement[] = [];

    schemas.forEach((schema, index) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = `schema-markup-${index}-${Date.now()}`;
      script.textContent = JSON.stringify(schema, null, 0);
      document.head.appendChild(script);
      injected.push(script);
    });

    return () => {
      injected.forEach((script) => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, []);

  return null;
}
