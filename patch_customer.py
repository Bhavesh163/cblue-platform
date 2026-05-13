import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

# Step 1. Replace the old render styles with partner-aligned 'JobCard' aesthetic
new_styles = """
  const renderRequestCard = (item: any) => {
    if (mockPayments[item.id]) return null;
    return (
      <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md cursor-pointer transition mb-4">
        <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-3">
          <span className="font-semibold text-gray-900">Step 6 of 12 Paying fee & Notification to Proceed &nbsp;|&nbsp; <span>{item.title}</span></span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">New Request</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{item.customer} &middot; {item.date}</span>
            <span className="font-semibold text-gray-900 pr-2">Budget: {item.budget}</span>
          </div>
          <p className="text-sm text-gray-600">{item.desc}</p>
          <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
            <span>{item.po}</span>
            <span className="px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700">{item.tier}</span>
          </div>
          <div className="flex gap-4 mt-4">
            <button className="bg-sky-600 outline-none text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-sky-700 transition shadow-sm w-full md:w-auto" onClick={() => setWaitModalOrder({ id: item.id, status: 'MATCHING', request: item })}>Paying fee</button>
            <button className="border border-gray-300 text-gray-600 px-6 py-2 outline-none rounded-lg text-sm font-bold hover:bg-gray-100 transition shadow-sm w-full md:w-auto">Decline</button>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveCard = (item: any, idx: number) => (
    <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md cursor-pointer transition mb-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900 text-lg">{item.title}</span>
        {item.actionNeeded ? (
          <span className="text-red-500 text-xs font-bold flex items-center gap-1 bg-red-50 px-2.5 py-1 rounded-full"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>Action needed</span>
        ) : (
          <span className="text-gray-500 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100">In Progress</span>
        )}
      </div>
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{item.customer} &middot; {item.date} &middot; {item.location}</span>
        <span className="font-semibold text-gray-900 pr-2">Budget: {item.budget}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400 border-b border-gray-100 pb-3">
        <span>{item.po}</span>
        <span className="px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 uppercase">{item.tier}</span>
      </div>
      <div className="mt-2 pt-2">
        <Progress12Steps currentStep={item.step} />
      </div>
    </div>
  );
"""

# Let's cleanly replace the renderRequestCard and renderActiveCard functions.
text = re.sub(r'const renderRequestCard.*?(?=const renderActiveCard)', '', text, flags=re.DOTALL)
text = re.sub(r'const renderActiveCard.*?(?=const activeOrders)', new_styles, text, flags=re.DOTALL)


# Step 2: The overview page needs re-ordering:
# Incoming request -> Recent Chats -> Recent Alerts -> Active Jobs
# We also have to delete old redundant active jobs (which maybe are mapped from activeOrders)
# We also need to change recent chats to "PO-3a68-12e3 just be paid by customer..."

new_right_col = """{/* RIGHT COLUMN: Main content feeds */}
        <div className="lg:col-span-2 space-y-6">
          
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">Incoming Requests</h2>
                <span className="text-gray-500 font-bold text-sm">{REQUESTS_MOCK.filter(m => !mockPayments[m.id]).length}</span>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("requests")}>View All</button>
            </div>
            <div>
              {REQUESTS_MOCK.slice(0, 3).map(m => renderRequestCard(m))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">Recent Incoming Chats <span className="text-xs text-sky-600 cursor-pointer" onClick={() => setActiveTab("chat")}>View All</span></h3>
                <div className="space-y-4">
                  <div className="bg-sky-50 rounded-lg p-3 border border-sky-100">
                    <p className="text-sm font-bold text-gray-700 mb-1">System <span className="text-xs text-gray-400 font-normal float-right">Just now</span></p>
                    <p className="text-xs text-sky-800">PO-3a68-12e3 just be paid by customer to notify to proceed and let both meet.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">Recent Alerts <span className="text-xs text-sky-600 cursor-pointer" onClick={() => setActiveTab("alerts")}>View All</span></h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 text-sm text-gray-700"><div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0"></div><p>Partner notified to review job with PO and detail, to confirm meeting.</p></div>
                  <div className="flex items-start gap-3 text-sm text-gray-700"><div className="w-2 h-2 mt-1.5 rounded-full bg-amber-500 flex-shrink-0"></div><p>Partner to review variation order and complete.</p></div>
                </div>
              </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-4 mt-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">⏰ Upcoming Meetings</h2>
                <span className="text-gray-500 font-bold text-sm">1</span>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700">View All</button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mt-4">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-gray-900 font-bold">FITOUT (PO-3a68-12e3)</span>
                 <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">Tomorrow, 10:00 AM</span>
              </div>
              <p className="text-sm text-gray-600">Location: Saphansong | Provider: Suppadesh</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4 mt-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">Active Jobs</h2>
                <span className="text-gray-500 font-bold text-sm">{ACTIVE_MOCK.length}</span>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("active")}>View All</button>
            </div>
            <div>
              {ACTIVE_MOCK.map((m, i) => renderActiveCard(m, i))}
            </div>
          </div>
        </div>"""

text = re.sub(r'\{\/\* RIGHT COLUMN: Main content feeds \*\/\}.*?(?=\{waitModalOrder &&)', new_right_col + '\n      </div>\n', text, flags=re.DOTALL)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
print("Dashboard overview patched!")
