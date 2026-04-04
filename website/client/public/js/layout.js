// ReadyCompliant — Shared Layout (Navbar + Footer)

const LOGO_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663332161367/9x8jEx5KEDKsd5jH6tTYGE/blue_gradient_logo_clean_f5c79469.png';

function renderNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  nav.innerHTML = `
    <div class="container">
      <div class="navbar-inner">
        <a href="/" class="navbar-logo">
          <img src="${LOGO_URL}" alt="ReadyCompliant — RiteDoc Logo" />
          <div class="navbar-logo-text">
            <span class="navbar-logo-name">RiteDoc</span>
            <span class="navbar-logo-tagline">Notes Done Right</span>
          </div>
        </a>
        <nav class="navbar-links" aria-label="Main navigation">
          <a href="/">Home</a>
          <a href="/about.html">About</a>
          <a href="/ritedoc.html">RiteDoc</a>
          <a href="/contact.html">Contact</a>
        </nav>
        <a href="/waitlist" target="_blank" rel="noopener noreferrer" class="btn btn-primary navbar-cta">Join Waitlist</a>
        <button class="navbar-hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
    <div class="mobile-menu" id="mobile-menu">
      <a href="/">Home</a>
      <a href="/about.html">About</a>
      <a href="/ritedoc.html">RiteDoc</a>
      <a href="/contact.html">Contact</a>
      <a href="/waitlist" target="_blank" rel="noopener noreferrer" class="btn btn-primary">Join Waitlist</a>
    </div>
  `;
}

function renderFooter() {
  const footer = document.getElementById('footer');
  if (!footer) return;
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <h3>ReadyCompliant</h3>
          <p>Building practical tools to simplify NDIS documentation. We help providers and their admin teams spend less time rewriting paperwork and more time on what matters — the people they support.</p>
          <div class="footer-contact-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>Mornington, Victoria, Australia</span>
          </div>
          <div class="footer-contact-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <a href="mailto:hello@readycompliant.com">hello@readycompliant.com</a>
          </div>
        </div>
        <div class="footer-col">
          <h4>Pages</h4>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/about.html">About</a></li>
            <li><a href="/ritedoc.html">RiteDoc</a></li>
            <li><a href="/contact.html">Contact</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Product</h4>
          <ul>
            <li><a href="https://marita-ready.github.io/ritedoc/" target="_blank" rel="noopener noreferrer">RiteDoc Demo</a></li>
            <li><a href="/waitlist" target="_blank" rel="noopener noreferrer">Join Waitlist</a></li>
            <li><a href="/privacy.html">Privacy Policy</a></li>
            <li><a href="/terms.html">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 ReadyCompliant. All rights reserved.</p>
        <div class="footer-bottom-links">
          <a href="/privacy.html">Privacy Policy</a>
          <a href="/terms.html">Terms</a>
        </div>
      </div>
    </div>
  `;
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  renderFooter();
  // Re-run main.js logic after navbar is injected
  if (typeof initMain === 'function') initMain();
});
