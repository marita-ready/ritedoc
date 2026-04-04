import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

const BREVO_API_KEY = "REDACTED_BREVO_API_KEY";
const BREVO_LIST_ID = 2;
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/cNibJ13wKdVc3AS9BqdIA00";
const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/9x8jEx5KEDKsd5jH6tTYGE/ritedoc-logo-new-full_7d30d3a3.png";

async function submitToBrevo(firstName: string, email: string, phone: string, company: string) {
  try {
    // Add contact to Brevo
    const contactRes = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        attributes: {
          FIRSTNAME: firstName,
          SMS: phone,
          COMPANY: company,
        },
        listIds: [BREVO_LIST_ID],
        updateEnabled: true,
      }),
    });

    if (!contactRes.ok) {
      throw new Error(`Brevo API error: ${contactRes.status}`);
    }

    return true;
  } catch (error) {
    console.error("Error submitting to Brevo:", error);
    throw error;
  }
}

export default function Waitlist() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    phone: "",
    company: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!formData.firstName || !formData.email || !formData.phone || !formData.company) {
        setError("Please fill in all fields");
        setIsSubmitting(false);
        return;
      }

      await submitToBrevo(formData.firstName, formData.email, formData.phone, formData.company);
      
      // Mark that user came from waitlist form
      sessionStorage.setItem("fromWaitlist", "true");
      setLocation("/confirmation");
    } catch (err) {
      setError("Failed to join waitlist. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleStripeClick = () => {
    window.open(STRIPE_PAYMENT_LINK, "_blank");
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img src={LOGO_URL} alt="RiteDoc" className="h-24 w-auto" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
          Join the Waitlist
        </h1>

        {/* Subtitle */}
        <p className="text-gray-600 text-center mb-8 text-sm leading-relaxed">
          Be the first to know when RiteDoc launches. Lock in Founders pricing today — $97/month, recurring. This rate is locked in for life. Standard pricing after launch is $197/month. Cancel anytime after the first month.
        </p>

        {/* Form */}
        <form onSubmit={handleWaitlistSubmit} className="space-y-4 mb-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="e.g. Jane"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="jane@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+61 2 1234 5678"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Your organisation"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-4">
            <button
              type="button"
              onClick={handleStripeClick}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Lock in Founders Price — $97/month
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gray-100 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Not now — join the waitlist
            </button>
          </div>
        </form>

        {/* Privacy text */}
        <p className="text-center text-xs text-gray-500">
          We respect your privacy. No spam, ever.
        </p>
      </div>
    </div>
  );
}
