import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update TabKey
text = re.sub(
    r'(type TabKey = "overview" \|) ("active")', 
    r'\1 "requests" | \2', 
    text
)

# 2. Add Requests Tab config
text = re.sub(
    r'\{ key: "active",',
    '{ key: "requests", label: locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "Requests", icon: "📋", badge: 4 },\n    { key: "active",',
    text
)

# 3. Rename "Assigned" styling and add PO for Partner Dashboard ACTIVE tab ONLY
active_job_pattern = r'(<span className="bg-sky-100/50 text-sky-700 border border-sky-200/50 text-xs px-2\.5 py-1 rounded-md font-semibold font-mono">)(.*?)(</span>)'
def replace_assigned(match):
    return '<span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-semibold whitespace-nowrap">{locale === "th" ? "รับงานแล้ว" : locale === "zh" ? "已接受" : "Accepted"}</span>'
text = re.sub(active_job_pattern, replace_assigned, text)

# Add PO and District
job_h3_pattern = r'(<h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">.*?</h3>)'
text = re.sub(
    job_h3_pattern,
    r'\1\n<div className="text-xs text-gray-500 mt-1">PO-{job.id.substring(0,6).toUpperCase()} | Budget: ฿1,200 | {job.location || "Bangkok"}</div>',
    text
)

with open('apps/web/app/[locale]/fixers/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

