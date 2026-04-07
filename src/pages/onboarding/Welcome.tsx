import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import "../../styles/onboarding.css";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-steps">
          <span className="step-dot active" />
          <span className="step-dot" />
          <span className="step-dot" />
        </div>

        <div className="onboarding-logo">
          <Logo size={44} />
          <h1>RiteDoc</h1>
        </div>

        <h2>Welcome to RiteDoc</h2>
        <p className="subtitle">
          RiteDoc helps support workers write professional NDIS progress notes
          quickly. Type your raw observations and let RiteDoc transform them into
          polished, compliant documentation.
        </p>

        <div className="feature-highlights">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            {[
              {
                icon: "📝",
                text: "Write notes in your own words",
              },
              {
                icon: "🔄",
                text: "Instantly rewrite them into professional format",
              },
              {
                icon: "🎯",
                text: "Service-specific cartridges for NDIS compliance",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.625rem 0.875rem",
                  background: "var(--blue-50)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.875rem",
                  color: "var(--slate-700)",
                }}
              >
                <span style={{ fontSize: "1.125rem" }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <div className="onboarding-actions" style={{ justifyContent: "center" }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate("/onboarding/setup")}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
