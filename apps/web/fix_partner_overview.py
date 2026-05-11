import re
with open("app/[locale]/fixers/page.tsx", "r") as f:
    text = f.read()

# Add sections to PartnerOverview
new_sections = """      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Recent Alerts</h2>
          </div>
          <div className="p-6 text-center text-sm text-gray-500">No recent alerts.</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Pending Ratings</h2>
          </div>
          <div className="p-6 text-center text-sm text-gray-500">No pending ratings.</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Recent Chats</h2>
          </div>
          <div className="p-6 text-center text-sm text-gray-500">No recent chats.</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Recent History</h2>
            <span className="text-xs text-purple-600 font-bold cursor-pointer hover:underline">View All →</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-4">Service</th>
                  <th className="py-2 px-4">Customer</th>
                  <th className="py-2 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {completedJobs.slice(0, 3).length > 0 ? completedJobs.slice(0, 3).map((h) => (
                  <tr key={h.id} className="border-b border-gray-50">
                    <td className="py-3 px-4 font-medium">{h.service}</td>
                    <td className="py-3 px-4 text-gray-600">{h.customer}</td>
                    <td className="py-3 px-4 text-gray-500">{h.date}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">No completed jobs yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
"""

text = re.sub(
    r'      </div>\n    </div>\n  \);\n\}\n\n/\* ===== PARTNER JOBS \(Active\) ===== \*/',
    new_sections + '\n\n/* ===== PARTNER JOBS (Active) ===== */',
    text
)

with open("app/[locale]/fixers/page.tsx", "w") as f:
    f.write(text)
