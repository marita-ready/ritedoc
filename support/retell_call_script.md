# RiteDoc Retell AI Phone Support Script

This document outlines the conversational flow and scripting for the Retell AI agent handling 24/7 phone support for RiteDoc. The agent is designed to be empathetic, efficient, and capable of autonomous troubleshooting based on the central matrix.

## 1. Greeting and Ticket Creation

**Agent:** "Hi there, you've reached ReadyCompliant support for RiteDoc. I'm your automated assistant. To help me find your account, could you please tell me the phone number registered to your licence, or your licence key?"

*(Wait for user response)*

**If number/key found:**
**Agent:** "Thanks. I've located your account. I see you're calling from [Business Name]. I'm opening a support ticket for this call right now. How can I help you with RiteDoc today?"

**If number/key NOT found:**
**Agent:** "I couldn't find an account matching that information, but that's okay. I've started a new support ticket. Could you briefly describe the issue you're experiencing with RiteDoc?"

## 2. Diagnostic Questions

*(The agent listens to the user's description and attempts to match it to a category in the Troubleshooting Matrix.)*

**Agent:** "I understand. It sounds like you might be having an issue with [Category, e.g., importing your CSV file]. To make sure I give you the right advice, could you tell me what CRM you are exporting your notes from?"

*(Wait for user response)*

**Agent:** "Okay, you're using [CRM Name]. And when you try to import the file into RiteDoc, are you seeing a specific error message on the screen?"

*(Wait for user response)*

## 3. Step-by-Step Troubleshooting (Example: CSV Import Error)

*(The agent pulls the relevant solution from the Troubleshooting Matrix.)*

**Agent:** "Thanks for that information. Based on what you've told me, it sounds like the CSV file might be missing some required columns. For [CRM Name], you need to make sure you are exporting the [Specific Report Name, e.g., Events Report Details] and that it includes the actual text of the progress notes."

**Agent:** "Could you please open the CSV file you downloaded in Excel or Google Sheets and check if there is a column containing the actual notes?"

*(Wait for user response)*

**If user says YES (column exists):**
**Agent:** "Okay, great. Sometimes the column headers get changed. In RiteDoc, when you import the file, make sure you select that specific column from the drop-down menu under 'Note Content'. Would you like to try that now while I wait?"

**If user says NO (column missing):**
**Agent:** "Ah, that's the issue. You'll need to go back into [CRM Name] and adjust the export settings to include the note content. We have a step-by-step guide for this in the app under 'Help'. Would you like me to text you a link to that guide?"

## 4. Escalation Path

*(If the troubleshooting steps fail or the issue is not in the matrix.)*

**Agent:** "I'm sorry those steps didn't resolve the issue. It seems this might be a bit more complex. I've recorded everything we've tried in your support ticket."

**Agent:** "I'm going to escalate this to our human support team. They will review the ticket and the diagnostic logs from your app."

## 5. Callback Scheduling

**Agent:** "A member of our team will need to contact you to get this sorted out. What is the best phone number for them to reach you on?"

*(Wait for user response)*

**Agent:** "Got it. And is there a preferred time of day for them to call you back?"

*(Wait for user response)*

**Agent:** "Perfect. I've scheduled a callback for [Time] at [Phone Number]. Our team will be in touch then."

## 6. Closing and Satisfaction Check

**Agent:** "Before we finish, is there anything else I can help you with today?"

*(Wait for user response)*

**If NO:**
**Agent:** "Okay. Thank you for calling ReadyCompliant support. We appreciate your patience, and our team will speak with you soon. Have a great day."

**If YES:**
*(Agent loops back to Step 2 for the new issue.)*
