const fs = require('fs');

let code = fs.readFileSync('apps/web/app/[locale]/dashboard/page.tsx', 'utf8');

// Update Customer Dashboard logged in state to exactly match the requested Mock UI structure

const newCustomerDashboard = `
/* ===== DASHBOARD LOGGED IN STATE ===== */
function CustomerDashboard({ locale, subscriber, prefix, onLogout }: { locale: string; subscriber: any; prefix: string; onLogout: () => void }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pb-12 -mt-6">
      
      {/* Top Navigation Pills */}
      <div className="flex gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 overflow-x-auto no-scrollbar">
        {[
          { icon: "📊", label: "Overview", count: null, active: true },
          { icon: "🔧", label: "Active Jobs", count: 4, active: false },
          { icon: "📋", label: "Requests", count: 3, active: false },
          { icon: "🏢", label: "Properties", count: 3, active: false },
          { icon: "📜", label: "History", count: null, active: false },
          { icon: "💬", label: "Chat", count: 4, active: false },
          { icon: "🔔", label: "Alerts", count: 4, active: false },
          { icon: "👤", label: "Profile", count: null, active: false },
        ].map((tab, i) => (
          <button key={i} className={\`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap \${tab.active ? 'bg-sky-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}\`}>
            <span>{tab.icon}</span> {tab.label}
            {tab.count && <span className={\`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold \${tab.active ? 'bg-white/30 text-white' : 'bg-red-100 text-red-700'}\`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Profile & Alerts */}
        <div className="space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full -z-0 opacity-50"></div>
            <div className="relative z-10 flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-2xl font-bold shadow-inner">
                {subscriber.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{subscriber.name}</h2>
                <p className="text-sm text-gray-500">{subscriber.email} &middot; {subscriber.phone || "0819852846"}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Active</p>
                <p className="text-lg font-bold text-gray-900 flex items-center gap-1">⚡ 4</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Completed</p>
                <p className="text-lg font-bold text-gray-900 flex items-center gap-1">✅ 5</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Messages</p>
                <p className="text-lg font-bold text-gray-900 flex items-center gap-1">💬 4</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Satisfaction</p>
                <p className="text-lg font-bold text-gray-900 flex items-center gap-1">🏆 4.8 ⭐</p>
              </div>
            </div>
            <button onClick={onLogout} className="w-full py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-bold rounded-lg transition">
              {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出登录" : "Logout"}
            </button>
          </div>

          {/* Upcoming Meetings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">⏰ Upcoming Meetings</h3>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏠</span>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Fixer-1042 &middot; Plumbing Repair</p>
                    <p className="text-xs text-sky-600 font-medium mt-0.5">Today at 2:00 PM</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded-md hover:bg-sky-200">Confirm</button>
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏢</span>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Lister-7890 &middot; Condo Viewing</p>
                    <p className="text-xs text-sky-600 font-medium mt-0.5">Apr 14, 2026 at 10:00 AM</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-sky-100 text-sky-700 text-xs font-bold rounded-md hover:bg-sky-200">Confirm</button>
              </div>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">🔔 Recent Alerts</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-3">
                <span className="w-2 h-2 mt-1.5 rounded-full bg-sky-500 flex-shrink-0"></span>
                <div>
                  <p className="text-sm text-gray-800">Fixer-1042 is on the way to your location</p>
                  <p className="text-xs text-gray-400 mt-1">5m ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-2 h-2 mt-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                <div>
                  <p className="text-sm text-gray-800">Payment for Architect Consult confirmed</p>
                  <p className="text-xs text-gray-400 mt-1">1h ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-2 h-2 mt-1.5 rounded-full bg-purple-500 flex-shrink-0"></span>
                <div>
                  <p className="text-sm text-gray-800">Property viewing confirmed for Apr 14</p>
                  <p className="text-xs text-gray-400 mt-1">3h ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Ratings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/50">
              <h3 className="font-bold text-amber-900 flex items-center gap-2">⭐ Pending Ratings</h3>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div className="flex-1">
                  <p className="font-bold text-sm text-gray-900">Fixer-0921 &middot; Electrical Service</p>
                  <p className="text-xs text-gray-500 mt-0.5 mb-2">Completed Mar 15, 2026</p>
                  <div className="flex gap-1 text-2xl text-gray-300 hover:text-amber-400 cursor-pointer transition-colors">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Main content feeds */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Services */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">ACTIVE ⚡ Active Services</h2>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">4</span>
            </div>
            <div className="divide-y divide-gray-50">
              
              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shadow-sm">🏠</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Plumbing Repair <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Standard</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Fixer-1042 &middot; 2026-04-10</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">In Progress</span>
                  <button className="text-gray-400 hover:text-sky-600 transition"><span className="text-xl">💬</span></button>
                </div>
              </div>

              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl shadow-sm">👔</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Architect Consult <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Corporate</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Pro-3087 &middot; 2026-04-12</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Confirmed</span>
                  <button className="text-gray-400 hover:text-sky-600 transition"><span className="text-xl">💬</span></button>
                </div>
              </div>

              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl shadow-sm">💼</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Smart Home Setup <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Specialist</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Team-5512 &middot; 2026-04-15</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Deposit Pending</span>
                  <button className="text-gray-400 hover:text-sky-600 transition"><span className="text-xl">💬</span></button>
                </div>
              </div>

              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-2xl shadow-sm">🏢</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Condo Viewing <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Upper</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Lister-7890 &middot; 2026-04-14</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Confirmed</span>
                  <button className="text-gray-400 hover:text-sky-600 transition"><span className="text-xl">💬</span></button>
                </div>
              </div>

            </div>
          </div>

          {/* Recent Chats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">💬 Recent Chats</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { id: "1042", name: "Fixer-1042", svc: "Plumbing", msg: "On my way, ETA 15 min", time: "5m ago", unread: 2 },
                { id: "3087", name: "Pro-3087", svc: "Architect", msg: "I've prepared the design draft", time: "2h ago", unread: 0 },
                { id: "5512", name: "Team-5512", svc: "Smart Home", msg: "Waiting for your confirmation", time: "1d ago", unread: 1 },
                { id: "7890", name: "Lister-7890", svc: "Property", msg: "Condo available for viewing Saturday", time: "3h ago", unread: 1 },
              ].map(c => (
                <div key={c.id} className={\`p-4 flex items-center gap-4 cursor-pointer transition \${c.unread ? 'bg-sky-50/30 hover:bg-sky-50' : 'hover:bg-gray-50'}\`}>
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 relative">
                    {c.id}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className="font-bold text-gray-900 text-sm">{c.name} <span className="text-gray-400 font-normal">&middot; {c.svc}</span></p>
                      <span className="text-xs text-gray-400">{c.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={\`text-sm \${c.unread ? 'font-semibold text-gray-900' : 'text-gray-500'}\`}>{c.msg}</p>
                      {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">{c.unread}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent History */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">📜 Recent History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Service</th>
                    <th className="px-6 py-3 font-semibold">Fixer / Pro</th>
                    <th className="px-6 py-3 font-semibold">Tier</th>
                    <th className="px-6 py-3 font-semibold">Rating</th>
                    <th className="px-6 py-3 font-semibold">Fee</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-900">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium flex items-center gap-2">🏠 Electrical</td>
                    <td className="px-6 py-4">Fixer-0921</td>
                    <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">Economy</span></td>
                    <td className="px-6 py-4 font-bold text-amber-500">4.8 ⭐</td>
                    <td className="px-6 py-4">฿100</td>
                    <td className="px-6 py-4 text-gray-500">2026-03-15</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium flex items-center gap-2">💼 Website Dev</td>
                    <td className="px-6 py-4">Team-4401</td>
                    <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">Corporate</span></td>
                    <td className="px-6 py-4 font-bold text-amber-500">4.9 ⭐</td>
                    <td className="px-6 py-4">฿600</td>
                    <td className="px-6 py-4 text-gray-500">2026-03-01</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium flex items-center gap-2">👔 Lawyer</td>
                    <td className="px-6 py-4">Pro-1100</td>
                    <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">Expert</span></td>
                    <td className="px-6 py-4 font-bold text-amber-500">5 ⭐</td>
                    <td className="px-6 py-4">฿1,000</td>
                    <td className="px-6 py-4 text-gray-500">2026-02-10</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
`;

code = code.replace(/\{\/\* Main Content \*\/\}([\s\S]*?)(?=\{\/\* Tier Comparison \*\/})/, `
        {/* Main Content */}
        {subscriber && !loading && (
          <CustomerDashboard locale={locale} subscriber={subscriber} prefix={prefix} onLogout={() => {
            localStorage.removeItem("subscriber"); 
            localStorage.removeItem("subscriber_token"); 
            localStorage.removeItem("pdpa_consent_customer"); 
            router.push(prefix);
          }} />
        )}
`);

code = code + '\n\n' + newCustomerDashboard + '\n';
fs.writeFileSync('apps/web/app/[locale]/dashboard/page.tsx', code);
