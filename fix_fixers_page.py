import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Make PartnerDashboard hold the state and pass it down or just render the modal here.
if "const [waitModalOrder, setWaitModalOrder] = useState<any>(null);" not in text:
    text = text.replace(
        'const [showPdpa, setShowPdpa] = useState(false);',
        'const [showPdpa, setShowPdpa] = useState(false);\n  const [waitModalOrder, setWaitModalOrder] = useState<any>(null);'
    )

# Add the modal JSX logic
modal_jsx = """
      {waitModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-2 text-sm font-semibold text-amber-600 bg-amber-50 inline-block px-3 py-1 rounded-full">Step 5 of 12 (Partner)</div>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">New PO Details</h2>
            <p className="text-gray-500 mt-2">Customer #{waitModalOrder.customerAlias || waitModalOrder.customerName || '1024'} has placed a new request.</p>
            
            <div className="mt-6 w-full bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-left">
              <div className="flex justify-between"><span className="text-gray-500">PO Number</span><span className="font-mono font-bold text-gray-800">PO-2605-{String(waitModalOrder.id).slice(0, 4)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Customer Budget</span><span className="font-bold text-gray-800">฿3,500</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Project Details</span><span className="font-bold text-gray-800">{waitModalOrder.description || waitModalOrder.service}</span></div>
            </div>

            <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center gap-3">
               <div className="w-10 h-10 bg-white shadow-sm rounded flex items-center justify-center text-gray-400">📄</div>
               <div>
                 <p className="text-sm font-bold text-gray-700">Project_Requirements.pdf</p>
                 <p className="text-xs text-gray-400">1.2 MB &middot; Uploaded by Customer</p>
               </div>
            </div>

            <button 
              onClick={() => { setWaitModalOrder(null); window.location.href = `${prefix}/chat/${waitModalOrder.id}`; }} 
              className="mt-6 w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition"
            >
              Open Chat to Confirm
            </button>
            <button 
              onClick={() => setWaitModalOrder(null)} 
              className="mt-2 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
"""
if "Step 5 of 12 (Partner)" not in text:
    text = text.replace(
        '  return (\n    <div className="min-h-screen bg-gray-50 pb-20">',
        '  return (\n    <div className="min-h-screen bg-gray-50 pb-20">' + modal_jsx
    )

# Fix onClick inactive
# Replace buttons inside OverviewTab / RequestsTab
text = re.sub(
    r'(<div key=\{[a-zA-Z\.]+\} className="(?:p-6 )?flex items-center gap-4 hover:bg-gray-50\/50 transition)">',
    r'\1 cursor-pointer" onClick={() => onOrderClick ? onOrderClick(o) : null}>',
    text
)
# Make onOrderClick pass through
text = text.replace(
    'orders={activeOrders} historyOrders={historyOrders}',
    'orders={activeOrders} historyOrders={historyOrders} onOrderClick={setWaitModalOrder}'
)
text = text.replace(
    'orders: any[]; historyOrders: any[]',
    'orders: any[]; historyOrders: any[]; onOrderClick?: (o: any) => void'
)

# And fix "Accept" mapped objects to also use onOrderClick
text = re.sub(
    r'onClick=\{[^\}]+\}\s+className="px-3 py-1 bg-green(?:[^\"]+)">[^<]+</button>',
    r'onClick={() => onOrderClick ? onOrderClick(req) : null} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">Accept</button>',
    text,
    flags=re.IGNORECASE
)
text = re.sub(
    r'onClick=\{[^\}]+\}\s+className="px-5 py-2 bg-green(?:[^\"]+)">[^<]+</button>',
    r'onClick={() => onOrderClick ? onOrderClick(req) : null} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">Accept</button>',
    text,
    flags=re.IGNORECASE
)
text = re.sub(
    r'<button className="px-6 py-2 bg-purple-600(?:[^\"]+)">Accept</button>',
    r'<button onClick={() => onOrderClick ? onOrderClick(o) : null} className="px-6 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition">Accept</button>',
    text,
    flags=re.IGNORECASE
)
text = re.sub(
    r'<button className="px-6 py-2 bg-amber-500(?:[^\"]+)">Accept</button>',
    r'<button onClick={() => onOrderClick ? onOrderClick(o) : null} className="px-6 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition shadow-sm">Accept</button>',
    text,
    flags=re.IGNORECASE
)

# Fix TIER
text = re.sub(
    r'\{req\.tier\}',
    r"{req.description?.includes('TIER:Economy') || req.tier === 'ECONOMY' ? 'ECONOMY' : req.description?.includes('TIER:Standard') ? 'Standard' : (req.tier || 'Standard')}",
    text
)
text = re.sub(
    r'\{o\.tier \|\| \'Standard\'\}',
    r"{o.description?.includes('TIER:Economy') || o.tier === 'ECONOMY' ? 'ECONOMY' : o.description?.includes('TIER:Standard') ? 'Standard' : (o.tier || 'Standard')}",
    text
)
text = re.sub(
    r'\{req\.tier \|\| \'Standard\'\}',
    r"{req.description?.includes('TIER:Economy') || req.tier === 'ECONOMY' ? 'ECONOMY' : req.description?.includes('TIER:Standard') ? 'Standard' : (req.tier || 'Standard')}",
    text
)

# Add clickable wrapper to rows
text = re.sub(
    r'(<div key=\{req\.id\} className="[^\"]+ hover:bg-gray-50\/50\s*")',
    r'\1 cursor-pointer" onClick={() => onOrderClick ? onOrderClick(req) : null}',
    text
)
text = re.sub(
    r'(<div key=\{[ai]\} className="[^\"]+ hover:bg-gray-50\s+transition")',
    r'\1 cursor-pointer" onClick={() => onOrderClick ? onOrderClick(o) : null}',
    text
)


with open("apps/web/app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
