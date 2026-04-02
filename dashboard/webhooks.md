# RiteDoc / ReadyCompliant — Webhook Automation Specification

This document defines the automated webhook flows that connect Stripe, Sentry, and Brevo to the ReadyCompliant Supabase backend. Each flow triggers a chain of actions that are fully logged in the `automation_log` table for audit traceability.

---

## Architecture Overview

All webhook handlers receive events via HTTPS POST, validate the payload signature, perform the required database operations via the Supabase REST API (using the `service_role` key), and log every action to `automation_log`.

The webhook handler can be implemented as:
- A Supabase Edge Function (Deno/TypeScript)
- A standalone serverless function (AWS Lambda, Cloudflare Worker, Vercel)
- A Zapier/Make automation (no-code option)

---

## Flow 1: Stripe `payment_intent.succeeded`

**Trigger:** Stripe fires `payment_intent.succeeded` when a customer completes payment for a RiteDoc subscription.

**Steps:**

1. **Receive webhook** at `POST /webhooks/stripe`
2. **Verify Stripe signature** using `stripe.webhooks.constructEvent(body, sig, secret)`
3. **Extract customer details** from the payment intent metadata:
   - `customer_email`
   - `customer_name`
   - `subscription_type` (founders / standard / biab)
   - `agency_id` (optional, for BIAB purchases)
4. **Create or update client record:**
   ```
   POST /rest/v1/clients
   {
     "name": "<customer_name>",
     "email": "<customer_email>",
     "subscription_type": "<type>",
     "subscription_status": "active",
     "stripe_customer_id": "<stripe_customer_id>",
     "start_date": "<now>"
   }
   ```
5. **Generate activation key:**
   ```
   POST /rest/v1/activation_keys
   {
     "key_code": "<generated_key>",
     "subscription_type": "<type>",
     "agency_id": "<agency_id_or_null>",
     "is_active": true
   }
   ```
6. **Send welcome email via Brevo API:**
   ```
   POST https://api.brevo.com/v3/smtp/email
   {
     "sender": { "name": "ReadyCompliant", "email": "hello@readycompliant.com" },
     "to": [{ "email": "<customer_email>", "name": "<customer_name>" }],
     "subject": "Welcome to RiteDoc — Your Activation Key",
     "htmlContent": "<html>...Your activation key is: <strong><key_code></strong>...</html>"
   }
   ```
7. **Log to automation_log:**
   ```
   POST /rest/v1/automation_log
   {
     "action": "stripe_payment_succeeded",
     "details_json": {
       "stripe_payment_intent_id": "<pi_xxx>",
       "customer_email": "<email>",
       "key_code": "<generated_key>",
       "subscription_type": "<type>",
       "brevo_email_sent": true
     },
     "performed_by": "stripe_webhook"
   }
   ```

**Error handling:** If key generation or email sending fails, log the error in `automation_log` with `action: "stripe_payment_error"` and create a support ticket with `category: "activation"`.

---

## Flow 2: Stripe `customer.subscription.deleted`

**Trigger:** Stripe fires `customer.subscription.deleted` when a customer cancels their subscription or it expires.

**Steps:**

1. **Receive webhook** at `POST /webhooks/stripe`
2. **Verify Stripe signature**
3. **Extract `stripe_customer_id`** from the subscription object
4. **Update client record:**
   ```
   PATCH /rest/v1/clients?stripe_customer_id=eq.<stripe_customer_id>
   {
     "subscription_status": "cancelled",
     "cancellation_date": "<now>"
   }
   ```
5. **Deactivate associated activation key(s):**
   - First, look up the client to get their email
   - Then find keys associated with this client (via a join or separate query)
   - For each active key:
   ```
   PATCH /rest/v1/activation_keys?id=eq.<key_id>
   {
     "is_active": false,
     "deactivated_at": "<now>"
   }
   ```
   - Log each deactivation to `key_audit_log`:
   ```
   POST /rest/v1/key_audit_log
   {
     "key_id": "<key_id>",
     "action": "deactivated",
     "reason": "Stripe subscription cancelled"
   }
   ```
