import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

new_modal = """{waitModalOrder && (
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
      )}"""

# Replace the modal
text = re.sub(r'\{waitModalOrder && \([\s\S]*?(?=\n\s*\}\s*</div>\s*\);\s*\}\s*$)', new_modal, text, flags=re.DOTALL)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
print("Updated modal!")
