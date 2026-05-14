import re
import os

dash_path = "apps/web/app/[locale]/dashboard/page.tsx"
if not os.path.exists(dash_path): dash_path = "/home/ballhog/cblue-platform/apps/web/app/[locale]/dashboard/page.tsx"

with open(dash_path, "r", encoding="utf-8") as f:
    d = f.read()

# 1. Update ActiveCard to include budget & subdistrict, and show full steps
def re_replace(pattern, repl, text): return re.sub(pattern, repl, text, flags=re.DOTALL)

active_card_new = '''const renderActiveCard = (item: any, idx: number) => (
    <div key={idx} className="p-5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
         <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center font-bold">{(item.title || item.service || "C").charAt(0)}</div>
         <div>
           <h3 className="font-bold text-gray-900">{item.title || item.service} <span className="text-sm font-normal text-gray-400">· {item.po || `PO-${item.id?.slice(0,8) || '2605-8471'}`} | {item.subdistrict || 'Saphansong'}</span></h3>
           <p className="text-sm text-gray-600 mt-0.5">{item.customer || "Customer"} · {item.date || "11/5/2026 14:30"} · Budget: ฿{Number(item.budget || item.price || 0).toLocaleString()}</p>
         </div>
      </div>
      <div className="flex items-center gap-4 w-full xl:w-auto mt-2 xl:mt-0 justify-between xl:justify-end overflow-hidden">
        <div className="flex flex-col gap-1 w-full min-w-[300px] xl:w-[600px]">
           <Progress12Steps currentStep={item.step || 4} />
        </div>
        <div className="text-right whitespace-nowrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${item.actionNeeded ? 'bg-red-50 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{item.actionNeeded ? 'Action Needed' : 'In Progress'}</span>
        </div>
      </div>
    </div>
  );'''

d = re_replace(r'const renderActiveCard = \(item: any, idx: number\) => \(.*?\n  \);', active_card_new, d)

# 2. Fix Incoming Requests Card styling so it fits seamlessly into the big pill
req_card_new = '''const renderRequestCard = (item: any) => (
    <div key={item.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
          {(item.title || item.type || "R").charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{item.title || item.type} <span className="text-sm font-normal text-gray-500">· {item.po || "PO-b01d-c200"}</span></h3>
          <p className="text-sm text-gray-600 mt-0.5">{item.provider || "Provider"} · {item.date || "11/5/2026 10:15"}</p>
          {item.description && <p className="text-sm text-gray-700 mt-2">{item.description}</p>}
          <p className="text-sm font-medium text-gray-800 mt-1">Budget: ฿{Number(item.budget || item.price || 0).toLocaleString()}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{item.tier || "ECONOMY"}</span>
        <div className="flex gap-2">
          <button onClick={() => setWaitModalOrder(item)} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
             Paying fee
          </button>
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
            Decline
          </button>
        </div>
      </div>
    </div>
  );'''

d = re_replace(r'const renderRequestCard = \(item: any\) => \(.*?\n  \);', req_card_new, d)

# 3. Fix Step 6->7 Payment flow to accurately advance state
# Look for testing pill
testing_pill = '''<button 
                className="w-full py-3 bg-indigo-50 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition whitespace-nowrap"
                onClick={() => {
                  // Simulate successful payment bridging to chat
                  setMockActiveItems(prev => [...prev, {
                    id: waitModalOrder.id,
                    title: waitModalOrder.type || waitModalOrder.service || "SERVICE",
                    po: waitModalOrder.po || `PO-${waitModalOrder.id?.slice(0,8)}`,
                    customer: waitModalOrder.provider || "Provider",
                    date: "Just now",
                    budget: waitModalOrder.budget || waitModalOrder.price,
                    actionNeeded: true,
                    step: 7
                  }]);
                  setWaitModalOrder(null); setActiveTab("chat");
                }}
              >
                🚧 Testing Period Payment Pill 🚧
              </button>'''

fixed_testing_pill = '''<button 
                className="w-full py-3 bg-indigo-50 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition whitespace-nowrap"
                onClick={() => {
                  const updatedItem = {
                    id: waitModalOrder.id,
                    title: waitModalOrder.type || waitModalOrder.service || "SERVICE",
                    po: waitModalOrder.po || `PO-${waitModalOrder.id?.slice(0,8)}`,
                    customer: waitModalOrder.provider || "Provider",
                    date: new Date().toLocaleString(),
                    budget: waitModalOrder.budget || waitModalOrder.price,
                    subdistrict: waitModalOrder.subdistrict || 'Saphansong',
                    actionNeeded: true,
                    step: 7
                  };
                  
                  // Update active items or add to it
                  setMockActiveItems(prev => {
                     const exists = prev.find(p => p.id === waitModalOrder.id);
                     if(exists) {
                         return prev.map(p => p.id === waitModalOrder.id ? updatedItem : p);
                     }
                     return [...prev, updatedItem];
                  });
                  
                  // Add to chat mock
                  
                  setWaitModalOrder(null); 
                  setActiveTab("chat");
                }}
              >
                🚧 Testing Period Payment Pill 🚧
              </button>'''

