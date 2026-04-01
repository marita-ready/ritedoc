import json
import urllib.request

API_KEY = "YOUR_BREVO_API_KEY_HERE"

payload = {
    "sender": {"name": "Manu (your AI)", "email": "hello@readycompliant.com"},
    "to": [{"email": "hello@readycompliant.com", "name": "Marita"}],
    "subject": "COPY THIS - Welcome email content for Brevo template",
    "htmlContent": """<html><body style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#333;padding:20px;">
<p style="color:red;font-weight:bold;">INSTRUCTIONS: Select ALL the text below the line and paste it into the Brevo text block. Do NOT copy this red instruction text.</p>
<hr>
<p>Hi {{ contact.FIRSTNAME }},</p>

<p>You are officially on the waitlist for RiteDoc! Thank you for joining us.</p>

<p>We know how exhausting it can be to spend hours writing and reviewing notes after a long day of supporting clients. That is exactly why we built RiteDoc — to help NDIS providers get their notes done right, without the endless admin.</p>

<p>Right now, we are putting the finishing touches on the app. Because you are on the waitlist, you have locked in our special Founders pricing. You don't need to pay anything today.</p>

<p>When we launch, you will be the first to know and have the opportunity to secure one of our limited Founders spots.</p>

<p><strong style="font-size:18px;color:#1a7a8a;">What happens next?</strong></p>

<p><strong>Today:</strong> You secured your spot on the waitlist and locked in Founders pricing.</p>

<p><strong>In 3 days:</strong> I will send you a real before-and-after example showing exactly how RiteDoc transforms a messy, rushed note into a perfect, audit-prepared draft. Keep an eye on your inbox!</p>

<p>Warmly,</p>

<p><strong>Marita</strong><br>RiteDoc by ReadyCompliant</p>
</body></html>"""
}

data = json.dumps(payload).encode('utf-8')

req = urllib.request.Request(
    "https://api.brevo.com/v3/smtp/email",
    data=data,
    method='POST',
    headers={
        'api-key': API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
    }
)

try:
    resp = urllib.request.urlopen(req)
    print(f"Email sent! Status: {resp.status}")
    print(resp.read().decode())
except urllib.error.HTTPError as e:
    print(f"Error: {e.code}")
    print(e.read().decode())
