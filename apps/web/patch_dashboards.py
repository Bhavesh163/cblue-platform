import re

def patch_customer_dashboard():
    with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
        text = f.read()

    # 1. Change "Active Services" to "Active Jobs"
    text = text.replace('Active Services', 'Active Jobs')

    # 2. Delete the "Requests" pill/tab definition
    text = re.sub(
        r'\{\s*key:\s*"requests",\s*label:[^}]+icon:\s*"",\s*badge:\s*requests\.length\s*\},',
        '',
        text
    )
    # Also in the mobile grid:
    text = re.sub(
        r'\{\s*key:\s*"requests",\s*icon:\s*"",\s*label:[^,]+,\s*count:\s*null\s*\},',
        '',
        text
    )
    
    # And delete the rendering of RequestsTab
    text = re.sub(
        r'\{activeTab === "requests" && <RequestsTab[^>]+/>\}',
        '',
        text
    )
    
    # 3. Fix the "Recent Chats" mapping. 
    # Notice that standard orders are getting filtered and wrapped in a Link. 
    # BUT wait, the modal bug. The user says: 
    # "when clicked recent chat, it showed step 5 of 12, waiting for partner confirmation modal, which is wrong as it is for step 7, chat."
    # Let's inspect why Recent Chat shows the modal. Is there a global waitModalOrder overlay? Yes. But clicking the Link triggers routing, not waitModalOrder. Unless the onClick handler from an outer div is catching it? No.
    # Ah, the Recent chats map.
    text = text.replace(
        '''<Link key={i} href={`${prefix}/chat/${o.id}`} className="p-4 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer block">''',
        '''<Link key={i} href={`${prefix}/chat/${o.id}`} className="p-4 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer block" onClick={(e) => e.stopPropagation()}>'''
    )

    with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
        f.write(text)

patch_customer_dashboard()
