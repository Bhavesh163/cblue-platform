import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

# Let's completely replace the MOCK definitions and rendering functions.
old_mock_block = re.search(r'// MOCK CARDS.*?(?=const activeOrders = orders \?)', text, re.DOTALL)
if not old_mock_block:
    print("Could not find the mock block!")
    exit(1)

new_mock_block = """  // MOCK CARDS
  const [mockPayments, setMockPayments] = useState<Record<string, boolean>>({});

  const REQUESTS_MOCK = [
    { 
      id: "req1",
      title: "REINSTATEMENT", 
      customer: "Suppadesh", 
      date: "5/11/2026", 
      budget: "฿5,000,000", 
      po: "PO-b01d-c200", 
      tier: "ECONOMY", 
      desc: "I want ................."
    },
    { 
      id: "req2",
      title: "FITOUT", 
      customer: "Suppadesh", 
      date: "5/11/2026", 
      budget: "฿25,000,000", 
      po: "PO-3a68-12e3", 
      tier: "STANDARD", 
      desc: "I want to have a project team to carry out a 1000 sq.m. office fitout in Bangkok"
    }
  ];

  const ACTIVE_MOCK = [
    { title: "REINSTATEMENT", customer: "Suppadesh", date: "5/11/2026", budget: "฿5,000,000", po: "PO-b01d-c200", location: "Saphansong", tier: "ECONOMY", actionNeeded: true, step: 6 },
    { title: "FITOUT", customer: "Suppadesh", date: "5/11/2026", budget: "฿25,000,000", po: "PO-0265-fa84", location: "Saphansong", tier: "Standard", actionNeeded: false, step: 6 },
    { title: "FITOUT", customer: "Suppadesh", date: "5/11/2026", budget: "฿25,000,000", po: "PO-3a68-12e3", location: "Saphansong", tier: "Standard", actionNeeded: true, step: 6 },
  ];

  const STEPS = ["Match", "Select", "PO", "Notify", "Confirm", "Pay", "Chat", "Meet", "Variation", "Complete", "Rate", "Done"];

  const Progress12Steps = ({ currentStep }: { currentStep: number }) => (
    <div className="w-full mt-4">
      <div className="flex justify-between items-center relative">
        <div className="absolute left-0 top-[40%] md:top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full"></div>
        <div className="absolute left-0 top-[40%] md:top-1/2 -translate-y-1/2 h-1 bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}></div>
        {STEPS.map((s, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum <= currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div key={s} className="relative z-10 flex flex-col items-center">
              <div className={`w-3 h-3 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[8px] md:text-xs font-bold ${isCompleted ? 'bg-sky-500 text-white' : isCurrent ? 'bg-white border-2 border-sky-500 text-sky-600' : 'bg-gray-200 text-gray-400'}`}>
                {isCompleted ? '✓' : ''}
              </div>
              <span className={`text-[8px] md:text-[10px] mt-1 hidden md:block ${isCurrent ? 'text-sky-700 font-bold' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`} style={{ whiteSpace: 'nowrap' }}>{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderRequestCard = (item: any) => {
    if (mockPayments[item.id]) return null; // hide if paid
    return (
      <div key={item.id} className="bg-white border border-gray-200 p-5 rounded-lg mb-4 flex flex-col gap-2 relative">
        <div className="text-sm font-bold text-sky-600">Step 6 of 12 Paying fee & Notification to Proceed &nbsp;|&nbsp; <span className="text-gray-900">{item.title}</span></div>
        <div className="text-sm text-gray-600">{item.customer} &middot; {item.date} &middot; Budget: {item.budget}</div>
        <div className="text-sm text-gray-500">{item.po} | TIER:{item.tier} | {item.desc}</div>
        <div><span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded font-bold uppercase">{item.tier}</span></div>
        <div className="flex gap-4 mt-3">
          <button className="bg-sky-600 outline-none text-white px-6 py-2 rounded font-bold hover:bg-sky-700 transition shadow-sm" onClick={() => setWaitModalOrder({ id: item.id, status: 'MATCHING', request: item })}>Paying fee</button>
          <button className="border border-gray-300 text-gray-600 px-6 py-2 outline-none rounded font-bold hover:bg-gray-100 transition shadow-sm">Decline</button>
        </div>
      </div>
    );
  };

  const renderActiveCard = (item: any, idx: number) => (
    <div key={idx} className="bg-white border border-gray-200 p-5 rounded-lg mb-4 flex flex-col gap-2">
      <div className="font-bold text-gray-900 text-lg">{item.title}</div>
      <div className="text-sm text-gray-600">{item.customer} &middot; {item.date} &middot; Budget: {item.budget} &middot; {item.po} | {item.location}</div>
      <div className="flex items-center gap-2">
        <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded font-bold uppercase">{item.tier}</span>
        {item.actionNeeded && <span className="text-red-500 text-xs font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>Action needed</span>}
      </div>
      <div className="mt-2 text-sky-600 text-sm font-bold opacity-0">...</div>
      <Progress12Steps currentStep={item.step} />
    </div>
  );

"""

