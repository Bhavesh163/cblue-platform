import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

# We know the modal starts at `{waitModalOrder && (` and goes until the final `</div>\n  );\n}`
# But wait, there might be other things. Let's find the main wrapper `return (\n    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pb-12 -mt-6">`
# and just replace everything from `{waitModalOrder && (` to the end of the file.

match = re.search(r'\{waitModalOrder && \([\s\S]*\}\s*\)\s*\}\s*</div>\s*\);\s*\}', text)
if match:
    pass
else:
    print("Not found modal at end")

idx = text.rfind('{waitModalOrder && (')
if idx != -1:
    before = text[:idx]
    after = text[idx:]
    # Replace from idx to the end, except preserving the last  </div>\n  );\n}
    text = before + """{waitModalOrder && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-20">
          <div className="w-full max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-xl flex flex-col p-6 sm:p-10 relative">
            <h2 className="font-bold text-xl text-center mb-6">Step 6 of 12<br/>Paying fee & Notification to Proceed</h2>
            <Progress12Steps currentStep={6} />
            
            <div className="mt-8 flex flex-col items-center max-w-md mx-auto">
              <span className="inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sky-600 font-bold mb-6">Waiting for payment...</p>
              
              <div className="w-full bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-left">
                <div className="flex justify-between"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-gray-800">{waitModalOrder.request?.po || 'PO-SYS-202'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Processing Fee</span><span className="font-bold text-gray-800">฿100</span></div>
              </div>

              <div className="bg-amber-50 text-amber-800 text-xs p-4 rounded-xl mt-6">
                The final service price is negotiated directly between you and the service provider. CBLUE acts only as a matching platform and does not determine or guarantee final pricing. The processing fee is non-refundable as the matching service is completed once the customer initiates the process.
              </div>

              <button 
                onClick={() => setWaitModalOrder(null)} 
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition mt-4"
              >
                Cancel
              </button>
              <button
                className="mt-4 px-6 py-3 w-full bg-sky-100 border border-sky-300 text-sky-800 font-bold rounded-xl shadow-sm hover:bg-sky-200 transition"
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
      )}
    </div>
  );
}
"""
    with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
        f.write(text)
    print("Fixed modal")
else:
    print("waitModalOrder not found")

