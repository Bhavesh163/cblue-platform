import re

with open('apps/web/app/[locale]/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix combinedActive and Requests to only show mock data for ghis
content = content.replace(
    "const combinedActive = [...mockActiveItems, ...ACTIVE_MOCK];", 
    "const combinedActive = [...mockActiveItems, ...(subscriber?.email?.includes('ghis') ? ACTIVE_MOCK : [])];"
)
content = content.replace(
    "const combinedRequests = [...requests, ...REQUESTS_MOCK];", 
    "const combinedRequests = [...requests, ...(subscriber?.email?.includes('ghis') ? REQUESTS_MOCK : [])];"
)

# 2. Fix the Modal Title (Remove "Paying fee & Notification to Proceed")
content = re.sub(
    r'<h2 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-green-700">.*?</h2>',
    r'<h2 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-green-700">Pay fee & NTP</h2>',
    content
)

with open('apps/web/app/[locale]/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
