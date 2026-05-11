import re

with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. State for modal at top of component
if "const [waitModalOrder, setWaitModalOrder] = useState<any>(null);" not in text:
    text = text.replace(
        "const [orders, setOrders] = useState<any[]>([]);",
        "const [orders, setOrders] = useState<any[]>([]);\n  const [waitModalOrder, setWaitModalOrder] = useState<any>(null);"
    )

# 2. Add PO Modal logic near bottom of FixerProPage
# Need to find the end of FixerProPage. It ends with:
#       {showPdpa && ( <PdpaConsent ... /> )}
#     </div>
#   );
# }

modal_code = """
      {/* PO Accept/Decline Modal */}
      {waitModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="mb-2 text-sm font-semibold text-purple-600 bg-purple-50 inline-block px-3 py-1 rounded-full">Step 5 of 12</div>
              <button onClick={() => setWaitModalOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">Waiting for Partner Confirmation</h2>
            <p className="text-gray-500 mt-2">Customer has placed a request for {waitModalOrder.service}. Please review the PO details below and confirm.</p>
            
            <div className="w-full bg-gray-50 rounded-xl p-5 mt-6 space-y-3 text-sm text-left border border-gray-100 shadow-inner">
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-gray-800">PO-2605-{waitModalOrder.id.slice(0, 4) if waitModalOrder.id else '9605'}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Customer</span><span className="font-bold text-gray-800">{waitModalOrder.customer || waitModalOrder.customerAlias || 'Customer'}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Budget</span><span className="font-bold text-amber-600">฿{waitModalOrder.estimatedPrice || 'N/A'}</span></div>
              <div className="flex flex-col gap-1 pb-2"><span className="text-gray-500">Project Details</span><span className="font-bold text-gray-800 bg-white p-2 rounded border border-gray-100">{waitModalOrder.description || waitModalOrder.service}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Uploaded Files</span><span className="font-semibold text-sky-600 cursor-pointer hover:underline">0 files attached</span></div>
            </div>

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => { setWaitModalOrder(null); window.alert('PO Accepted! Notification sent to customer.'); }} 
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow-md"
              >
                Accept PO
              </button>
              <button 
                onClick={() => setWaitModalOrder(null)} 
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
"""

if "PO Accept/Decline Modal" not in text:
    text = text.replace(
        "      {showPdpa && (",
        modal_code + "\n      {showPdpa && ("
    )


# 3. Patch PartnerJobs component signature to take onJobClick
text = text.replace(
    'function PartnerJobs({ locale, activeJobs }: { locale: string; activeJobs: any[] }) {',
    'function PartnerJobs({ locale, activeJobs, onJobClick }: { locale: string; activeJobs: any[]; onJobClick?: (job: any) => void; }) {'
)
text = text.replace(
    '{activeTab === "active" && <PartnerJobs locale={locale} activeJobs={activeOrders} />}',
    '{activeTab === "active" && <PartnerJobs locale={locale} activeJobs={[...activeOrders, ...requestOrders]} onJobClick={setWaitModalOrder} />}'
)
text = text.replace(
    '<div key={job.id} className="p-6 hover:bg-gray-50/50 transition">',
    '<div key={job.id} className="p-6 hover:bg-purple-50 transition cursor-pointer" onClick={() => onJobClick && onJobClick(job)}>'
)

# 4. Patch Overview active jobs to take onJobClick
text = text.replace(
    '<div key={req.id} className={`p-6 transition ${req.urgency === "urgent" ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-gray-50/50"}`}>',
    '<div key={req.id} className={`p-6 transition cursor-pointer ${req.urgency === "urgent" ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-purple-50"}`} onClick={() => setWaitModalOrder(req)}>'
)

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
