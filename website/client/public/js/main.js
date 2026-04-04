// ReadyCompliant — Shared JS

function initMain() {
  // ---- MOBILE NAV ----
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      const isOpen = mobileMenu.classList.contains('open');
      hamburger.setAttribute('aria-expanded', isOpen);
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  // ---- ACTIVE NAV LINK ----
  const path = window.location.pathname;
  document.querySelectorAll('.navbar-links a, .mobile-menu a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (href !== '/' && path.startsWith(href))) {
      a.classList.add('active');
    }
  });

  // ---- SCROLL REVEAL ----
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => observer.observe(el));
  }

  // ---- CONTACT FORM ----
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const BREVO_API_KEY = 'BREVO_API_KEY_HERE'; // Replace with your actual API key
    const CONTACT_LIST_ID = 7;

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('.form-submit');
      const errorEl = document.getElementById('form-error');
      const successEl = document.getElementById('form-success');
      const formFields = document.getElementById('form-fields');

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const message = document.getElementById('message').value.trim();

      if (!name || !email || !message) return;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Sending...';
      if (errorEl) errorEl.style.display = 'none';

      try {
        const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            attributes: { FIRSTNAME: name.split(' ')[0], LASTNAME: name.split(' ').slice(1).join(' ') || '' },
            listIds: [CONTACT_LIST_ID],
            updateEnabled: true
          })
        });
        if (!contactRes.ok && contactRes.status !== 400) throw new Error('Failed to save contact');

        const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: { name: 'ReadyCompliant Website', email: 'hello@readycompliant.com' },
            to: [{ email: 'hello@readycompliant.com', name: 'ReadyCompliant' }],
            subject: `New Contact Form Submission from ${name}`,
            htmlContent: `<h2>New Contact Form Submission</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p><hr><p style="color:#666;font-size:12px">Sent from the ReadyCompliant website contact form.</p>`,
            replyTo: { email, name }
          })
        });
        if (!emailRes.ok) throw new Error('Failed to send email');

        if (formFields) formFields.style.display = 'none';
        if (successEl) successEl.style.display = 'block';
      } catch (err) {
        console.error(err);
        if (errorEl) {
          errorEl.textContent = 'Something went wrong. Please email us directly at hello@readycompliant.com';
          errorEl.style.display = 'block';
        }
        btn.disabled = false;
        btn.innerHTML = 'Send Message <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
      }
    });
  }
}
