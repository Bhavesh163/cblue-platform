import re

# 1. Update dashboard/page.tsx
dash = "app/[locale]/dashboard/page.tsx"
with open(dash, "r", encoding="utf-8") as f:
    d = f.read()

# Fix mock items step addition
d = d.replace(
    '''setMockActiveItems(prev => [...prev, {
                    ...waitModalOrder,
                    actionNeeded: false,
                    step: 7
                  }]);''',
    '''setMockActiveItems(prev => [...prev, {
                    ...waitModalOrder.request,
                    actionNeeded: false,
                    step: 7
                  }]);'''
)

# Fix "Paying fee & Notification to Proceed" on payment modal
d = d.replace(
    '''<span className="font-semibold text-gray-900">Step 6 of 12 Paying fee & Notification to Proceed &nbsp;|&nbsp; <span>{waitModalOrder.request?.title || "Payment"}</span></span>''',
    '''<span className="font-semibold text-gray-900">Step 6 of 12 &nbsp;|&nbsp; <span>{waitModalOrder.request?.title || "Payment"}</span></span>'''
)
d = d.replace(
    '''<span className="font-semibold text-gray-900">Step 6 of 12 Paying fee & Notification to Proceed &nbsp;|&nbsp; <span>{item.title}</span></span>''',
    '''<span className="font-semibold text-gray-900">Step 6 of 12 &nbsp;|&nbsp; <span>{item.title}</span></span>'''
)
d = d.replace(
    '''{waitModalOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">✓</span>
                <span className="font-bold text-gray-900">Pay fee & NTP</span>
              </div>''',
    '''{waitModalOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">✓</span>
                <span className="font-bold text-gray-900">Payment</span>
              </div>'''
)

# Fix recent incoming chats/alerts ordering in dashboard
# The user wants "Recent Incoming Chats pill and recent alerts pill to above of incoming requests pill."
# They are already above Incoming Requests in my last edit according to the transcript (line 942-960 is charts, 962 is requests).
# I'll double check. And also delete irrelevant alert for user.
d = re.sub(
r'''<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">Recent Alerts <span className="text-xs text-sky-600 cursor-pointer" onClick=\(\(\) => setActiveTab\("alerts"\)\)>View All</span></h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-sm text-gray-700"><div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0"></div><p>Partner notified to review job with PO and detail, to confirm meeting.</p></div>
                  <div className="flex items-start gap-3 text-sm text-gray-700"><div className="w-2 h-2 mt-1.5 rounded-full bg-amber-500 flex-shrink-0"></div><p>Partner to review variation order and complete.</p></div>
                </div>
              </div>''',
r'''<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">Recent Alerts <span className="text-xs text-sky-600 cursor-pointer" onClick={() => setActiveTab("alerts")}>View All</span></h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-sm text-gray-700"><div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 flex-shrink-0"></div><p>Action Needed: Please pay processing fee for REINSTATEMENT PO-b01d-c200.</p></div>
                </div>
              </div>''', d)

# Fix cursor pointer background hover for Active Jobs
# replace hover:bg-gray-100 transition cursor-pointer in renderActiveCard
d = d.replace(
'''<div key={idx} className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-100 transition cursor-pointer gap-4" onClick={() => handleOrderClick ? handleOrderClick(item) : null}>''',
'''<div key={idx} className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">''' # Removed hover, transition, cursor-pointer, onClick
)

# Fix incoming requests pill to have same design as active jobs
d = d.replace(
'''<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div className="flex flex-col">
                <h3 className="font-bold text-gray-900">Incoming Requests</h3>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("requests")}>View All</button>
            </div>
            <div className="p-5">
              {(subscriber?.email?.includes('ghis') ? REQUESTS_MOCK : []).slice(0, 3).map(m => renderRequestCard(m))}
            </div>
          </div>''',
'''<div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">Incoming Requests</h2>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("requests")}>View All</button>
            </div>
            <div className="flex flex-col gap-3">
              {(subscriber?.email?.includes('ghis') ? REQUESTS_MOCK : []).map(m => renderRequestCard(m))}
            </div>
          </div>'''
)

