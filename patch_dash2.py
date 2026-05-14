import re

with open('apps/web/app/[locale]/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Filter mocks by user Ghis
content = content.replace(
    "{REQUESTS_MOCK.map(m => renderRequestCard(m))}", 
    "{(subscriber?.email?.includes('ghis') ? REQUESTS_MOCK : []).map(m => renderRequestCard(m))}"
)
content = content.replace(
    "{REQUESTS_MOCK.slice(0, 3).map(m => renderRequestCard(m))}", 
    "{(subscriber?.email?.includes('ghis') ? REQUESTS_MOCK : []).slice(0, 3).map(m => renderRequestCard(m))}"
)
content = content.replace(
    "{REQUESTS_MOCK.filter(m => !mockPayments[m.id]).length}",
    "{(subscriber?.email?.includes('ghis') ? REQUESTS_MOCK : []).filter(m => !mockPayments[m.id]).length}"
)

# Render requests in the same pill (like partner dashboard)
# Currently it looks like:   <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
# Let's wrap them in a container if they aren't
# Actually, the user says "please edit to let all 2 presented incoming requests jobs to be in the same pill... please wider incoming requests to cover the space at the left"
# And move Chats/Alerts above Incoming Requests in Overview
content = re.sub(
    r'(<div className="md:col-span-2 space-y-6">.*?)(<div className="flex items-center justify-between mb-4">\s*<h3 className="text-xl font-bold text-gray-900">Incoming Requests</h3>.*?)(<div className="grid grid-cols-1 md:grid-cols-2 gap-6">\s*<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">\s*<h3 className="font-bold text-gray-900 mb-3">Recent Incoming Chats</h3>.*?</div>\s*</div>)',
    r'\1\3\n\n        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">\2</div>',
    content,
    flags=re.DOTALL | re.IGNORECASE
)

with open('apps/web/app/[locale]/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
