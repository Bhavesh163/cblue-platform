import re

with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

overview_additions = """
      {/* Added requested summary blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Recent Chats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">Recent Chats</h3>
          <div className="divide-y divide-gray-50">
             {activeJobs.filter((j: any) => !['PENDING','CREATED'].includes(j.status)).slice(0,3).map((job: any) => (
                <div key={job.id} onClick={(e) => { e.stopPropagation(); window.location.href=`/${locale}/chat/${job.id}`; }} className="flex justify-between items-center py-2 cursor-pointer hover:bg-gray-50 transition p-2 rounded">
                  <div>
                     <p className="font-bold text-sm">{job.service}</p>
                     <p className="text-xs text-gray-500">Check chat for updates</p>
                  </div>
                  <span className="text-xs text-sky-600 font-bold">Chat</span>
                </div>
             ))}
             {activeJobs.filter((j: any) => !['PENDING','CREATED'].includes(j.status)).length === 0 && <p className="text-sm text-gray-500 text-center py-4">No recent chats.</p>}
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">Recent Alerts</h3>
          <div className="divide-y divide-gray-50">
             {notifications.slice(0,3).map((n: any, i: number) => (
                <div key={i} className="py-2">
                  <p className="font-bold text-sm">{n.title || n.message}</p>
                  <p className="text-xs text-gray-500">{n.time || "Recently"}</p>
                </div>
             ))}
             {notifications.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No recent alerts.</p>}
          </div>
        </div>

        {/* Pending Ratings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">Pending Ratings</h3>
          <p className="text-sm text-gray-500 text-center py-4">No pending ratings.</p>
        </div>

        {/* Recent History */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">Recent History</h3>
          <div className="divide-y divide-gray-50">
             {completedJobs.slice(0,3).map((job: any) => (
                <div key={job.id} onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(job); }} className="flex justify-between items-center py-2 cursor-pointer hover:bg-gray-50 transition p-2 rounded">
                  <div>
                     <p className="font-bold text-sm">{job.service}</p>
                     <p className="text-xs text-gray-500 text-green-600">COMPLETED</p>
                  </div>
                  <span className="text-xs text-gray-500 font-bold">{new Date(job.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
             ))}
             {completedJobs.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No completed orders yet.</p>}
          </div>
        </div>
      </div>
"""

text = text.replace("    </div>\n  );\n}\n\n/* ===== PARTNER JOBS TAB ===== */", overview_additions + "\n    </div>\n  );\n}\n\n/* ===== PARTNER JOBS TAB ===== */")

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
