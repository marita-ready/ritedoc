import "./App.css";

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-section">
          <svg
            className="logo-icon"
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="40" height="40" rx="8" fill="#2563EB" />
            <path
              d="M12 10H24C25.1 10 26 10.9 26 12V28C26 29.1 25.1 30 24 30H12C10.9 30 10 29.1 10 28V12C10 10.9 10.9 10 12 10Z"
              fill="white"
              opacity="0.9"
            />
            <path
              d="M14 16H22M14 20H22M14 24H19"
              stroke="#2563EB"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M28 14V26C28 27.1 27.1 28 26 28"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            />
          </svg>
          <h1 className="app-title">RiteDoc</h1>
        </div>
        <p className="app-subtitle">Notes Done Right</p>
      </header>

      <main className="app-main">
        <div className="welcome-card">
          <h2>Welcome to RiteDoc</h2>
          <p>
            Your desktop document editor is ready for development. Start
            building your features by editing the React frontend and Rust
            backend.
          </p>
          <div className="feature-grid">
            <div className="feature-item">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 17L12 22L22 17"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 12L12 17L22 12"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span>Tauri 2.0</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#2563EB"
                    strokeWidth="2"
                  />
                  <circle cx="12" cy="12" r="4" fill="#2563EB" />
                </svg>
              </div>
              <span>React + TypeScript</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
                    stroke="#2563EB"
                    strokeWidth="2"
                  />
                  <path
                    d="M8 12L11 15L16 9"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span>Rust Backend</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 6H20M4 6V18C4 19.1 4.9 20 6 20H18C19.1 20 20 19.1 20 18V6M4 6L6 2H18L20 6"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 10V16M15 10V16"
                    stroke="#2563EB"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span>SQLite Ready</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>RiteDoc v0.1.0</p>
      </footer>
    </div>
  );
}

export default App;
