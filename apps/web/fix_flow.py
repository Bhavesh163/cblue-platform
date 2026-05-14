import re
import os

dash_path = "../../apps/web/app/[locale]/dashboard/page.tsx"
if not os.path.exists(dash_path):
    dash_path = "app/[locale]/dashboard/page.tsx"
if not os.path.exists(dash_path):
    dash_path = "/home/ballhog/cblue-platform/apps/web/app/[locale]/dashboard/page.tsx"

with open(dash_path, "r", encoding="utf-8") as f:
    dash = f.read()

dash = dash.replace(
    'const STEPS = ["Notify", "Confirm", "Pay", "Chat", "Meet", "Variation", "Complete", "Rate", "Done"];',
    'const STEPS = ["Notify", "Accept", "Fee & Proceed", "Chat", "Meet", "Variation", "Complete", "Rate", "Done"];'
).replace(
    'const STEPS_FULL = ["Match", "Select", "PO", "Notify", "Confirm", "Pay", "Chat", "Meet", "Variation", "Complete", "Rate", "Done"];',
    'const STEPS_FULL = ["Match", "Select", "PO", "Notify", "Accept", "Fee & Proceed", "Chat", "Meet", "Variation", "Complete", "Rate"];'
).replace(
    'const STEPS_FULL = ["Match", "Select", "PO", "Notify", "Confirm", "Pay", "Chat", "Meet", "Variation", "Complete", "Rate", "Done"];',
    'const STEPS_FULL = ["Match", "Select", "PO", "Notify", "Accept", "Fee & Proceed", "Chat", "Meet", "Variation", "Complete", "Rate"];'
)

# 2. Fix Active Jobs layout - put them in one big pill and remove budget/subdistrict, read-only
def re_replace(pattern, repl, text):
    return re.sub(pattern, repl, text, flags=re.DOTALL)

active_card_new = '''const renderActiveCard = (item: any, idx: number) => (
    <div key={idx} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
         <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center font-bold">{(item.title || item.service || "C").charAt(0)}</div>
         <div>
           <h3 className="font-bold text-gray-900">{item.title || item.service} <span className="text-sm font-normal text-gray-400">· {item.po || `PO-${item.id?.slice(0,8) || '2605-8471'}`}</span></h3>
           <p className="text-sm text-gray-600 mt-0.5">{item.customer || "Customer"} · {item.date || new Date().toLocaleDateString()}</p>
         </div>
      </div>
      <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
        <div className="flex flex-col gap-1 w-full sm:w-64">
           <Progress12Steps currentStep={item.step || 4} />
        </div>
        <div className="text-right">
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${item.actionNeeded ? 'bg-red-50 text-red-700' : 'bg-blue-100 text-blue-700 whitespace-nowrap'}`}>{item.actionNeeded ? 'Action Needed' : 'In Progress'}</span>
        </div>
      </div>
    </div>
  );'''

dash = re_replace(r'const renderActiveCard = \(item: any, idx: number\) => \(.*?\n  \);', active_card_new, dash)

dash = dash.replace(
'''<div className="flex justify-between items-center mb-4 mt-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">Active Jobs</h2>
                <span className="text-gray-500 font-bold text-sm">{combinedActive.length}</span>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("active")}>View All</button>
            </div>
            <div className="flex flex-col gap-3">
              {combinedActive.slice(0, 3).map((m, i) => renderActiveCard(m, i))}
            </div>''',
'''<div className="flex justify-between items-center mb-4 mt-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">Active Jobs</h2>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {combinedActive.map((m, i) => renderActiveCard(m, i))}
            </div>'''
)

dash = dash.replace(
'''<div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-gray-800">Active Jobs</h2>
              <span className="text-gray-500 font-bold text-sm">{combinedActive.length}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            {combinedActive.map((m, i) => renderActiveCard(m, i))}
          </div>
        </div>''',
'''<div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-gray-800">Active Jobs</h2>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50 mt-4">
            {combinedActive.map((m, i) => renderActiveCard(m, i))}
          </div>
        </div>'''
)

