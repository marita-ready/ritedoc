import requests
import datetime
import json

API_KEY = "YOUR_BREVO_API_KEY_HERE"
BASE_URL = "https://api.brevo.com/v3/contacts"

def check_contacts():
    headers = {
        "accept": "application/json",
        "api-key": API_KEY
    }
    
    # Get total count and first page of contacts
    # We'll use a large limit to get as many as possible in one go, 
    # but the API usually has a limit (e.g., 50 or 100).
    params = {
        "limit": 50,
        "offset": 0,
        "sort": "desc"
    }
    
    try:
        response = requests.get(BASE_URL, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        
        total_contacts = data.get("count", 0)
        contacts = data.get("contacts", [])
        
        # Calculate the cutoff time (4 hours ago)
        # Brevo timestamps are usually in ISO 8601 format
        now = datetime.datetime.now(datetime.timezone.utc)
        four_hours_ago = now - datetime.timedelta(hours=4)
        
        new_contacts = []
        for contact in contacts:
            created_at_str = contact.get("createdAt")
            if created_at_str:
                # Example format: "2023-10-27T10:00:00.000+0000" or similar
                # We'll try to parse it safely
                try:
                    # Removing the extra milliseconds/timezone if needed for standard parsing
                    # or using fromisoformat if it's standard.
                    # Brevo often uses "2024-01-01T12:00:00.000Z" or similar.
                    created_at = datetime.datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                    if created_at > four_hours_ago:
                        new_contacts.append(contact)
                except ValueError:
                    continue

        # Prepare the report
        report = []
        report.append(f"Brevo Contact Check Report")
        report.append(f"Checked at: {now.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        report.append(f"Total number of contacts in account: {total_contacts}")
        report.append(f"New contacts added in the last 4 hours: {len(new_contacts)}")
        
        if new_contacts:
            report.append("\nList of new contacts:")
            for nc in new_contacts:
                email = nc.get("email", "N/A")
                attributes = nc.get("attributes", {})
                # Common attribute names for name
                first_name = attributes.get("FIRSTNAME", "")
                last_name = attributes.get("LASTNAME", "")
                name = f"{first_name} {last_name}".strip() or "N/A"
                report.append(f"- Email: {email} | Name: {name}")
        
        report_text = "\n".join(report)
        
        # Save to file
        with open("/home/ubuntu/brevo_check_results.txt", "w") as f:
            f.write(report_text)
            
        print(report_text)

    except Exception as e:
        error_msg = f"Error checking Brevo API: {str(e)}"
        with open("/home/ubuntu/brevo_check_results.txt", "w") as f:
            f.write(error_msg)
        print(error_msg)

if __name__ == "__main__":
    check_contacts()
