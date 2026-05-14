import re

with open('apps/web/app/[locale]/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Close the grid early to make things full width
# The grid has:
# <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
#   <div className="lg:col-span-1 space-y-6"> <div className="bg-white ..."></div> <div className="bg-white ... pending ratings"></div> </div>
#   <div className="lg:col-span-2 space-y-6"> ...
# We want to change the <div className="lg:col-span-2 space-y-6"> to just start putting Chats/Alerts there, and then CLOSE the grid, and put Incoming Requests, Active Jobs, Recent History full width.

# Actually, the user says "move Recent Incoming Chats pill and recent alerts pill to above of incoming requests pill"
# And then "Active jobs: edit to let all 3 presented active jobs be in the same big pill... wider to the left"

chats_alerts_block = r'''          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">Recent Incoming Chats <span className="text-xs text-sky-600 cursor-pointer" onClick={() => setActiveTab("chat")}>View All</span></h3>
                <div className="space-y-4">
                  <div className="bg-sky-50 rounded-lg p-4 border border-sky-100 shadow-sm mt-3">
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">C</span> Fitout - PO-3a68-12e3 - ฿25,000,000 <span className="text-xs text-gray-400 font-normal ml-auto">Just now</span></p>
                    <p className="text-sm text-sky-800 font-medium">PO-3a68-12e3 just be paid by customer to notify to proceed and let both meet.</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">C</span> Fitout - PO-3a68-12e3 - ฿25,000,000 <span className="text-xs text-gray-400 font-normal ml-auto">2 mins ago</span></p>
                    <p className="text-sm text-gray-600">Please inform us of your available time to meet at the jobsite. The chat is now active for both to use for this project.</p>
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
          </div>'''

# The plan: I will manually extract the components and put them in order.