# Replace the specific alerts on dashboard - remove left alert if there're 2 or replace mock
alerts_mock = '''const ALERTS_MOCK = [
    {
      id: "a1",
      message: "Partner notified to review job with PO and detail, to confirm meeting.",
    },
    {
      id: "a2",
      message: "Partner to review variation order and complete.",
    }
  ];'''
alerts_new = '''const ALERTS_MOCK = [
    {
      id: "a1",
      message: "Action needed for FITOUT PO-3a68-12e3.",
    }
  ];'''
dash = dash.replace(alerts_mock, alerts_new)


with open(dash_path, "w", encoding="utf-8") as f:
    f.write(dash)



# ---- PARTNER DASHBOARD (Fixers Page) ----
partner_path = "/home/ballhog/cblue-platform/apps/web/app/[locale]/fixers/page.tsx"
with open(partner_path, "r", encoding="utf-8") as f:
    p = f.read()

# Update steps
p = p.replace('const STEPS = ["Notify", "Confirm", "Pay", "Chat", "Meet", "Variation", "Complete", "Rate", "Done"];', 'const STEPS = ["Notify", "Accept", "Fee & Proceed", "Chat", "Meet", "Variation", "Complete", "Rate", "Done"];')

# Fix Alerts mock
p = p.replace('''const MOCK_ALERTS = [
  { id: 1, message: "Review PO Details for GREEN CONSTRUCTION", isNew: true, time: "Just now" }
];''', '''const MOCK_ALERTS = [
  { id: 1, message: "Review PO Details for GREEN CONSTRUCTION", isNew: true, time: "Just now" },
  { id: 2, message: "Review PO Details for FITOUT", isNew: true, time: "2 mins ago" }
];''')

# Fix Recent incoming chats
p = p.replace('''<h2 className="text-xl font-bold text-gray-800">Recent chats</h2>''', '''<h2 className="text-xl font-bold text-gray-800">Recent incoming chats</h2>''')

# Fix Active jobs to be one big pill and remove limit
active_big_pill = '''<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50 flex flex-col gap-0">
            {activeJobs.map((req, i) => (
              <div key={req.id} className="p-5 flex flex-col sm:flex-row justify-between gap-4 cursor-default">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    {req.service.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{req.service}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {req.customer} · {req.date} <span className="text-gray-400">· {req.po}</span>
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 items-end">
                   <div className="w-full sm:w-64">
                     <Progress12Steps currentStep={req.step || 4} />
                   </div>
                   <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${req.actionNeeded ? 'bg-red-50 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {req.actionNeeded ? 'Action needed' : 'ASSIGNED'}
                  </span>
                </div>
              </div>
            ))}
            {activeJobs.length === 0 && <p className="text-gray-500 text-sm p-4">No active jobs</p>}
          </div>'''

# We need to replace the flex-col gap-4 list mapping activeJobs
p = re_replace(r'<div className="flex flex-col gap-3">\n\s*?\{activeJobs.*?</div>\n\s*?</div>\n\s*?\)\)\}\n\s*?</div>', active_big_pill, p)

with open(partner_path, "w", encoding="utf-8") as f:
    f.write(p)

# Chat Height Fix
chat_path = "/home/ballhog/cblue-platform/apps/web/app/[locale]/chat/[id]/ClientChatPage.tsx"
if os.path.exists(chat_path):
    with open(chat_path, "r", encoding="utf-8") as f:
        c = f.read()
    
    # We want to change the height to not touch top bar, reduce it, but keep font sizes
    # Original is probably `h-[calc(100vh-140px)]`
    c = c.replace("h-[calc(100vh-140px)]", "h-[calc(100vh-160px)] mt-4")
    c = c.replace("h-[calc(100vh-64px)]", "h-[calc(100vh-160px)] mt-4")
    c = c.replace("h-[calc(100vh-100px)]", "h-[calc(100vh-160px)] mt-4")

    with open(chat_path, "w", encoding="utf-8") as f:
        f.write(c)

