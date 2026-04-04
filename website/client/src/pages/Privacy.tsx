import Layout from "@/components/Layout";

export default function Privacy() {
  return (
    <Layout>
      <section className="bg-white py-16 md:py-24">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-8">Privacy Policy</h1>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
            <p><strong>Last updated:</strong> April 2026</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">1. Introduction</h2>
            <p>
              ReadyCompliant ("we", "us", or "our") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, and safeguard your information
              when you visit our website readycompliant.com and use our products.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">2. Information We Collect</h2>
            <p>
              We may collect personal information that you voluntarily provide to us when you
              fill out our contact form, join our waitlist, or otherwise interact with us.
              This may include your name, email address, and any message content you provide.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">3. RiteDoc and Your Data</h2>
            <p>
              RiteDoc is designed with privacy as a core principle. The desktop application
              operates entirely offline — no participant data, progress notes, or sensitive
              information is ever transmitted to our servers or any third party. All processing
              happens locally on your device.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">4. How We Use Your Information</h2>
            <p>
              Information collected through our website is used to respond to your enquiries,
              send you product updates (if you've opted in), and improve our services. We do
              not sell or share your personal information with third parties for marketing purposes.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">5. Third-Party Services</h2>
            <p>
              We use Brevo (formerly Sendinblue) to manage our contact lists and email
              communications. Your information may be stored on Brevo's servers in accordance
              with their privacy policy.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:hello@readycompliant.com" className="text-[#2563EB] hover:underline">
                hello@readycompliant.com
              </a>.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
