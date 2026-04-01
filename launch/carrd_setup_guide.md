# RiteDoc — Complete Carrd Landing Page Setup Guide

**Product:** RiteDoc | **Parent Company:** ReadyCompliant | **Domain:** ritedoc.com.au
**Prepared for:** marita@readycompliant.com | **Platform:** Carrd.co

---

> **How to use this guide:** Every step is written for a non-technical user. You do not need any coding knowledge. Follow each numbered step in order, and do not skip any step. Screenshots referenced in this guide reflect the Carrd interface as of 2025–2026.

---

## Table of Contents

1. [Signing Up for Carrd](#step-1-signing-up-for-carrd)
2. [Upgrading to Carrd Pro Standard ($19/year)](#step-2-upgrading-to-carrd-pro-standard)
3. [Choosing a Template](#step-3-choosing-a-template)
4. [Building the Landing Page](#step-4-building-the-landing-page)
   - [Hero Section](#section-1-hero)
   - [What RiteDoc Does](#section-2-what-ritedoc-does)
   - [Who It's For](#section-3-who-its-for)
   - [Pricing Section](#section-4-pricing)
   - [Waitlist / Signup Form](#section-5-waitlist--signup-form)
   - [Footer](#section-6-footer)
5. [Connecting the Custom Domain (Cloudflare)](#step-5-connecting-the-custom-domain-via-cloudflare)
6. [Connecting Stripe Payment Buttons](#step-6-connecting-stripe-payment-buttons)
7. [Setting Up Form Submissions](#step-7-setting-up-form-email-submissions)
8. [Final Checklist](#final-checklist)
9. [Suggested Copy Reference](#suggested-copy-reference)

---

## Step 1: Signing Up for Carrd

Carrd is a simple website builder that lets you create a single-page site without any coding. You will create a free account first, then upgrade to Pro in the next step.

1. Open your web browser (Chrome, Safari, or Firefox) and go to **[https://carrd.co](https://carrd.co)**.
2. On the homepage, click the large button labelled **"Choose a Starting Point"**. This begins the account creation process.
3. A popup window will appear showing templates. In the **top right corner** of this popup, click the **"Log In"** button.
4. A smaller login panel will appear. At the very bottom of this panel, click the link that says **"Sign Up"**.
5. You will now see a registration form. Fill in each field:
   - **Name:** Type your name (e.g., `Marita` or `RiteDoc Admin`).
   - **Email:** Type `marita@readycompliant.com` exactly as shown.
   - **Password:** Choose a strong password (at least 10 characters, mixing letters, numbers, and symbols). Type it once, then type it again in the **"Confirm Password"** field.
6. Tick the checkbox next to **"I agree to the Terms of Service and Privacy Policy"**.
7. Click the **"Sign Up"** button.
8. Carrd will send a verification email to `marita@readycompliant.com`. Open your email inbox, find the email from Carrd, and click the **"Verify Email Address"** link inside it.
9. You are now logged in to your Carrd dashboard. You will see a mostly empty screen with a large **"+"** button — this is where you will build your site.

---

## Step 2: Upgrading to Carrd Pro Standard

The free Carrd plan does not support custom domains, forms, or Stripe integration. You need to upgrade to **Carrd Pro Standard** ($19/year) to unlock these features.

1. From your Carrd dashboard, look at the **top right corner** of the screen. You will see a small icon showing your account initial or a person silhouette. Click it.
2. A dropdown menu will appear. Click **"Upgrade to Pro"**.
3. You will be taken to the Carrd Pro pricing page. You will see three plan options:
   - **Pro Lite** — $9/year (does not include custom domains or forms — do not choose this).
   - **Pro Standard** — $19/year (includes custom domains, forms, Stripe, and Google Analytics — **choose this one**).
   - **Pro Plus** — $49/year (includes everything in Standard plus advanced features).
4. Click the **"Select Plan"** button underneath the **Pro Standard** column.
5. A payment form will appear. Enter your credit card details:
   - Card number
   - Expiry date
   - CVC (the 3-digit code on the back of your card)
   - Billing name and address
6. Click the **"Pay $19.00"** button to complete the purchase.
7. You will see a confirmation message. Your account is now upgraded to Pro Standard.

> **Note:** Carrd Pro Standard is billed annually. You will be charged $19 once per year. You can cancel at any time from your account settings.

---

## Step 3: Choosing a Template

A template is a pre-designed starting point for your website. You will customise it with RiteDoc's content in the next step.

1. From your Carrd dashboard, click the large **"+"** button to start a new site.
2. A template gallery will open. At the top of the gallery, you will see category filters. Click **"Landing"** to show only landing page templates.
3. Browse the templates. You are looking for a design that is:
   - Clean and professional (not cluttered or overly decorative).
   - Has a large headline area at the top (for the hero section).
   - Has a section for features or benefits.
   - Has a section for pricing or a call-to-action.
   - Has a form or contact section at the bottom.
4. **Recommended template:** Look for templates named something like **"Attractor"**, **"Promote"**, or any template with a dark or neutral colour scheme and a clear layout. These suit a professional SaaS product like RiteDoc.
5. When you find a template you like, hover your mouse over it. A **"Select"** button will appear. Click **"Select"**.
6. The template will open in the Carrd site builder. You are now ready to customise it.

> **Tip:** If you are unsure which template to choose, select the one labelled **"Attractor"** or **"Profile"** — both work well for SaaS landing pages and are easy to customise.

---

## Step 4: Building the Landing Page

The Carrd builder works by clicking on any element on the page to edit it. A panel on the left side of the screen will show you the settings for whatever you have clicked. You can also click the **"+"** button at the top of the screen to add new elements.

### Section 1: Hero

The hero section is the very first thing visitors see when they land on your page. It must immediately communicate what RiteDoc is and who it is for.

**Editing the Headline:**
1. Click on the large headline text in the template (it will likely say something generic like "Your Product Name").
2. In the left panel, find the **"Text"** field and delete the existing text.
3. Type: `RiteDoc`
4. Below the headline, find the subtitle or tagline field. Delete the existing text and type: `Notes Done Right.`

**Editing the Description:**
1. Click on the paragraph text below the tagline.
2. Delete the existing text and type the following:

> *The audit-prepared documentation solution for NDIS support workers and providers. Streamline your workflow with technology-assisted note-taking that keeps you focused on what matters most — your clients.*

**Editing the Call-to-Action Button:**
1. Click on the button in the hero section (it may say "Get Started" or "Learn More").
2. In the left panel, find the **"Label"** or **"Text"** field and change it to: `Join the Waitlist`
3. Find the **"URL"** or **"Link"** field. Type: `#signup`
   - This is a special link that will scroll the visitor down to the signup form when they click the button.
4. Click **"Done"** or press **Enter** to save.

---

### Section 2: What RiteDoc Does

This section explains how RiteDoc works. It should be brief, clear, and free of jargon.

**Editing the Section Heading:**
1. Click on the section heading (it may say "Features" or "How It Works").
2. Change the text to: `How RiteDoc Works`

**Editing the Three Feature Points:**

If the template has three columns or three icon-and-text blocks, click each one and replace the text as follows.

**Block 1 — Heading:** `Effortless Documentation`
**Block 1 — Description:**
> *Capture client notes quickly and accurately using our technology-assisted platform. Spend less time writing and more time supporting your clients.*

**Block 2 — Heading:** `Audit-Prepared Records`
**Block 2 — Description:**
> *Know at a glance whether your notes are ready for review. Our simple RED, ORANGE, and GREEN traffic light indicator shows you exactly where each note stands — no guesswork, no surprises.*

**Block 3 — Heading:** `Secure & Professional`
**Block 3 — Description:**
> *Maintain clean, professional records without the hassle of manual formatting. RiteDoc keeps your documentation consistent and organised.*

> **CRITICAL BRAND RULE:** Never use the word "AI" anywhere on this page. Never use the word "compliant" — always use "audit-prepared" instead. If you need to describe the technology, use "technology-assisted" only.

---

### Section 3: Who It's For

This section tells visitors that RiteDoc is built specifically for them.

**Editing the Section Heading:**
1. Click on the section heading.
2. Change the text to: `Built for NDIS Professionals`

**Editing the Description:**
1. Click on the paragraph text in this section.
2. Replace the text with:

> *RiteDoc is designed specifically for NDIS support workers and providers who need reliable, audit-prepared documentation without the administrative burden. Whether you are an individual support worker or managing a team of providers, RiteDoc fits your workflow.*

---

### Section 4: Pricing

This section shows the two pricing plans. If your template does not have a pricing section, you will need to add one.

**Adding a Pricing Section (if not already in the template):**
1. Click the **"+"** button at the top of the builder.
2. Click **"Columns"** to add a two-column layout.
3. Drag it to the position where you want the pricing section to appear (below the "Who It's For" section).

**Editing the Section Heading:**
1. Click on the section heading.
2. Change the text to: `Simple, Transparent Pricing`

**Editing the Left Pricing Card (Founders Plan):**
1. Click on the left pricing card.
2. Set the plan name to: `Founders Plan`
3. Set the price to: `$97 / month`
4. Below the price, add a note: `Limited to the first 17 members`
5. List the features:
   - `Full access to RiteDoc`
   - `Priority support`
   - `Early access to new features`
6. Change the button text to: `Get Founders Plan`
   - Leave the button URL blank for now — you will connect Stripe in Step 6.

**Editing the Right Pricing Card (Standard Plan):**
1. Click on the right pricing card.
2. Set the plan name to: `Standard Plan`
3. Set the price to: `$197 / month`
4. Below the price, add a note: `For growing NDIS providers`
5. List the features:
   - `Full access to RiteDoc`
   - `Standard support`
   - `Unlimited notes`
6. Change the button text to: `Get Standard Plan`
   - Leave the button URL blank for now — you will connect Stripe in Step 6.

---

### Section 5: Waitlist / Signup Form

This form collects information from people who want to join the waitlist. It must have five fields: Name, Email, Company Name, and a Platform dropdown.

**Adding the Form Element:**
1. If the template already has a form, click on it to edit it. If not, click the **"+"** button at the top of the builder, then click **"Form"**, and drag it below the pricing section.

**Configuring the Form Type:**
1. Click on the form element to open its settings in the left panel.
2. Find the **"Type"** dropdown and set it to **"Custom"**.
3. A second dropdown will appear. Set it to **"Send Email"**.

**Adding Form Fields:**

Click the **"Fields"** tab in the left panel. You will see a default field called "Untitled". Click on it to expand it.

**Field 1 — Name:**
1. Click the first field to expand it.
2. Set **"Label"** to: `Name`
3. Set **"Type"** to: `Text`
4. Make sure **"Required"** is ticked.

**Field 2 — Email:**
1. Click **"Add"** to add a second field.
2. Set **"Label"** to: `Email`
3. Set **"Type"** to: `Email`
4. Make sure **"Required"** is ticked.

**Field 3 — Company Name:**
1. Click **"Add"** to add a third field.
2. Set **"Label"** to: `Company Name`
3. Set **"Type"** to: `Text`
4. Make sure **"Required"** is ticked.

**Field 4 — Platform:**
1. Click **"Add"** to add a fourth field.
2. Set **"Label"** to: `Platform`
3. Set **"Type"** to: `Select`
4. In the **"Options"** area that appears, add each of the following options one by one (click **"Add Option"** for each):
   - `ShiftCare`
   - `Brevity`
   - `Lumary`
   - `Astalty`
   - `SupportAbility`
   - `Other`
5. Make sure **"Required"** is ticked.

**Configuring the Submit Button:**
1. Click the **"Button"** tab in the left panel.
2. Change the **"Label"** to: `Submit`

**Adding a Section Heading Above the Form:**
1. Click the **"+"** button and add a **"Text"** element above the form.
2. Set the heading to: `Join the Waitlist`
3. Add a subtitle: `Be among the first to access RiteDoc. Secure your Founders Plan pricing before it closes.`

---

### Section 6: Footer

The footer appears at the very bottom of the page.

1. Click on the footer area of the template.
2. Delete any existing footer text.
3. Type: `© RiteDoc. A ReadyCompliant company. All rights reserved.`
4. Optionally, add a link to `hello@readycompliant.com` as a contact email.

---

## Step 5: Connecting the Custom Domain via Cloudflare

You will now connect the domain `ritedoc.com.au` to your Carrd site. This domain is managed through Cloudflare. You will need to be logged in to both Carrd and Cloudflare at the same time, so open Cloudflare in a separate browser tab.

### Part A — In Carrd (Publish Settings)

1. In the Carrd builder, click the **floppy disk icon** (Save) in the top right corner of the screen.
2. A "Publish" panel will open on the left side. Fill in the following:
   - **Title:** `RiteDoc`
   - **Description:** `Notes Done Right. The audit-prepared documentation solution for NDIS professionals.`
3. Find the **"Action"** dropdown and change it from "Publish to a .carrd.co URL" to **"Publish to a custom domain"**.
4. A text field will appear. Type your domain exactly: `ritedoc.com.au`
5. Scroll down slightly in the panel. Carrd will display the DNS records you need to add. You will see:
   - An **A record** with a target IP address (e.g., `19.31.15.43` — use whatever Carrd shows you, as this may differ).
   - A **CNAME record** with the value `www` pointing to `ritedoc.com.au`.
6. **Write down or screenshot these values before proceeding.** You will need them in Cloudflare.
7. Do **not** click "Publish Changes" yet — do that after completing the Cloudflare steps below.

### Part B — In Cloudflare (DNS Records)

1. Open a **new browser tab** and go to **[https://dash.cloudflare.com](https://dash.cloudflare.com)**.
2. Log in to your Cloudflare account.
3. On the Cloudflare dashboard, you will see a list of domains. Click on **`ritedoc.com.au`**.
4. In the left sidebar, click **"DNS"**, then click **"Records"**.
5. You will see a table of existing DNS records. You need to add two new records.

**Adding the A Record:**
1. Click the **"Add record"** button.
2. Fill in the fields:
   - **Type:** Select `A` from the dropdown.
   - **Name:** Type `@` (this represents the root domain, i.e., `ritedoc.com.au` itself).
   - **IPv4 address:** Type the IP address shown in your Carrd panel (e.g., `19.31.15.43`).
   - **TTL:** Leave as `Auto`.
   - **Proxy status:** This is the orange cloud icon. Click it to turn it **grey** (it should say "DNS only"). This step is critical — if the cloud is orange (proxied), Carrd cannot verify your domain.
3. Click **"Save"**.

**Adding the CNAME Record:**
1. Click **"Add record"** again.
2. Fill in the fields:
   - **Type:** Select `CNAME` from the dropdown.
   - **Name:** Type `www`
   - **Target:** Type `ritedoc.com.au`
   - **TTL:** Leave as `Auto`.
   - **Proxy status:** Click the orange cloud icon to turn it **grey** (DNS only).
3. Click **"Save"**.

Your Cloudflare DNS records table should now show both the A record and the CNAME record, both with grey cloud icons (DNS only).

### Part C — Back in Carrd (Publish)

1. Switch back to your Carrd browser tab.
2. Click the **"Publish Changes"** button.
3. Carrd will begin verifying your domain. You will see a status message that says **(initializing)** next to your domain name.
4. Wait up to **one hour** for the domain to fully initialize and the SSL certificate to be issued. In most cases, this takes only a few minutes.
5. Once complete, you can visit **[https://ritedoc.com.au](https://ritedoc.com.au)** in your browser to see your live site.

> **Troubleshooting:** If the domain still shows "(initializing)" after one hour, double-check that both DNS records in Cloudflare have the proxy status set to **grey (DNS only)**, not orange (proxied). If you see orange clouds, click each record, toggle the proxy to off, and save.

---

## Step 6: Connecting Stripe Payment Buttons

Stripe is the payment platform that processes credit card payments for the Founders Plan and Standard Plan. You will need a Stripe account to complete this step.

### Part A — In Stripe (Create Products and Get Price IDs)

1. Open a new browser tab and go to **[https://stripe.com](https://stripe.com)**. Log in to your Stripe account (or create one if you do not have one yet).
2. In the left sidebar, click **"Product Catalog"**.
3. Click the **"+ Add product"** button.
4. **Create the Founders Plan product:**
   - **Name:** `RiteDoc Founders Plan`
   - **Description:** `Limited to the first 17 members. Full access to RiteDoc with priority support.`
   - Under **"Pricing"**, click **"Add a price"**.
   - Set **"Pricing model"** to `Standard pricing`.
   - Set **"Price"** to `97`.
   - Set **"Currency"** to `AUD`.
   - Set **"Billing period"** to `Monthly`.
   - Click **"Add price"**.
   - Click **"Save product"**.
5. After saving, you will see the product page. Look for the **Price ID** — it is a code that starts with `price_` followed by letters and numbers (e.g., `price_1Nxxxxxxxxxxxxx`). **Copy this Price ID and save it** (paste it into a text document for safe keeping).
6. Click **"+ Add product"** again to create the Standard Plan product:
   - **Name:** `RiteDoc Standard Plan`
   - **Description:** `Full access to RiteDoc with standard support and unlimited notes.`
   - Under **"Pricing"**, click **"Add a price"**.
   - Set **"Price"** to `197`, **"Currency"** to `AUD`, **"Billing period"** to `Monthly`.
   - Click **"Add price"** then **"Save product"**.
7. Copy the **Price ID** for the Standard Plan as well.

**Getting your Stripe API Keys:**
1. In the Stripe left sidebar, click **"Developers"**, then click **"API keys"**.
2. You will see two keys:
   - **Publishable key** — starts with `pk_live_` (or `pk_test_` if in test mode).
   - **Secret key** — starts with `sk_live_` (click "Reveal live key" to see it).
3. Copy both keys and save them in a secure text document.

> **Important:** Never share your Secret Key with anyone. Keep it private.

### Part B — In Carrd (Add Stripe Widgets)

1. Switch back to your Carrd builder.
2. Go to the Pricing section of your page.
3. **For the Founders Plan button:**
   - Click on the "Get Founders Plan" button you created earlier and **delete it**.
   - Click the **"+"** button at the top of the builder.
   - Click **"Widget"** to add a new widget element.
   - Drag the widget to the position where the Founders Plan button was.
   - Click on the widget to open its settings in the left panel.
   - Set **"Type"** to **"Stripe Checkout"**.
   - Under **"Product"**, set **"Type"** to **"Via Preconfigured Price"**.
   - In the **"Price ID"** field, paste the Price ID for the $97 Founders Plan (e.g., `price_1Nxxxxxxxxxxxxx`).
   - Change the **"Button Label"** to: `Get Founders Plan`
   - Scroll down in the left panel to find the **"API Keys"** section.
   - Paste your Stripe **Publishable Key** into the **"Publishable Key"** field.
   - Paste your Stripe **Secret Key** into the **"Secret Key"** field.
   - Click **"Done"** or close the panel.

4. **For the Standard Plan button:**
   - Repeat the same process for the Standard Plan.
   - Delete the "Get Standard Plan" button.
   - Add a new **Widget** element, set it to **"Stripe Checkout"**.
   - Paste the Price ID for the $197 Standard Plan.
   - Set the **"Button Label"** to: `Get Standard Plan`
   - Use the same Stripe API Keys (Publishable and Secret).
   - Click **"Done"**.

5. Click the **Save** icon and then **"Publish Changes"** to make the buttons live.

> **Testing:** Before going live, test the payment flow using Stripe's test mode. In Stripe, switch to **"Test mode"** (toggle in the top right of the Stripe dashboard), create test products with test Price IDs, and use the test card number `4242 4242 4242 4242` to verify the checkout works correctly.

---

## Step 7: Setting Up Form Email Submissions

This step ensures that every time someone fills out the waitlist form, an email is sent to `hello@readycompliant.com`.

1. In the Carrd builder, click on the **Waitlist / Signup Form** element to open its settings in the left panel.
2. Confirm that the **"Type"** is set to **"Custom"** and the sub-type is **"Send Email"**.
3. Look for the **"Recipient Email"** field. This is where you tell Carrd where to send the form submissions.
4. Delete any existing email address in this field and type: `hello@readycompliant.com`
5. In the **"Subject Template"** field (optional but recommended), type: `New RiteDoc Waitlist Submission`
6. In the **"Body Template"** field (optional but recommended), type:

```
New waitlist submission received:

Name: {name}
Email: {email}
Company Name: {company_name}
Platform: {platform}
```

   Replace `{name}`, `{email}`, `{company_name}`, and `{platform}` with the actual field IDs Carrd assigns to each field. You can find these IDs by clicking on each field in the Fields tab — the ID is shown at the bottom of each field's settings.

7. Click the **"Save"** icon and then **"Publish Changes"**.

> **Important note about email delivery:** Emails sent by Carrd forms will come from the domain `@mail.carrd.site`. If you do not receive test submissions at `hello@readycompliant.com`, check your spam/junk folder. You may need to add `mail.carrd.site` to your email provider's allowlist to ensure reliable delivery.

---

## Final Checklist

Use this checklist to confirm everything is set up correctly before sharing the link.

| Task | Status |
|---|---|
| Carrd account created with `marita@readycompliant.com` | ☐ |
| Upgraded to Carrd Pro Standard ($19/year) | ☐ |
| Template selected and opened in builder | ☐ |
| Hero section: "RiteDoc" headline and "Notes Done Right." tagline | ☐ |
| Hero CTA button links to `#signup` | ☐ |
| "How RiteDoc Works" section — no mention of "AI" | ☐ |
| "Built for NDIS Professionals" section added | ☐ |
| Pricing section: Founders Plan $97/mo and Standard Plan $197/mo | ☐ |
| Waitlist form has Name, Email, Company Name, and Platform fields | ☐ |
| Platform dropdown includes all 6 options | ☐ |
| Footer shows "© RiteDoc. A ReadyCompliant company." | ☐ |
| A record added in Cloudflare (proxy OFF) | ☐ |
| CNAME record added in Cloudflare (proxy OFF) | ☐ |
| Domain `ritedoc.com.au` initialised in Carrd | ☐ |
| Stripe Founders Plan widget added ($97/mo Price ID) | ☐ |
| Stripe Standard Plan widget added ($197/mo Price ID) | ☐ |
| Form recipient email set to `hello@readycompliant.com` | ☐ |
| Test form submission received at `hello@readycompliant.com` | ☐ |
| Site published and accessible at `https://ritedoc.com.au` | ☐ |

---

## Suggested Copy Reference

The following is the complete, brand-compliant copy for each section of the landing page. Copy and paste each block directly into the Carrd builder.

---

### Hero Section

**Headline:** `RiteDoc`

**Tagline:** `Notes Done Right.`

**Description:**
> The audit-prepared documentation solution for NDIS support workers and providers. Streamline your workflow with technology-assisted note-taking that keeps you focused on what matters most — your clients.

**Button:** `Join the Waitlist`

---

### How RiteDoc Works

**Section Heading:** `How RiteDoc Works`

**Block 1 — Effortless Documentation**
> Capture client notes quickly and accurately using our technology-assisted platform. Spend less time writing and more time supporting your clients.

**Block 2 — Audit-Prepared Records**
> Know at a glance whether your notes are ready for review. Our simple RED, ORANGE, and GREEN traffic light indicator shows you exactly where each note stands — no guesswork, no surprises.

**Block 3 — Secure & Professional**
> Maintain clean, professional records without the hassle of manual formatting. RiteDoc keeps your documentation consistent and organised.

---

### Who It's For

**Section Heading:** `Built for NDIS Professionals`

**Description:**
> RiteDoc is designed specifically for NDIS support workers and providers who need reliable, audit-prepared documentation without the administrative burden. Whether you are an individual support worker or managing a team of providers, RiteDoc fits your workflow.

---

### Pricing

**Section Heading:** `Simple, Transparent Pricing`

**Founders Plan Card:**
> **Founders Plan**
> $97 / month
> *Limited to the first 17 members*
> - Full access to RiteDoc
> - Priority support
> - Early access to new features
>
> [Get Founders Plan]

**Standard Plan Card:**
> **Standard Plan**
> $197 / month
> *For growing NDIS providers*
> - Full access to RiteDoc
> - Standard support
> - Unlimited notes
>
> [Get Standard Plan]

---

### Waitlist / Signup Form

**Section Heading:** `Join the Waitlist`

**Subtitle:**
> Be among the first to access RiteDoc. Secure your Founders Plan pricing before it closes.

**Form Fields:**
- Name *(required)*
- Email *(required)*
- Company Name *(required)*
- Platform *(required, dropdown)*: ShiftCare / Brevity / Lumary / Astalty / SupportAbility / Other

**Submit Button:** `Submit`

---

### Footer

> © RiteDoc. A ReadyCompliant company. All rights reserved.

---

## Brand Rules Summary

The following rules must be observed at all times when editing or updating the RiteDoc landing page.

| Rule | Correct Usage | Incorrect Usage |
|---|---|---|
| Product name | RiteDoc | Rite Doc, ritedoc, RITEDOC |
| Brand tagline | Notes Done Right. | Notes Done Right (no full stop) |
| Parent company | ReadyCompliant | Ready Compliant, readycompliant |
| Technology description | "technology-assisted" | "AI", "artificial intelligence", "machine learning" |
| Documentation quality | "audit-prepared" | "compliant", "compliance-ready" |
| Quality indicators | RED / ORANGE / GREEN (traffic light) | Numerical scores (e.g., 87/100) |
| Design tone | Clean, professional, welcoming | Sterile, cold, overly corporate |

---

*Guide prepared for ReadyCompliant / RiteDoc. All Carrd platform details are accurate as of March 2026.*
