import os
import re

def update_partner_dash():
    path = "apps/web/app/[locale]/fixers/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    # Incoming requests limit to 3 -> .slice(0, 3)
    text = re.sub(r'incomingJobs\.length > 0 \? incomingJobs\.slice\(0, \d+\)', 'incomingJobs.length > 0 ? incomingJobs.slice(0, 3)', text)
    text = re.sub(r'incomingJobs\.slice\(0, \d+\)', 'incomingJobs.slice(0, 3)', text)

    # Active jobs limit to 5 -> .slice(0, 5)
    # Alerts limit to 4 -> .slice(0, 4)
    text = re.sub(r'activeJobs\.slice\(0, \d+\)', 'activeJobs.slice(0, 5)', text)

    # Replace "Assigned" or similar if needed.
    text = text.replace('ASSIGNED', '')
    text = text.replace('Assigned', '')

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)

def update_customer_dash():
    path = "apps/web/app/[locale]/dashboard/page.tsx"
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    # Remove "Paying fee & Notification to Proceed" above modal
    text = text.replace('<h2 className="font-bold text-xl text-center mb-6">Step 6 of 12<br/>Paying fee & Notification to Proceed</h2>', '')
    
    # Remove filled circle and ✓ in Progress12Steps
    # Locate Progress12Steps component
    if 'function Progress12Steps' in text:
        # replace the checkmark SVG with just the number or remove bg-green-500
        text = text.replace('<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>', '{step.num || logicalStepN}')
        text = text.replace("bg-green-500 text-white", "bg-white border-2 border-green-500 text-green-500")

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)

update_partner_dash()
update_customer_dash()
