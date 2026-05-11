import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Replace router.push with window.location.href or modal
# Need to add state: const [waitModalOrder, setWaitModalOrder] = useState<any>(null); inside CustomerDashboard
if "const [waitModalOrder, setWaitModalOrder]" not in text:
    text = text.replace(
        "function CustomerDashboard({ locale, subscriber, prefix, onLogout, orders }: { locale: string; subscriber: any; prefix: string; onLogout: () => void, orders: any[] }) {",
        "function CustomerDashboard({ locale, subscriber, prefix, onLogout, orders }: { locale: string; subscriber: any; prefix: string; onLogout: () => void, orders: any[] }) {\n  const [waitModalOrder, setWaitModalOrder] = useState<any>(null);"
    )

# Find where it renders active services
active_click_code = """onClick={() => window.location.href = `${prefix}/chat/${o.id}`}"""
new_active_click_code = """onClick={() => {
                      if (o.status === 'MATCHING' || o.status === 'CREATED') {
                        setWaitModalOrder(o);
                      } else {
                        window.location.href = `${prefix}/chat/${o.id}`;
                      }
                    }}"""
text = text.replace(active_click_code, new_active_click_code)

# Add modal JSX at the end of CustomerDashboard
modal_jsx = """
      {waitModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-2 text-sm font-semibold text-sky-600 bg-sky-50 inline-block px-3 py-1 rounded-full">Step 4 of 11</div>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">Waiting for Partner Confirmation</h2>
            <p className="text-gray-500 mt-2">We've notified {waitModalOrder.fixerName || 'the partner'} about your booking. They will review and confirm shortly.</p>
            
            <div className="mt-6 flex flex-col items-center">
              <span className="inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sky-600 font-bold mb-6">Waiting for confirmation...</p>
              
              <div className="w-full bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-left">
                <div className="flex justify-between"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-gray-800">PO-2605-{waitModalOrder.id.slice(0, 4)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Processing Fee</span><span className="font-bold text-gray-800">฿{waitModalOrder.description?.includes('TIER:Economy') ? '100' : waitModalOrder.description?.includes('TIER:Standard') ? '400' : '฿...'}</span></div>
              </div>
            </div>

            <div className="bg-amber-50 text-amber-800 text-xs p-4 rounded-xl mt-6">
              The final service price is negotiated directly between you and the service provider. CBLUE acts only as a matching platform and does not determine or guarantee final pricing. The processing fee is non-refundable as the matching service is completed once the customer initiates the process.
            </div>

            <button 
              onClick={() => setWaitModalOrder(null)} 
              className="mt-6 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}"""

# Need to replace the last lines of CustomerDashboard to insert the modal
text = text.replace("    </div>\n  );\n}\n", modal_jsx)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Wait modal patched.")
