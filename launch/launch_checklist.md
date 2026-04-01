# RiteDoc Pre-Launch Checklist

This comprehensive checklist outlines the exact sequence of steps required to get the RiteDoc landing page live, integrated with email automation, and ready to accept payments for the Founders launch. The steps are ordered by dependency to ensure a smooth setup process.

## Phase 1: Domain & Infrastructure Setup
1. **Register Domain:** Ensure `ritedoc.com.au` is registered and accessible.
2. **Set Up Cloudflare:** Create a Cloudflare account and add `ritedoc.com.au` as a site.
3. **Update Nameservers:** Update the domain registrar's nameservers to point to Cloudflare.
4. **Configure DNS Records:** Add the necessary A/CNAME records in Cloudflare to point to your landing page hosting provider.
5. **Enable SSL/TLS:** Ensure Cloudflare's SSL/TLS encryption mode is set to "Full (strict)" for secure connections.

## Phase 2: Payment Processing Setup (Stripe)
6. **Create/Verify Stripe Account:** Ensure your Stripe account is fully verified and ready to process live payments.
7. **Create Product:** In Stripe, create a new product named "RiteDoc Founders Spot".
8. **Set Pricing:** Configure the pricing for the product as a $97.00 one-time deposit (which covers the first month).
9. **Create Payment Link:** Generate a Stripe Payment Link for the Founders Spot product.
10. **Configure Success URL:** Set the post-payment redirect URL in the Stripe Payment Link settings to point to a "Thank You" or "Success" page on your domain.
11. **Save Payment Link:** Copy the generated Stripe Payment Link URL for use in the landing page and email sequence.

## Phase 3: Email Automation Setup (Brevo)
12. **Sign Up for Brevo:** Create and verify your Brevo (formerly Sendinblue) account.
13. **Authenticate Domain:** Authenticate `readycompliant.com` in Brevo to ensure high email deliverability (requires adding TXT/DKIM records to your DNS).
14. **Create Contact Lists:** Create two separate lists in Brevo: "RiteDoc Waitlist" and "RiteDoc Founders (Paid)".
15. **Build Signup Form:** Create an embeddable signup form in Brevo for the waitlist.
16. **Load Email Templates:** Copy and paste the 8-email sequence into Brevo's email template builder. Ensure all placeholders (e.g., `{{first_name}}`, `{{video_link}}`, `{{payment_link}}`) are correctly mapped.
17. **Set Up Waitlist Workflow:** Create an automation workflow triggered by a user joining the "RiteDoc Waitlist" list:
    - Send Email 1 (Waitlist Confirmation) immediately.
    - Wait 3 days.
    - Send Email 2 (Value Email).
18. **Set Up Launch Day Workflow:** Create a scheduled campaign or manual broadcast for Launch Day to send Email 3 (Launch Day) to the Waitlist list.
19. **Set Up Post-Payment Workflow:** Create an automation workflow triggered by a user being added to the "RiteDoc Founders (Paid)" list:
    - Send Email 5 (Welcome + Onboarding) immediately.
    - Wait 2 days.
    - Send Email 6 (First Batch Follow-up).
    - Wait 5 days.
    - Send Email 7 (Week 1 Check-in).
    - Wait 21 days.
    - Send Email 8 (Month 1 Check-in).

## Phase 4: Landing Page Finalization
20. **Embed Explainer Video:** Upload the animated explainer video to a hosting platform (e.g., Vimeo, Wistia, or directly on the site) and embed it on the landing page.
21. **Integrate Brevo Form:** Embed the Brevo waitlist signup form onto the landing page.
22. **Plug in Stripe Link:** Update all "Claim Founders Spot" or "Pay $97 Deposit" CTA buttons on the landing page to point to the Stripe Payment Link.
23. **Mobile Optimization:** Review the landing page on mobile devices to ensure responsive design, readable text, and accessible buttons.
24. **SEO & Meta Tags:** Add appropriate title tags, meta descriptions, and Open Graph images for social sharing.

## Phase 5: End-to-End Testing
25. **Test Waitlist Signup:** Enter a test email into the landing page form. Verify that the contact is added to the Brevo "RiteDoc Waitlist" list.
26. **Test Email 1 Delivery:** Confirm that Email 1 (Waitlist Confirmation) arrives in the test inbox immediately and that all links (especially the video link) work.
27. **Test Payment Flow (Test Mode):** Enable Test Mode in Stripe, use a test credit card to complete a $97 transaction via the Payment Link, and verify the redirect to the Success page.
28. **Test Post-Payment Automation:** Manually add the test email to the "RiteDoc Founders (Paid)" list in Brevo and verify that Email 5 (Welcome + Onboarding) is delivered immediately.

## Phase 6: Go Live
29. **Switch Stripe to Live Mode:** Ensure Stripe is out of Test Mode and ready for real transactions.
30. **Activate Brevo Workflows:** Turn on all automated workflows in Brevo.
31. **Publish Landing Page:** Push the final version of the landing page live.
32. **Final Live Test:** Perform one final live signup (using a real email) to ensure the production environment is functioning perfectly.
33. **Launch Announcement:** Send Email 3 (Launch Day) to the waitlist and announce the launch on your marketing channels.

## Phase 7: Post-Launch Monitoring
34. **Monitor Stripe:** Keep an eye on the Stripe dashboard for successful payments and any failed transactions.
35. **Monitor Brevo:** Check Brevo analytics for email open rates, click-through rates, and any bounce/spam issues.
36. **Customer Support:** Ensure the `support@readycompliant.com` inbox is actively monitored for any user questions or onboarding issues.
