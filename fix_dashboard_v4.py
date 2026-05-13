import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update hardcoded Recent Incoming Chats (Step 3.6 - System to CBlue)
chats_snippet = r'<div className="bg-sky-50 rounded-lg p-3 border border-sky-100">\s*<p className="text-sm font-bold text-gray-700 mb-1">System <span className="text-xs text-gray-400 font-normal float-right">Just now</span></p>\s*<p className="text-xs text-sky-800">PO-3a68-12e3 just be paid by customer to notify to proceed and let both meet.</p>\s*</div>'
new_chats_snippet = """<div className="bg-sky-50 rounded-lg p-4 border border-sky-100 shadow-sm mt-3">
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">C</span> Cblue <span className="text-xs text-gray-400 font-normal ml-auto">Just now</span></p>
                    <p className="text-sm text-sky-800 font-medium">PO-3a68-12e3 just be paid by customer to notify to proceed and let both meet.</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">C</span> Cblue <span className="text-xs text-gray-400 font-normal ml-auto">2 mins ago</span></p>
                    <p className="text-sm text-gray-600">Please inform us of your available time to meet at the jobsite. The chat is now active for both to use for this project.</p>
                  </div>"""

text = re.sub(chats_snippet, new_chats_snippet, text)

# 2. Update Modal popup (WaitModalOrder)
modal_old = r'\{waitModalOrder && \([\s\S]*?\n\s*\}\s*</div>\s*\);\s*\}\s*$'
modal_new = """{waitModalOrder && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-20">
          <div className="w-full max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-xl flex flex-col p-6 sm:p-10 relative">
            <h2 className="font-bold text-xl text-center mb-6">Paying fee & Notification to Proceed</h2>
            <Progress12Steps currentStep={5} />
            
            <div className="mt-8 flex flex-col items-center max-w-md mx-auto">
              
              <div className="w-full bg-gray-50 rounded-xl p-5 space-y-3 text-sm text-left shadow-sm">
                <div className="flex justify-between border-b border-gray-200 pb-2"><span className="text-gray-500">Service Provider</span><span className="font-bold text-gray-800">Suppadesh</span></div>
                <div className="flex justify-between border-b border-gray-200 pb-2"><span className="text-gray-500">Type of Service</span><span className="font-bold text-gray-800">Fit out</span></div>
                <div className="flex justify-between border-b border-gray-200 pb-2"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-sky-700">PO-3a68-12e3</span></div>
                <div className="flex justify-between border-b border-gray-200 pb-2"><span className="text-gray-500">Budget</span><span className="font-bold text-gray-800">฿25,000,000</span></div>
                <div className="flex justify-between pt-1"><span className="text-gray-500">Processing Fee</span><span className="font-bold text-amber-600">฿100</span></div>
              </div>

              <div className="bg-sky-50 border border-sky-100 text-sky-800 text-sm p-4 rounded-xl mt-6 text-center shadow-sm w-full">
                <strong>Good news!</strong> The service provider has accepted the PO.<br/>Please pay the processing fee and notify to proceed.
              </div>

              <div className="bg-amber-50 border border-amber-100 text-amber-800 text-xs p-4 rounded-xl mt-4 w-full text-center shadow-sm">
                The final service price is negotiated directly between you and the service provider. CBLUE acts only as a matching platform and does not determine or guarantee final pricing. The processing fee is non-refundable as the matching service is completed once the customer initiates the process.
              </div>

              <div className="flex gap-4 w-full mt-6">
                <button 
                  onClick={() => setWaitModalOrder(null)} 
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-6 py-3 bg-sky-100 border border-sky-300 text-sky-800 font-bold rounded-xl shadow-sm hover:bg-sky-200 transition"
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
        </div>
      )}
    </div>
  );
}"""

text = re.sub(modal_old, modal_new, text)

# 3. Update Chat Tab (Step 3.6) 
chat_tab_old = r'\{activeTab === "chat" && \([\s\S]*?\n\s*\)\}\s*\{activeTab === "alerts"'
chat_tab_new = """{activeTab === "chat" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Chat</h2>
          </div>
          <div className="divide-y divide-gray-50">
            <Link href={`${prefix}/chat/PO-3a68-12e3`} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold text-white">
                  C
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Cblue</h3>
                  <p className="text-sm text-sky-600 mt-1 font-medium">PO-3a68-12e3 just be paid by customer to notify to proceed and let both meet.</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400">Just now</span>
              </div>
            </Link>
          </div>
        </div>
      )}

      {activeTab === "alerts\""""

text = re.sub(chat_tab_old, chat_tab_new, text)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Patched UI 4!")
