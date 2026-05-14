import re

def process_dashboard():
    with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
        text = f.read()

    # 1. Paying fee title drop
    text = text.replace('<h3 className="text-xl font-bold text-gray-900 mb-2">Paying fee & Notification to Proceed</h3>', '')

    # 2. Progress step dots.
    # We want them to have no filled background and no checkmark.
    text = re.sub(
        r'bg-green-500 text-white',
        r'border border-gray-300 text-gray-500 bg-transparent',
        text
    )
    text = re.sub(
        r'bg-blue-600 text-white ring-4 ring-blue-100',
        r'border-2 border-blue-600 text-blue-600 bg-transparent',
        text
    )
    # Remove checkmark SVG from step progress
    # <svg className="w-5 h-5" fill="none" ... />
    text = re.sub(
        r'\{step\.completed \? <svg.*?svg> : (index \+ 1|index \+ 5)\}',
        r'{\1}',
        text,
        flags=re.DOTALL
    )

    # 3. Handle testing pill advancing to step 7 (chat) and updating status
    # Wait, the customer clicked the test pill and it just bounced back. We need to update the state correctly.
    # Find testing pill: <button ... onClick={() => ... } ...> Testing Period Payment Pill </button>
    # It probably triggers setSelectedRequest(null). We need it to advance step.
    
    with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
        f.write(text)


def process_fixers():
    with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
        text = f.read()

    # Apply same step progress visual changes
    text = re.sub(
        r'bg-green-500 text-white',
        r'border border-gray-300 text-gray-500 bg-transparent',
        text
    )
    text = re.sub(
        r'bg-blue-600 text-white ring-4 ring-blue-100',
        r'border-2 border-blue-600 text-blue-600 bg-transparent',
        text
    )
    text = re.sub(
        r'\{step\.completed \? <svg.*?svg> : (index \+ 1|index \+ 5)\}',
        r'{\1}',
        text,
        flags=re.DOTALL
    )

    # Change limits: 
    # Incoming Requests 3
    # Recent Alerts 4
    # Recent Incoming Chats 4
    # Active Jobs 5
    text = re.sub(r'incomingJobs\.slice\(0, 2\)', r'incomingJobs.slice(0, 3)', text)
    text = re.sub(r'alerts\.slice\(0, 2\)', r'alerts.slice(0, 4)', text)
    text = re.sub(r'chats\.slice\(0, 2\)', r'chats.slice(0, 4)', text) # if it's there
    text = re.sub(r'activeJobs\.slice\(0, 3\)', r'activeJobs.slice(0, 5)', text)

    # Remove ASSIGNED
    # Oh wait, we broke the build adding back ASSIGNED: "". The user wants it removed from the UI!
    # "Also, please delete text "Assigned"."
    # It was in the status or the dynamic progress text.
    # Where does it print ASSIGNED? 
    text = text.replace('{t("ASSIGNED")}', '')
    text = text.replace('{STATUS_LABEL[m.status] || m.status}', '{(m.status === "ASSIGNED" ? "" : STATUS_LABEL[m.status]) || m.status}')
    text = text.replace('ASSIGNED', '')

    with open("apps/web/app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
        f.write(text)

process_dashboard()
process_fixers()
print("Applied global basic visual fixes")
