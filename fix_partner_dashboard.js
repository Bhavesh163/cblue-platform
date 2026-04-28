const fs = require('fs');

let code = fs.readFileSync('apps/web/app/[locale]/fixers/page.tsx', 'utf8');

// Replace partner dashboard layout with requested layout

const newPartnerDashboard = `
/* ===== DASHBOARD LOGGED IN STATE ===== */
function PartnerDashboard({ locale, partner, prefix, onLogout }: { locale: string; partner: any; prefix: string; onLogout: () => void }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pb-12 -mt-6">
      
      {/* Top Navigation Pills */}
      <div className="flex gap-2 bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 overflow-x-auto no-scrollbar">
        {[
          { icon: "📊", label: "Overview", count: null, active: true },
          { icon: "🔧", label: "Active Jobs", count: 3, active: false },
          { icon: "📋", label: "Requests", count: 3, active: false },
          { icon: "🏢", label: "Properties", count: null, active: false },
          { icon: "📜", label: "History", count: null, active: false },
          { icon: "💬", label: "Chat", count: 3, active: false },
          { icon: "🔔", label: "Alerts", count: 3, active: false },
          { icon: "👤", label: "Profile", count: null, active: false },
        ].map((tab, i) => (
          <button key={i} className={\`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap \${tab.active ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}\`}>
            <span>{tab.icon}</span> {tab.label}
            {tab.count && <span className={\`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold \${tab.active ? 'bg-white/30 text-white' : 'bg-red-100 text-red-700'}\`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Profile & Stats */}
        <div className="space-y-6">
          
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-0 opacity-50"></div>
            <div className="relative z-10 flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-2xl font-bold shadow-inner">
                {partner.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{partner.name}</h2>
                <p className="text-sm text-gray-500">{partner.email} &middot; {partner.phone || "0819852846"}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded">Active</span>
                  <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded">Corporate Tier</span>
                  <span className="text-xs bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded">KYC ✓</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Active Jobs</p>
                <p className="text-lg font-bold text-gray-900">3</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Completed</p>
                <p className="text-lg font-bold text-gray-900">47</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Rating</p>
                <p className="text-lg font-bold text-gray-900 text-amber-500">4.8 ⭐</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Response</p>
                <p className="text-lg font-bold text-green-600">96%</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Repeat Clients</p>
                <p className="text-lg font-bold text-gray-900">12</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium mb-1">Monthly Earn</p>
                <p className="text-lg font-bold text-sky-600">฿18,500</p>
              </div>
            </div>
            <button onClick={onLogout} className="w-full py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-bold rounded-lg transition">
              {locale === "th" ? "ออกจากระบบ" : locale === "zh" ? "退出登录" : "Logout"}
            </button>
          </div>

          {/* Monthly Earnings Chart (Simplified UI) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">💰 Monthly Earnings</h3>
              <span className="text-sky-600 font-bold text-sm">฿18,500 (Apr)</span>
            </div>
            <div className="p-5 flex items-end justify-between h-32">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-200 rounded-t-sm h-12 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿12.5k</span></div>
                <span className="text-xs font-bold text-gray-500">Jan</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-300 rounded-t-sm h-16 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿15.2k</span></div>
                <span className="text-xs font-bold text-gray-500">Feb</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-400 rounded-t-sm h-20 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿18.8k</span></div>
                <span className="text-xs font-bold text-gray-500">Mar</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 bg-sky-500 rounded-t-sm h-16 relative group"><span className="absolute -top-6 text-xs text-gray-400 font-medium hidden group-hover:block whitespace-nowrap bg-white px-1 shadow border rounded">฿18.5k</span></div>
                <span className="text-xs font-bold text-gray-900">Apr</span>
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
                <span className="w-2 h-2 mt-1.5 rounded-full bg-purple-500 flex-shrink-0"></span>
                <div>
                  <p className="text-sm text-gray-800 font-medium">Customer #A2X sent a new message</p>
                  <p className="text-xs text-gray-400 mt-1">2m ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-2 h-2 mt-1.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                <div>
                  <p className="text-sm text-gray-800">You have 3 new job requests</p>
                  <p className="text-xs text-gray-400 mt-1">15m ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="w-2 h-2 mt-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                <div>
                  <p className="text-sm text-gray-800">Payment of ฿3,200 received</p>
                  <p className="text-xs text-gray-400 mt-1">1h ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Jobs & Requests */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Jobs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">🔧 Active Jobs</h2>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">3</span>
            </div>
            <div className="divide-y divide-gray-50">
              
              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer border-l-4 border-sky-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl shadow-sm">🔧</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Plumbing Repair <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Standard</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Customer #A2X &middot; 2026-04-15</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">In Progress</span>
                  <span className="font-bold text-gray-900">฿2,500</span>
                </div>
              </div>

              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer border-l-4 border-emerald-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl shadow-sm">🔧</div>
                  <div>
                    <h3 className="font-bold text-gray-900">AC Maintenance <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Corporate</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Customer #B7K &middot; 2026-04-16</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Confirmed</span>
                  <span className="font-bold text-gray-900">฿4,000</span>
                </div>
              </div>

              <div className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer border-l-4 border-amber-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl shadow-sm">🔧</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Electrical Wiring <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Economy</span></h3>
                    <p className="text-sm text-gray-500 mt-1">Customer #C4M &middot; 2026-04-17</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Pending</span>
                  <span className="font-bold text-gray-900">฿1,800</span>
                </div>
              </div>

            </div>
          </div>

          {/* Incoming Requests */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-amber-50/30">
              <h2 className="font-bold text-amber-900 flex items-center gap-2">📋 Incoming Requests</h2>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">3</span>
            </div>
            <div className="divide-y divide-gray-50">
              
              <div className="p-6 hover:bg-gray-50 transition cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shadow-sm">📋</div>
                    <div>
                      <h3 className="font-bold text-gray-900">Interior Design <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Specialist</span></h3>
                      <p className="text-sm text-gray-500 mt-1">Customer #D9P &middot; 2026-04-18</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="font-bold text-gray-900">฿15,000</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end border-t border-gray-100 pt-4">
                  <button className="px-6 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition">Decline</button>
                  <button className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition">Accept</button>
                </div>
              </div>

              <div className="p-6 hover:bg-gray-50 transition cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shadow-sm relative">
                      📋
                      <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">Urgent</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Landscaping <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Expert</span></h3>
                      <p className="text-sm text-gray-500 mt-1">Customer #E3R &middot; 2026-04-19</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="font-bold text-gray-900">฿25,000</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end border-t border-gray-100 pt-4">
                  <button className="px-6 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200 transition">Decline</button>
                  <button className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition">Accept</button>
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
                { id: "A2X", svc: "Plumbing", msg: "Thank you, waiting for you", time: "2m ago", unread: 2 },
                { id: "B7K", svc: "AC", msg: "Which day works for you?", time: "30m ago", unread: 1 },
                { id: "C4M", svc: "Electrical", msg: "Job is done, thanks!", time: "2h ago", unread: 0 },
              ].map(c => (
                <div key={c.id} className={\`p-4 flex items-center gap-4 cursor-pointer transition \${c.unread ? 'bg-purple-50/30 hover:bg-purple-50' : 'hover:bg-gray-50'}\`}>
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                    {c.id}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className="font-bold text-gray-900 text-sm">Customer #{c.id} <span className="text-gray-400 font-normal">&middot; {c.svc}</span></p>
                      <span className="text-xs text-gray-400">{c.time}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={\`text-sm \${c.unread ? 'font-semibold text-gray-900' : 'text-gray-500'}\`}>{c.msg}</p>
                      {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">{c.unread}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
`;

code = code.replace(/\{\/\* Main Content \*\/\}([\s\S]*?)(?=\{\/\* Registration Cards \*\/})/, `
        {/* Main Content */}
        {partner && isFixer && !loading && (
          <PartnerDashboard locale={locale} partner={partner} prefix={prefix} onLogout={() => {
            localStorage.removeItem("subscriber"); 
            localStorage.removeItem("subscriber_token"); 
            localStorage.removeItem("pdpa_consent_partner"); 
            router.push(prefix);
          }} />
        )}
        <div className="my-10 border-t border-gray-200" />
`);

code = code + '\n\n' + newPartnerDashboard + '\n';
fs.writeFileSync('apps/web/app/[locale]/fixers/page.tsx', code);
