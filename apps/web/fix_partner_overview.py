import re

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        orig = content

        # We will inject Recent Alerts and Recent History sections into PartnerOverview
        # Right after <PartnerActiveJobs .../>
        
        replacement = """\\1
        {/* Recent Alerts & History */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Recent Chats</h2>
              <button onClick={() => setActiveTab('chat')} className="text-xs text-sky-600 hover:text-sky-800">View All →</button>
            </div>
            <div className="text-gray-500 text-sm py-4 text-center">No recent chats.</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Recent Alerts</h2>
            </div>
            <div className="space-y-4">
              {orders && orders.length > 0 ? (
                orders.slice(0, 3).map((o: any, i: number) => (
                  <div key={i} className="flex gap-3 text-sm border-b border-gray-50 pb-2">
                    <span className="text-sky-500">🔵</span>
                    <div>
                      <p className="text-gray-800">New job request: <span className="font-semibold">{o.service}</span></p>
                      <p className="text-xs text-gray-400">Recently</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-sm py-4 text-center">No recent alerts.</div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 md:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Recent History</h2>
              <button onClick={() => setActiveTab('history')} className="text-xs text-sky-600 hover:text-sky-800">View All →</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="py-3 font-medium">Service</th>
                    <th className="py-3 font-medium">Customer</th>
                    <th className="py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-400">No completed jobs yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        """

        content = re.sub(
            r'(<PartnerActiveJobs[^>]+/>\n?\s*</div>\n?\s*</div>)', 
            replacement, 
            content
        )

        if content != orig:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed overview in {filepath}")
        else:
            print("Could not find PartnerActiveJobs injection point")
    except Exception as e:
        print(e)

fix_file('app/[locale]/fixers/page.tsx')
