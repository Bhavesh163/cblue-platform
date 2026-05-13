import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

# 1. Navigation Pill
old_nav = """        {[
          { key: "overview", icon: "", label: locale === "th" ? "ภาพรวม" : "Overview", count: null },
          { key: "active", icon: "", label: locale === "th" ? "งานที่ใช้งานอยู่" : "Active Jobs", count: activeOrders.length || null },"""

new_nav = """        {[
          { key: "overview", icon: "", label: locale === "th" ? "ภาพรวม" : "Overview", count: null },
          { key: "requests", icon: "", label: locale === "th" ? "คำขอของคุณ" : "Requests", count: 2 },
          { key: "active", icon: "", label: locale === "th" ? "งานที่ใช้งานอยู่" : "Active Jobs", count: 2 },"""

text = text.replace(old_nav, new_nav)

# 2. Mock Data Injection
mock_data = """
  // MOCK CARDS
  const REQUESTS_MOCK = [
    { title: "GREEN CONSTRUCTION", icon: "🏢", type: "FITOUT", date: "FEB 13 2025", desc: "Eco-friendly materials, sustainable lighting." },
    { title: "KITCHEN UPGRADE", icon: "🛠️", type: "RENOVATION", date: "JAN 20 2025", desc: "Modernize kitchen with new cabinets and island." }
  ];
  const ACTIVE_MOCK = [
    { title: "SOLAR ROOF INITIATIVE", icon: "☀️", type: "INSTALLATION", date: "MAR 01 2025", desc: "Installing 10kW solar system on main roof.", step: 6 },
    { title: "PLUMBING OVERHAUL", icon: "🚰", type: "MAINTENANCE", date: "MAR 15 2025", desc: "Full replacement of old brass pipes.", step: 2 }
  ];

  const renderMockCard = (item: any, isRequest: boolean) => (
    <div key={item.title} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center text-2xl font-bold">
            {item.icon}
          </div>
          <span className="text-xs font-bold text-gray-400">{item.date}</span>
        </div>
        <div className="flex gap-2 items-center mb-2">
          <h3 className="font-bold text-gray-800 text-lg uppercase">{item.title}</h3>
          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded font-bold">{item.type}</span>
        </div>
        <p className="text-sm text-gray-600 mb-4 h-10 overflow-hidden line-clamp-2">{item.desc}</p>
      </div>
      <div className="pt-4 border-t border-gray-50 mt-auto flex justify-between items-center">
        {isRequest ? (
          <button className="text-sm text-sky-600 font-bold hover:text-sky-700 flex items-center gap-1" onClick={() => setActiveTab("requests")}>VIEW DETAILS &rarr;</button>
        ) : (
          <button className="text-sm bg-sky-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-sky-700 w-full" onClick={() => window.location.href=`${prefix}/booking/resume/mock_job`}>TRACK PROGRESS (Step {item.step})</button>
        )}
      </div>
    </div>
  );
"""

text = re.sub(r'(const handleOrderClick = .*?;)', r'\1\n' + mock_data.replace('\\', '\\\\'), text)

# 3. Active Tab Replacement
old_active_tab = r'\{activeTab === "active" && \(.*?\}\s*\)\s*\}\s*</div>\s*</div>\s*\)\}'

new_active_tab = """{activeTab === "requests" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Incoming Requests</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REQUESTS_MOCK.map(m => (
                <div key={m.title} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg uppercase mb-2">{m.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{m.desc}</p>
                    <div className="mb-4 bg-sky-50 rounded p-3 border border-sky-100">
                       <p className="text-xs text-sky-800 font-bold mb-1 pl-1">Payment Requested</p>
                       <p className="text-xl text-sky-900 font-bold pl-1 font-mono">฿1,500.00</p>
                    </div>
                  </div>
                  <button className="bg-sky-600 w-full text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-sky-700 transition" onClick={() => setWaitModalOrder({ id: 'mock', status: 'MATCHING', request: m })}>Pay Fee &rarr;</button>
                </div>
              ))}
          </div>
        </div>
      )}

      {activeTab === "active" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">Active Jobs</h2>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{ACTIVE_MOCK.length}</span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACTIVE_MOCK.map(m => renderMockCard(m, false))}
          </div>
        </div>
      )}"""

text = re.sub(old_active_tab, new_active_tab, text, flags=re.DOTALL)

# 4. Right Column Overview Injection
right_col_marker = """        {/* RIGHT COLUMN: Main content feeds */}
        <div className="lg:col-span-2 space-y-6">"""

right_col_injection = """        {/* RIGHT COLUMN: Main content feeds */}
        <div className="lg:col-span-2 space-y-6">
          
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Incoming Requests</h2>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("requests")}>View All</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REQUESTS_MOCK.map(m => renderMockCard(m, true))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4 mt-6">
              <h2 className="text-xl font-bold text-gray-800">Active Jobs</h2>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("active")}>View All</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ACTIVE_MOCK.map(m => renderMockCard(m, false))}
            </div>
          </div>
"""

text = text.replace(right_col_marker, right_col_injection)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
print("Pached successfully!")
