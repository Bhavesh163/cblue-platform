import re

with open("dashboard_original.tsx", "r") as f:
    content = f.read()

# Replace activeTab definition to include "requests"
content = re.sub(
    r'const \[activeTab, setActiveTab\] = useState<\s*"overview"\|"profile"\|"active"\|"properties"\|"history"\|"chat"\|"alerts"\s*>\("overview"\);',
    'const [activeTab, setActiveTab] = useState<"overview"|"requests"|"profile"|"active"|"properties"|"history"|"chat"|"alerts">("overview");',
    content
)

# Add Requests tab to nav
tabs_old = """        {[
          { key: "overview", icon: "", label: locale === "th" ? "ภาพรวม" : "Overview", count: null },
          { key: "active", icon: "", label: locale === "th" ? "งานที่กำลังดำเนินการ" : "Active Jobs", count: activeOrders.length || null },
          { key: "properties", icon: "", label: locale === "th" ? "อสังหาริมทรัพย์" : "Properties", count: propertiesCount || null },
          { key: "history", icon: "", label: locale === "th" ? "ประวัติ" : "History", count: historyOrders.length || null },
          { key: "chat", icon: "", label: locale === "th" ? "แชท" : "Chat", count: null },
          { key: "alerts", icon: "", label: locale === "th" ? "การแจ้งเตือน" : "Alerts", count: null },
          { key: "profile", icon: "", label: locale === "th" ? "โปรไฟล์" : "Profile", count: null },
        ]"""
tabs_new = """        {[
          { key: "overview", icon: "", label: locale === "th" ? "ภาพรวม" : "Overview", count: null },
          { key: "requests", icon: "", label: locale === "th" ? "คำขอของคุณ" : "Requests", count: 2 },
          { key: "active", icon: "", label: locale === "th" ? "งานที่กำลังดำเนินการ" : "Active Jobs", count: 2 },
          { key: "properties", icon: "", label: locale === "th" ? "อสังหาริมทรัพย์" : "Properties", count: propertiesCount || null },
          { key: "history", icon: "", label: locale === "th" ? "ประวัติ" : "History", count: historyOrders.length || null },
          { key: "chat", icon: "", label: locale === "th" ? "แชท" : "Chat", count: null },
          { key: "alerts", icon: "", label: locale === "th" ? "การแจ้งเตือน" : "Alerts", count: null },
          { key: "profile", icon: "", label: locale === "th" ? "โปรไฟล์" : "Profile", count: null },
        ]"""
content = content.replace(tabs_old, tabs_new)

# Card definitions
cards_code = """
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
          <button className="text-sm bg-sky-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-sky-700 w-full" onClick={() => window.location.href=`${prefix}/booking/resume/mock_job`}>TRACK PROGRESS(Step {item.step})</button>
        )}
      </div>
    </div>
  );
"""

# overview html
overview_html = """
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Incoming Requests</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {REQUESTS_MOCK.map(m => renderMockCard(m, true))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <h2 className="text-xl font-bold text-gray-800 mb-4">Active Jobs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ACTIVE_MOCK.map(m => renderMockCard(m, false))}
              </div>
            </div>
            
            <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Need a fix?</h3>
                <p className="text-sm text-gray-600 mt-1">Book a fixer or a project team easily with C-Blue platform.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => window.location.href=`${prefix}/booking?type=fixer`} className="bg-white text-sky-600 border-2 border-sky-600 px-6 py-2 rounded-full font-bold hover:bg-sky-50 transition">Book a Fixer</button>
                <button onClick={() => window.location.href=`${prefix}/booking?type=project`} className="bg-sky-600 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-sky-700 transition lg:block hidden">Book Project Team</button>
              </div>
            </div>
          </div>
        )}
"""

# tabs contents switch
content = content.replace("const waitModalOrder = null; // Removed from this mock", "")

# insert cards mock right inside CustomerDashboard
content = re.sub(r'(function CustomerDashboard\(\{.*\}\s*\{)', r'\1\n' + cards_code, content)

# update overview tab content
content = re.sub(r'\{activeTab === \'overview\' && \(\s*<div className="space-y-6">.*?(?=\{activeTab === \'active\')', overview_html, content, flags=re.DOTALL)

# define request tab content
requests_tab = """
        {activeTab === 'requests' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6 uppercase">Incoming Requests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REQUESTS_MOCK.map(m => (
                <div key={m.title} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg uppercase mb-2">{m.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{m.desc}</p>
                    <div className="mb-4 bg-sky-50 rounded p-3">
                       <p className="text-xs text-sky-800 font-bold mb-1 pl-1">Payment Requested</p>
                       <p className="text-xl text-sky-900 font-bold pl-1">฿1,500.00</p>
                    </div>
                  </div>
                  <button className="bg-sky-600 w-full text-white px-4 py-2 rounded-lg font-bold hover:bg-sky-700" onClick={() => setWaitModalOrder({ id: 'mock', status: 'MATCHING', request: m })}>Pay Fee &rarr;</button>
                </div>
              ))}
            </div>
          </div>
        )}
"""

active_jobs_replacement = """
        {activeTab === 'active' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-6 uppercase">Active Jobs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ACTIVE_MOCK.map(m => renderMockCard(m, false))}
            </div>
          </div>
        )}
"""

# insert request tab
content = content.replace("{activeTab === 'active' && (", requests_tab + active_jobs_replacement)
content = re.sub(r'\{activeTab === \'active\' && \(\s*<div>.*?\{activeTab === \'properties\'', "{activeTab === 'properties'", content, flags=re.DOTALL)

# The mock active card handles active requests, remove the rest of the old activeTab='active' block

with open("dashboard_original.tsx", "w") as f:
    f.write(content)
