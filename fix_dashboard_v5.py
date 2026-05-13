import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Add Recent History at the end of the overview Right Column
history_block = """          <div>
            <div className="flex justify-between items-center mb-4 mt-6">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800">Recent History</h2>
              </div>
              <button className="text-sm font-bold text-sky-600 hover:text-sky-700" onClick={() => setActiveTab("history")}>View All</button>
            </div>
            <div className="divide-y divide-gray-50 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4">
              {historyOrders.slice(0, 3).length === 0 ? (
                <div className="p-8 text-center text-gray-500">No history found.</div>
              ) : (
                historyOrders.slice(0, 3).map((o: any, i: number) => (
                  <div key={i} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shadow-sm"></div>
                      <div>
                        <h3 className="font-bold text-gray-900">{o.service}</h3>
                        <p className="text-sm text-gray-500 mt-1">{o.fixerName || 'Partner'} &middot; {new Date(o.createdAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-gray-900">{o.fee || '฿0'}</span>
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded-full">{o.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>"""

# Find the end of the Right Column block
active_jobs_block = r'(<div>\s*<div className="flex justify-between items-center mb-4 mt-6">\s*<div className="flex flex-col">\s*<h2 className="text-xl font-bold text-gray-800">Active Jobs.*?\{ACTIVE_MOCK\.map\(\(m, i\) => renderActiveCard\(m, i\)\)\}\s*</div>\s*</div>)'
new_active_jobs_block = r'\1\n\n' + history_block

text = re.sub(active_jobs_block, new_active_jobs_block, text, flags=re.DOTALL)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Added History!")
