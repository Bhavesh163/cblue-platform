import re

with open('apps/web/app/[locale]/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Remove left-hand alerts pill because user said "delete the left hand pill... reduce to be only a recent alerts in overview"
text = re.sub(
    r'(<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">\s*<div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">\s*<h3 className="font-bold text-gray-900 flex items-center gap-2"> Recent Alerts.*?</div>\s*</div>)',
    '',
    text,
    flags=re.DOTALL
)

# 2. Extract Chats and Alerts block from where it is at the bottom of the right column
chats_match = re.search(r'(<div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">.*?</p></div>\s*</div>\s*</div>\s*</div>)', text, re.DOTALL)
if chats_match:
    chats_content = chats_match.group(1)
    text = text.replace(chats_content, "")
    
    # 3. Find Incoming Requests block
    req_match = re.search(r'(<div[^>]*>\s*<div className="flex justify-between items-center mb-4">\s*<div className="flex flex-col">\s*<h2 className="text-xl font-bold text-gray-800">Incoming Requests.*?</div>\s*</div>)', text, re.DOTALL)
    
    if req_match:
        # Wrap requests in pill
        req_content = req_match.group(1)
        pill_req = '''<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900">Incoming Requests</h3>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("requests")}>View All</button>
            </div>
            <div className="p-5">
              {(subscriber?.email?.includes('ghis') ? REQUESTS_MOCK : []).slice(0, 3).map(m => renderRequestCard(m))}
            </div>
          </div>'''
          
        text = text.replace(req_content, chats_content + "\n" + pill_req)

with open('apps/web/app/[locale]/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