text = text.replace(old_mock_block.group(0), new_mock_block)

# Let's fix the Requests and Active grids to not be grid, but just stacked
# For Active Jobs in 'requests' tab
req_tab_old = re.search(r'\{activeTab === "requests" && \(.*?</div>\s*</div>\s*\)', text, re.DOTALL)
req_tab_new = """{activeTab === "requests" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6 pb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Incoming Requests</h2>
            <div className="text-sm text-gray-500 font-bold">{REQUESTS_MOCK.filter(m => !mockPayments[m.id]).length}</div>
          </div>
          <div className="p-6">
              {REQUESTS_MOCK.map(m => renderRequestCard(m))}
          </div>
        </div>
      )"""
if req_tab_old:
    text = text.replace(req_tab_old.group(0), req_tab_new)

# For Active jobs in 'active' tab
act_tab_old = re.search(r'\{activeTab === "active" && \(.*?</div>\s*</div>\s*\)', text, re.DOTALL)
act_tab_new = """{activeTab === "active" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6 pb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col">
            <h2 className="font-bold text-gray-900">Active Jobs</h2>
            <span className="text-gray-500 text-sm font-bold">{ACTIVE_MOCK.length}</span>
          </div>
          <div className="px-6 pt-4">
            {ACTIVE_MOCK.map((m, i) => renderActiveCard(m, i))}
          </div>
        </div>
      )"""
if act_tab_old:
    text = text.replace(act_tab_old.group(0), act_tab_new)


# Now fix Right column Overview
right_col_old = re.search(r'\{\/\* RIGHT COLUMN: Main content feeds \*\/\}.*?<div className="grid grid-cols-1 md:grid-cols-2 gap-4">\s*\{ACTIVE_MOCK\.map\(m => renderMockCard\(m, false\)\)\}\s*</div>\s*</div>', text, re.DOTALL)
right_col_new = """{/* RIGHT COLUMN: Main content feeds */}
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
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">Recent Chats <span className="text-xs text-sky-600 cursor-pointer">View All</span></h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 bg-gray-200 rounded-full"></div><div><p className="text-sm font-bold text-gray-700">Fixer John</p><p className="text-xs text-gray-500">I will arrive at 10 AM.</p></div></div>
                  <div className="flex items-center gap-3"><div className="w-8 h-8 bg-gray-200 rounded-full"></div><div><p className="text-sm font-bold text-gray-700">Proj Manager</p><p className="text-xs text-gray-500">Material is delivered.</p></div></div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">Recent Alerts <span className="text-xs text-sky-600 cursor-pointer">View All</span></h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-gray-700"><div className="w-2 h-2 rounded-full bg-red-500"></div> Quote updated for KITCHEN UPGRADE</div>
                  <div className="flex items-center gap-3 text-sm text-gray-700"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Invoice #PO-2931 Paid</div>
                </div>
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
          </div>"""
if right_col_old:
    text = text.replace(right_col_old.group(0), right_col_new)

# Now fix the modal
modal_old = re.search(r'\{waitModalOrder && \(.*?\)\}', text, re.DOTALL)
modal_new = """{waitModalOrder && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-20">
          <div className="w-full max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-xl flex flex-col p-6 sm:p-10 relative">
            <h2 className="font-bold text-xl text-center mb-6">Step 6 of 12<br/>Paying fee & Notification to Proceed</h2>
            <Progress12Steps currentStep={6} />
            
            <div className="mt-8 flex flex-col items-center max-w-md mx-auto">
              <span className="inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sky-600 font-bold mb-6">Waiting for payment...</p>
              
              <div className="w-full bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-left">
                <div className="flex justify-between"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-gray-800">{waitModalOrder.request?.po || 'PO-SYS-202'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Processing Fee</span><span className="font-bold text-gray-800">฿100</span></div>
              </div>

              <div className="bg-amber-50 text-amber-800 text-xs p-4 rounded-xl mt-6">
                The final service price is negotiated directly between you and the service provider. CBLUE acts only as a matching platform and does not determine or guarantee final pricing. The processing fee is non-refundable as the matching service is completed once the customer initiates the process.
              </div>

              <button 
                onClick={() => setWaitModalOrder(null)} 
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition mt-4"
              >
                Cancel
              </button>
              <button
                className="mt-4 px-6 py-3 w-full bg-sky-100 border border-sky-300 text-sky-800 font-bold rounded-xl shadow-sm hover:bg-sky-200 transition"
                onClick={() => {
                  alert("Notification: Payment Complete! Notifying to proceed.");
                  setMockPayments(prev => ({...prev, [waitModalOrder.id]: true}));
                  setWaitModalOrder(null);
                }}
              >
                🚧 Testing Period Payment Pill 🚧
              </button>
            </div>
          </div>
        </div>
      )}"""

if modal_old:
    text = text.replace(modal_old.group(0), modal_new)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)

print("Updated script done!")
