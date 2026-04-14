import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";
import "../../styles/onboarding.css";

const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          d="M3 15L6 14L14 6C14.55 5.45 14.55 4.55 14 4L14 4C13.45 3.45 12.55 3.45 12 4L4 12L3 15Z"
          stroke="var(--blue-600)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M11 5L13 7" stroke="var(--blue-600)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    text: "Write notes in plain language — no special formatting needed",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          d="M9 3V6M9 12V15M3 9H6M12 9H15"
          stroke="var(--blue-600)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="9" cy="9" r="3" stroke="var(--blue-600)" strokeWidth="1.4" />
      </svg>
    ),
    text: "Instantly rewrite into professional, audit-ready format",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="14" height="12" rx="2" stroke="var(--blue-600)" strokeWidth="1.4" />
        <path d="M5 7H13M5 10H10" stroke="var(--blue-600)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    text: "Service-specific cartridges aligned to NDIS Practice Standards",
  },
];

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
          quickly. Type your raw observations and RiteDoc transforms them into
          polished, compliant documentation.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            marginBottom: "1.75rem",
          }}
        >
          {FEATURES.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.6875rem 0.875rem",
                background: "var(--blue-50)",
                border: "1px solid var(--blue-100)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                color: "var(--slate-700)",
                lineHeight: 1.4,
              }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>

        <div className="onboarding-actions" style={{ justifyContent: "center" }}>
          <button
            className="btn btn-primary btn-lg"
            style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
            onClick={() => navigate("/onboarding/setup")}
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
