import Layout from "@/components/Layout";

export default function Terms() {
  return (
    <Layout>
      <section className="bg-white py-16 md:py-24">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-8">Terms of Service</h1>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-600 leading-relaxed">
            <p><strong>Last updated:</strong> April 2026</p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using the ReadyCompliant website and products, you agree to be
              bound by these Terms of Service. If you do not agree with any part of these terms,
              please do not use our services.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">2. Description of Service</h2>
            <p>
              ReadyCompliant provides documentation technology tools for the NDIS sector, including
              the RiteDoc desktop application. Our tools are designed to assist with documentation
              and should not be considered a substitute for professional legal or regulatory advice.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">3. User Responsibilities</h2>
            <p>
              You are responsible for ensuring that your use of our products complies with all
              applicable laws and regulations, including NDIS requirements. You are responsible
              for the accuracy and completeness of any information you input into our tools.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">4. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the ReadyCompliant website and products
              are owned by ReadyCompliant and are protected by Australian and international
              copyright, trademark, and other intellectual property laws.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">5. Limitation of Liability</h2>
            <p>
              ReadyCompliant provides its tools on an "as is" basis. While we strive to ensure
              accuracy and reliability, we do not guarantee that our tools will meet all your
              documentation requirements. Use of our products does not guarantee audit outcomes.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-3">6. Contact</h2>
            <p>
              For questions about these Terms, please contact us at{" "}
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
