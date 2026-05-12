import re
import os

fpath = 'apps/web/app/[locale]/dashboard/page.tsx'
with open(fpath, 'r') as f:
    content = f.read()

# Replace the simple line: `<p className="text-sm text-gray-500 mt-1">{o.fixerName || 'Awaiting Partner'} &middot; {new Date(o.createdAt || Date.now()).toLocaleDateString()}</p>`
# with a more robust one that adds budget and PO PO-2605-xxxx

replacement = """<p className="text-sm text-gray-500 mt-1 mb-2">
                          <span className="font-semibold text-gray-700">{o.fixerName || 'Awaiting Partner'}</span>
                        </p>
                        <div className="bg-white rounded p-2 text-xs border space-y-1 mb-2">
                           <div className="flex justify-between font-mono"><span className="text-gray-400">PO:</span> <span className="font-semibold">PO-2605-{o.id ? o.id.slice(0, 4) : 'xxxx'}</span></div>
                           <div className="flex justify-between"><span className="text-gray-400">Service:</span> <span className="font-semibold truncate">{o.serviceCategory || o.serviceTh || 'General'}</span></div>
                           <div className="flex justify-between"><span className="text-gray-400">Est. Cost:</span> <span className="font-semibold text-amber-600">฿{o.estimatedPrice || 'N/A'}</span></div>
                        </div>"""

status_replace = """<span className="font-bold text-xs uppercase tracking-wide bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {o.status === 'ASSIGNED' ? 'PENDING PAYMENT' : o.status}
                        </span>"""


# Replace the p tag
content = re.sub(r'<p className="text-sm text-gray-500 mt-1">\{o.fixerName \|\| \x27Awaiting Partner\x27\} \&middot; \{new Date\(o\.createdAt \|\| Date\.now\(\)\)\.toLocaleDateString\(\)\}<\/p>', replacement, content)

# Replace the status span
content = re.sub(r'<span className="font-bold text-xs uppercase tracking-wide bg-blue-100 text-blue-800 px-2 py-1 rounded">\s*\{o.status\}\s*<\/span>', status_replace, content)

with open(fpath, 'w') as f:
    f.write(content)

