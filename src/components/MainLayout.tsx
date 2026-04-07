import { NavLink, Outlet } from "react-router-dom";
import Logo from "./Logo";
import "../styles/layout.css";

const NAV_ITEMS = [
  {
    to: "/",
    label: "Home",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M3 10L10 3L17 10M5 8.5V16C5 16.55 5.45 17 6 17H8.5V12.5H11.5V17H14C14.55 17 15 16.55 15 16V8.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    end: true,
  },
  {
    to: "/new-note",
    label: "New Note",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 4V16M4 10H16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    to: "/my-notes",
    label: "My Notes",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M5 4H15C15.55 4 16 4.45 16 5V15C16 15.55 15.55 16 15 16H5C4.45 16 4 15.55 4 15V5C4 4.45 4.45 4 5 4Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M7 8H13M7 11H13M7 14H10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    to: "/goals",
    label: "Goals",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="1.25" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: "/settings",
    label: "Settings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 12.5C11.38 12.5 12.5 11.38 12.5 10C12.5 8.62 11.38 7.5 10 7.5C8.62 7.5 7.5 8.62 7.5 10C7.5 11.38 8.62 12.5 10 12.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M16.17 10C16.17 9.53 15.93 9.1 15.55 8.85L14.5 8.15L14.85 6.95C14.98 6.5 14.85 6.02 14.5 5.7L14.3 5.5C13.98 5.15 13.5 5.02 13.05 5.15L11.85 5.5L11.15 4.45C10.9 4.07 10.47 3.83 10 3.83C9.53 3.83 9.1 4.07 8.85 4.45L8.15 5.5L6.95 5.15C6.5 5.02 6.02 5.15 5.7 5.5L5.5 5.7C5.15 6.02 5.02 6.5 5.15 6.95L5.5 8.15L4.45 8.85C4.07 9.1 3.83 9.53 3.83 10C3.83 10.47 4.07 10.9 4.45 11.15L5.5 11.85L5.15 13.05C5.02 13.5 5.15 13.98 5.5 14.3L5.7 14.5C6.02 14.85 6.5 14.98 6.95 14.85L8.15 14.5L8.85 15.55C9.1 15.93 9.53 16.17 10 16.17C10.47 16.17 10.9 15.93 11.15 15.55L11.85 14.5L13.05 14.85C13.5 14.98 13.98 14.85 14.3 14.5L14.5 14.3C14.85 13.98 14.98 13.5 14.85 13.05L14.5 11.85L15.55 11.15C15.93 10.9 16.17 10.47 16.17 10Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
];

export default function MainLayout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Logo size={28} />
          <span className="sidebar-title">RiteDoc</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="version-tag">v0.1.0</span>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
