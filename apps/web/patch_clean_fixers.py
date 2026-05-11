import re

with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Add state inside FixerProPage
text = text.replace(
    'const [orders, setOrders] = useState<any[]>([]);',
    'const [orders, setOrders] = useState<any[]>([]);\n  const [waitModalOrder, setWaitModalOrder] = useState<any>(null);'
)

# 2. Add Modal inside FixerProPage just before `{showPdpa...`
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
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-gray-800">PO-2605-{waitModalOrder.id ? waitModalOrder.id.slice(0, 4) : '9605'}</span></div>
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
text = text.replace(
    '      {showPdpa && (',
    modal_code + '\n      {showPdpa && ('
)


# 3. Remove Requests Tab from `tabs` map in `FixerProPage`
text = re.sub(
    r'\{\s*key:\s*"requests",\s*label:[^}]+icon:\s*"",\s*badge:\s*0\s*\},',
    '',
    text
)

# 4. In FixerProPage, update usage of PartnerJobs to include incomingJobs and onJobClick
text = text.replace(
    '{activeTab === "active" && <PartnerJobs locale={locale} activeJobs={activeJobs} />}',
    '{activeTab === "active" && <PartnerJobs locale={locale} activeJobs={[...activeJobs, ...incomingJobs]} onJobClick={setWaitModalOrder} />}'
)
text = re.sub(
    r'\{activeTab === "requests" && <PartnerRequests locale={locale} incomingJobs=\{incomingJobs\} />\}',
    '',
    text
)

# 5. Make PartnerJobs component accept onJobClick
text = text.replace(
    'function PartnerJobs({ locale, activeJobs }: { locale: string; activeJobs: any[] }) {',
    'function PartnerJobs({ locale, activeJobs, onJobClick }: { locale: string; activeJobs: any[]; onJobClick?: (job: any) => void; }) {'
)

# 6. Click handler on PartnerJobs mapping
text = text.replace(
    '<div key={job.id} className="p-6 hover:bg-gray-50/50 transition">',
    '<div key={job.id} className="p-6 hover:bg-purple-50 transition cursor-pointer" onClick={() => onJobClick && onJobClick(job)}>'
)

# 7. Also in PartnerOverview, patch the active jobs div
text = text.replace(
    '<div key={o.id} className="px-6 py-4 flex items-center gap-4 border-b border-gray-50 hover:bg-purple-50/50 transition cursor-pointer">',
    '<div key={o.id} className="px-6 py-4 flex items-center gap-4 border-b border-gray-50 hover:bg-purple-50 transition cursor-pointer" onClick={() => (window as any).setWaitModalOrderGlobal && (window as any).setWaitModalOrderGlobal(o)}>'
)
# Wait, we can't easily pass it down to PartnerOverview without altering signature. 
# But wait, we can alter the signature of `PartnerOverview`.
text = text.replace(
    'function PartnerOverview({ locale, partner, activeJobs, incomingJobs, completedJobs, earnings, stats, notifications }: {',
    'function PartnerOverview({ locale, partner, activeJobs, incomingJobs, completedJobs, earnings, stats, notifications, onJobClick }: {'
)
text = text.replace(
    ' earnings: any[]; stats: any; notifications: any[] }) {',
    ' earnings: any[]; stats: any; notifications: any[]; onJobClick?: (job: any) => void; }) {'
)
text = text.replace(
    '<PartnerOverview locale={locale} partner={partner} activeJobs={activeJobs} incomingJobs={incomingJobs} completedJobs={completedJobs} earnings={[]} stats={stats} notifications={notifications} />',
    '<PartnerOverview locale={locale} partner={partner} activeJobs={activeJobs} incomingJobs={incomingJobs} completedJobs={completedJobs} earnings={[]} stats={stats} notifications={notifications} onJobClick={setWaitModalOrder} />'
)
text = text.replace(
    '<div key={o.id} className="px-6 py-4 flex items-center gap-4 border-b border-gray-50 hover:bg-purple-50/50 transition cursor-pointer">',
    '<div key={o.id} className="px-6 py-4 flex items-center gap-4 border-b border-gray-50 hover:bg-purple-50 transition cursor-pointer" onClick={() => onJobClick && onJobClick(o)}>'
)
text = text.replace(
    '<div key={req.id} className="px-6 py-4 flex items-center gap-4 hover:bg-amber-50/30 transition">',
    '<div key={req.id} className="px-6 py-4 flex items-center gap-4 hover:bg-amber-50 transition cursor-pointer" onClick={() => onJobClick && onJobClick(req)}>'
)

# 8. Hide/Remove the "Incoming Requests" section from PartnerOverview
text = re.sub(
    r'\{/\* Incoming Requests Preview \*/\}[\s\S]*?(?=\{/\* Weekly Performance \*/\})',
    '',
    text
)

# 9. Duplicate PartnerDashboard and etc component removals: 
# The user might be logging in through their dashboard which could use PartnerDashboard.
# I will aggressively replace `Requests` in PartnerDashboard map as well just in case.
text = re.sub(
    r'\{\s*key:\s*"requests",\s*icon:\s*"",\s*label:\s*"Requests"[^\}]+\},',
    '',
    text
)
text = re.sub(
    r'\{activeTab === "requests" && <PartnerRequests[^>]+\/>\}',
    '',
    text
)
text = text.replace(
    '{activeTab === "active" && <PartnerJobs locale={locale} activeJobs={activeOrders} />}',
    '{activeTab === "active" && <PartnerJobs locale={locale} activeJobs={[...activeOrders, ...(orders || [])]} onJobClick={setWaitModalOrder} />}'
)


with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