d = d.replace(testing_pill, fixed_testing_pill)

# 4. Hide Top Nav bar when Payment Modal is open
# This is tricky because the modal is rendered inside the layout. We can add a full screen absolute overlay wrapper that uses z-50
modal_start = '''{waitModalOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">'''
modal_start_fixed = '''{waitModalOrder && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">'''
d = d.replace(modal_start, modal_start_fixed)

d = d.replace('<p className="hidden md:block text-sm font-medium text-gray-500 mb-6">Step 6 of 12</p>', '<p className="hidden md:block text-sm font-medium text-gray-500 mb-6">Step 6 of 11</p>')

with open(dash_path, "w", encoding="utf-8") as f:
    f.write(d)


# -------- FIXERS PAGE (Partner) -----------
partner_path = "/home/ballhog/cblue-platform/apps/web/app/[locale]/fixers/page.tsx"
with open(partner_path, "r", encoding="utf-8") as f:
    p = f.read()

p = p.replace("Step 5 of 12", "Step 5 of 11")

# Make active jobs wider on partner page to prevent progress bar crushing
active_partner_pill = '''<div key={req.id} className="p-5 flex flex-col xl:flex-row justify-between gap-4 cursor-default">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    {req.service.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{req.service}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {req.customer} · {req.date} <span className="text-gray-400">· {req.po} | Saphansong</span>
                    </p>
                    <p className="text-sm font-medium text-gray-800 mt-1">Budget: ฿{Number(req.budget || 25000000).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 items-end xl:items-center xl:flex-row">
                   <div className="w-full min-w-[300px] xl:w-[600px] mb-2 xl:mb-0 xl:mr-4">
                     <Progress12Steps currentStep={req.step || 4} />
                   </div>
                   <span className={`text-xs px-2.5 py-1 rounded-full font-bold whitespace-nowrap ${req.actionNeeded ? 'bg-red-50 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {req.actionNeeded ? 'Action needed' : 'ASSIGNED'}
                  </span>
                </div>
              </div>'''

p = re_replace(r'<div key=\{req\.id\} className="p-5 flex flex-col sm:flex-row justify-between gap-4 cursor-default">.*?</Progress12Steps>\n\s*?</div>\n\s*?<span className=\{`text-xs px-2.5 py-1 rounded-full font-bold \$\{req\.actionNeeded \? \'bg-red-50 text-red-700\' \: \'bg-blue-100 text-blue-700\'\}`\}>\n\s*?\{req\.actionNeeded \? \'Action needed\' \: \'ASSIGNED\'\}\n\s*?</span>\n\s*?</div>\n\s*?</div>', active_partner_pill, p)

with open(partner_path, "w", encoding="utf-8") as f:
    f.write(p)


# ---------- CHAT PAGE -----------
chat_path = "/home/ballhog/cblue-platform/apps/web/app/[locale]/chat/[id]/ClientChatPage.tsx"
if os.path.exists(chat_path):
    with open(chat_path, "r", encoding="utf-8") as f:
        c = f.read()
    
    # Hide Top Navbar. This component currently probably has a wrapper.
    # To hide navbar, we can use a z-50 fixed full overlay for the chat.
    # Also change back arrow to X and align to right, navigate to /dashboard?tab=chat
    
    # Replace back button
    old_back = '''<button onClick={() => router.back()} className="mr-3 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>'''
    
    new_close = '''<button onClick={() => router.push(`/${params.locale}/dashboard`)} className="ml-auto text-gray-600 hover:text-red-600 transition-colors order-last">
              <X className="w-6 h-6" />
            </button>'''
    
    c = c.replace(old_back, "")
    c = c.replace('''<h1 className="text-lg font-bold text-gray-900 truncate">''', new_close + '''\n<h1 className="text-lg font-bold text-gray-900 truncate flex-grow">''')
    
    # Imports
    if "import { ArrowLeft" in c:
        c = c.replace("ArrowLeft", "ArrowLeft, X")
    else:
        c = c.replace("import { Send", "import { Send, X")
        
    with open(chat_path, "w", encoding="utf-8") as f:
        f.write(c)