6. **Log to automation_log:**
   ```
   POST /rest/v1/automation_log
   {
     "action": "stripe_subscription_cancelled",
     "details_json": {
       "stripe_customer_id": "<cus_xxx>",
       "client_email": "<email>",
       "keys_deactivated": ["<key_code_1>", "<key_code_2>"]
     },
     "performed_by": "stripe_webhook"
   }
   ```

**Note:** The RiteDoc desktop app checks the local activation cache on every launch. Deactivating the key in Supabase does not immediately lock the user out (the app is offline-first). However, if the user ever needs to re-activate (e.g., new device, reinstall), the deactivated key will be rejected.

---

## Flow 3: Sentry Error Alert

**Trigger:** Sentry fires a webhook when a new error or issue is detected in the RiteDoc application (or the admin dashboard).

**Steps:**

1. **Receive webhook** at `POST /webhooks/sentry`
2. **Verify Sentry signature** using the client secret
3. **Extract error details:**
   - `title` — error message
   - `culprit` — file/function where the error occurred
   - `level` — error severity (error, warning, fatal)
   - `url` — link to the Sentry issue
4. **Auto-categorise the ticket:**
   - If `culprit` contains `activation` or `key` -> category: `activation`
   - If `culprit` contains `stripe` or `billing` or `payment` -> category: `billing`
   - Otherwise -> category: `technical`
5. **Create support ticket:**
   ```
   POST /rest/v1/support_tickets
   {
     "category": "<auto_category>",
     "description": "Sentry alert: <title>\n\nCulprit: <culprit>\nLevel: <level>\nURL: <sentry_url>",
     "status": "open"
   }
   ```
6. **Log to automation_log:**
   ```
   POST /rest/v1/automation_log
   {
     "action": "sentry_error_alert",
     "details_json": {
       "sentry_issue_id": "<issue_id>",
       "title": "<title>",
       "level": "<level>",
       "category_assigned": "<auto_category>",
       "ticket_created": true
     },
     "performed_by": "sentry_webhook"
   }
   ```

---

## Automation Log Schema

Every automated action writes to the `automation_log` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auto-generated primary key |
| `action` | TEXT | Action identifier (e.g., `stripe_payment_succeeded`, `sentry_error_alert`) |
| `details_json` | JSONB | Structured payload with all relevant details |
| `performed_by` | TEXT | Who/what performed the action (e.g., `stripe_webhook`, `sentry_webhook`, `manus`, `admin`) |
| `performed_at` | TIMESTAMPTZ | Timestamp (defaults to `now()`) |

---

## Action Identifiers

| Action | Trigger | Description |
|--------|---------|-------------|
| `stripe_payment_succeeded` | Stripe webhook | New payment processed, key generated, email sent |
| `stripe_payment_error` | Stripe webhook | Payment processed but downstream action failed |
| `stripe_subscription_cancelled` | Stripe webhook | Subscription cancelled, client and keys updated |
| `sentry_error_alert` | Sentry webhook | Error detected, support ticket auto-created |
| `key_generated` | Dashboard / API | Activation key manually or programmatically generated |
| `key_deactivated` | Dashboard / API | Activation key deactivated |
| `client_created` | Dashboard / API | New client record created |
| `client_updated` | Dashboard / API | Client record updated |
| `cartridge_uploaded` | Dashboard | New cartridge version uploaded |
| `subscribers_notified` | Dashboard | Update notification sent via Brevo |

---

## Security Considerations

1. **Webhook signature verification** is mandatory for all incoming webhooks. Never trust unverified payloads.
2. **Use the `service_role` key** for all Supabase API calls from webhook handlers. The anon key has restricted permissions.
3. **Never expose the `service_role` key** in client-side code, logs, or error messages.
4. **Rate limit** webhook endpoints to prevent abuse.
5. **Idempotency:** Stripe sends webhooks with an `idempotency_key`. Store processed event IDs to prevent duplicate processing.

---

## Implementation Notes

For a Supabase Edge Function implementation:

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      // ... implement Flow 1
      break;
    case "customer.subscription.deleted":
      // ... implement Flow 2
      break;
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

For the Sentry webhook, use a similar Edge Function pattern with Sentry's webhook signature verification.