# And renderRequestCard should be a pill.
pill_request_card = '''const renderRequestCard = (item: any) => {
    if (mockPayments[item.id]) return null;
      return (
      <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">{(item.title || "R").charAt(0)}</div>
           <div>
             <h3 className="font-bold text-gray-900">{item.title} <span className="text-sm font-normal text-gray-500">· {item.po}</span></h3>
             <p className="text-sm text-gray-600 mt-0.5">{item.customer} · {item.date}</p>
             <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
           </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
          <div className="text-left sm:text-right flex flex-col gap-1">
             <span className="font-bold text-gray-900 pr-2">Budget: {item.budget}</span>
             <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 uppercase self-start sm:self-end w-max">{item.tier}</span>
          </div>
          <div className="flex gap-2">
            <button className="bg-sky-600 outline-none text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-sky-700 transition shadow-sm w-full md:w-auto" onClick={() => setWaitModalOrder({ id: item.id, status: 'MATCHING', request: item })}>Paying fee</button>
            <button className="border border-gray-300 text-gray-600 px-5 py-2 outline-none rounded-lg text-sm font-bold hover:bg-gray-100 transition shadow-sm w-full md:w-auto">Decline</button>
          </div>
        </div>
      </div>
    );
  };'''

d = re.sub(
    r'''const renderRequestCard = \(item: any\) => \{.*?\n  \};''', 
    pill_request_card, 
    d, 
    flags=re.DOTALL
)

# 3.7 & 3.8 Active jobs and Request tab show all
d = d.replace(
'''<div className="p-5">
              {(subscriber?.email?.includes('ghis') ? REQUESTS_MOCK : []).slice(0, 3).map(m => renderRequestCard(m))}
            </div>''',
'''<div className="flex flex-col gap-3">
              {(subscriber?.email?.includes('ghis') ? REQUESTS_MOCK : []).map(m => renderRequestCard(m))}
            </div>'''
)

with open(dash, "w", encoding="utf-8") as f:
    f.write(d)


# 2. Update fixers/page.tsx
fixers = "app/[locale]/fixers/page.tsx"
with open(fixers, "r", encoding="utf-8") as f:
    fx = f.read()

# "Partner should be notified to Review PO Details for GREEN CONSTRUCTION and Review PO Details for FIT OUT.  Then, later Confirm meeting at site... not yet done!"
# We update notifications mock in fixers.
fx = re.sub(
r'''const notifications: any\[\] = \[\];''',
r'''const notifications: any[] = [
  { id: 1, msg: "Action Needed: Review PO Details for GREEN CONSTRUCTION", msgTh: "ต้องดำเนินการ: ตรวจสอบรายละเอียด PO สำหรับ GREEN CONSTRUCTION", msgZh: "需要采取行动：仔细审查 GREEN CONSTRUCTION 的 PO 细节", time: "Just now", unread: true, dot: "bg-red-500" },
  { id: 2, msg: "Action Needed: Review PO Details for FITOUT", msgTh: "ต้องดำเนินการ: ตรวจสอบรายละเอียด PO สำหรับ FITOUT", msgZh: "需要采取行动：仔细审查 FITOUT 的 PO 细节", time: "2 mins ago", unread: true, dot: "bg-red-500" }
];''', fx)

# "when suppadesh clicked 1 file attached (Click to View), it responded: 404... there is a file uploaded by Ghis"
# In the PO modal.
fx = fx.replace(
'''<a href={selectedJob.fileUrl || "/images/scenic-house.jpg"} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition mt-2 border border-gray-200">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-700">1 file attached <span className="text-gray-400 font-normal text-xs">(Click to View)</span></p>
                </div>
              </a>''',
'''<a href={selectedJob.fileUrl || "/images/scenic-house.jpg"} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition mt-2 border border-gray-200">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                <div className="flex-1">
                  <p className="text-sm font-bold text-sky-700 underline">View attached file</p>
                </div>
              </a>'''
)

# "When suppadesh clicked accept PO, it changed to be our partner page..... actually, there should be notification of acceptance first and then the request job should be disappear from requests list"
fx = fx.replace(
'''onClick={() => { setActiveTab("overview"); setSelectedJob(null); }}''',
'''onClick={() => { 
  alert("Notification: PO Accepted! Customer will be prompted for payment.");
  setRequests(prev => prev.filter(r => r.id !== selectedJob.id));
  setSelectedJob(null);
  setActiveTab("overview");
}}'''
)

with open(fixers, "w", encoding="utf-8") as f:
    f.write(fx)

