import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add state to CustomerDashboard
text = text.replace(
    'const activeOrders = orders ? orders',
    'const [waitModalOrder, setWaitModalOrder] = useState<any>(null);\n  const handleOrderClick = (o: any) => { if ([\'MATCHING\', \'CREATED\'].includes(o.status)) setWaitModalOrder(o); else window.location.href = `${prefix}/chat/${o.id}`; };\n  const activeOrders = orders ? orders'
)

# 2. Add handleOrderClick prop to all tabs that take activeOrders
text = text.replace('activeOrders={activeOrders}', 'activeOrders={activeOrders} onOrderClick={handleOrderClick}')
text = text.replace('activeOrders: any[]', 'activeOrders: any[]; onOrderClick?: (o: any) => void')

# 3. Replace all onClick routing with onOrderClick inside mapped lists
text = text.replace(
    'onClick={() => window.location.href = `${prefix}/chat/${o.id}`}',
    'onClick={() => onOrderClick ? onOrderClick(o) : window.location.href = `${prefix}/chat/${o.id}`}'
)

modal_jsx = """      {waitModalOrder && (
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
                <div className="flex justify-between"><span className="text-gray-500">Processing Fee</span><span className="font-bold text-gray-800">฿{waitModalOrder.description?.includes('TIER:Economy') ? '100' : waitModalOrder.description?.includes('TIER:Standard') ? '400' : '100'}</span></div>
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

# 4. Only replace the LAST occurrence of `    </div>\n  );\n}`
if "    </div>\n  );\n}" in text:
    parts = text.rsplit("    </div>\n  );\n}", 1)
    text = modal_jsx.join(parts)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Wait modal successfully patched.")
