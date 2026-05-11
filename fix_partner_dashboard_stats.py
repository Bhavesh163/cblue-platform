import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r") as f:
    text = f.read()

# Replace hardcoded mappings in mappedOrders
text = text.replace(
    '''    date: new Date(o.createdAt).toLocaleDateString(),
    tier: "Standard",
    status: o.status,''',
    '''    date: new Date(o.createdAt).toLocaleDateString(),
    description: o.description || "",
    tier: (o.description || "").includes('TIER:') ? (o.description || "").split('TIER:')[1].split(' |')[0] : "Standard",
    status: o.status,'''
)

# Replace the markup display for incomingJobs
text = text.replace(
    '</p>\n                <p className="text-xs text-gray-500">{req.customer} &middot; {req.date} &middot; {locale === "th" ? "งบ" : locale === "zh" ? "预算" : "Budget"}: {req.budget}</p>\n              </div>',
    '</p>\n                <p className="text-xs text-gray-500">{req.customer} &middot; {req.date} &middot; {locale === "th" ? "งบ" : locale === "zh" ? "预算" : "Budget"}: {req.fee}</p>\n                <p className="text-xs text-gray-500 mt-1" style={{ whiteSpace: "pre-wrap" }}>{req.description}</p>\n              </div>'
)

with open("apps/web/app/[locale]/fixers/page.tsx", "w") as f:
    f.write(text)
