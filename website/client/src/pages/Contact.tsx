/*
 * DESIGN: Bold Authority — danmartell.com inspired
 * Contact page: Form with Brevo API integration, location info
 */

import { useState } from "react";
import Layout from "@/components/Layout";
import SectionReveal from "@/components/SectionReveal";
import { MapPin, Mail, ArrowRight, CheckCircle, Loader2 } from "lucide-react";

const BREVO_API_KEY = "BREVO_API_KEY_HERE"; // Replace with your actual API key
// List ID 7 = "Website Contact Form" list (pre-created in Brevo)
const CONTACT_LIST_ID = 7;

async function submitToBrevo(name: string, email: string, message: string) {
  // Add contact to the "Website Contact Form" list
  const contactRes = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      attributes: { FIRSTNAME: name.split(" ")[0], LASTNAME: name.split(" ").slice(1).join(" ") || "", SMS: message },
      listIds: [CONTACT_LIST_ID],
      updateEnabled: true,
    }),
  });
  if (!contactRes.ok && contactRes.status !== 400) {
    // 400 can mean contact already exists — that's fine
    throw new Error("Failed to save contact");
  }

  // Send transactional email notification to hello@readycompliant.com
  const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: "ReadyCompliant Website", email: "hello@readycompliant.com" },
      to: [{ email: "hello@readycompliant.com", name: "ReadyCompliant" }],
      subject: `New Contact Form Submission from ${name}`,
      htmlContent: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
        <hr>
        <p style="color:#666;font-size:12px">Sent from the ReadyCompliant website contact form.</p>
      `,
      replyTo: { email, name },
    }),
  });
  if (!emailRes.ok) {
    throw new Error("Failed to send notification email");
  }
}

export default function Contact() {
  const [formState, setFormState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setFormState("loading");
    try {
      await submitToBrevo(name.trim(), email.trim(), message.trim());
      setFormState("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error("Form submission error:", err);
      setErrorMsg("Something went wrong. Please try emailing us directly.");
      setFormState("error");
    }
  };

  return (
    <Layout>
      {/* ===== HERO ===== */}
      <section className="bg-white py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl animate-fade-in-up">
            <span className="text-[#2563EB] text-sm font-semibold uppercase tracking-widest">
              Contact Us
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mt-3 mb-6">
              Let's Talk.
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Have a question about RiteDoc or ReadyCompliant? We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* ===== FORM + INFO ===== */}
      <section className="bg-[#F8FAFC] py-20 md:py-28">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
            {/* Form */}
            <SectionReveal className="lg:col-span-3">
              <div className="bg-white rounded-2xl p-8 md:p-10 border border-slate-100 shadow-sm">
                {formState === "success" ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
                      <CheckCircle className="text-green-500" size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Message Sent!</h3>
                    <p className="text-slate-600 mb-6">
                      Thanks for reaching out. We'll get back to you as soon as possible.
                    </p>
                    <button
                      onClick={() => setFormState("idle")}
                      className="text-[#2563EB] font-semibold hover:underline"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                        Your Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="e.g. Jane Smith"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="jane@example.com"
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-2">
                        Message
                      </label>
                      <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        rows={5}
                        placeholder="Tell us how we can help..."
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all resize-none"
                      />
                    </div>

                    {formState === "error" && (
                      <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
                        {errorMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={formState === "loading"}
                      className="inline-flex items-center justify-center gap-2 w-full px-7 py-3.5 bg-[#2563EB] text-white font-semibold rounded-full hover:bg-[#1d4ed8] transition-all shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {formState === "loading" ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </SectionReveal>

            {/* Contact Info */}
            <SectionReveal className="lg:col-span-2" delay={0.15}>
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">Get in Touch</h3>
                  <p className="text-slate-600 leading-relaxed">
                    Whether you have a question about RiteDoc, want to discuss a partnership,
                    or just want to say hello — we're here for you.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Mail className="text-[#2563EB]" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm mb-1">Email</h4>
                      <a
                        href="mailto:hello@readycompliant.com"
                        className="text-[#2563EB] hover:underline"
                      >
                        hello@readycompliant.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <MapPin className="text-[#2563EB]" size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm mb-1">Location</h4>
                      <p className="text-slate-600">
                        Mornington, Victoria
                        <br />
                        Australia
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-6">
                  <h4 className="font-bold text-slate-900 mb-2">Looking for RiteDoc?</h4>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    Join the waitlist to be among the first to access RiteDoc at our special
                    founders pricing.
                  </p>
                  <a
                    href="https://ritedoclp-dqtvlarf.manus.space/#waitlist"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#2563EB] font-semibold text-sm hover:underline"
                  >
                    Join the Waitlist
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>
    </Layout>
  );
}
