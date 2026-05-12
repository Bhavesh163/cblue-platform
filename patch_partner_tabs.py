import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove duplicate "requests" tab (keep only one)
text = re.sub(
    r'(\{ key: "requests", label: locale === "th" \? "คำขอใหม่" : locale === "zh" \? "新请求" : "Requests", icon: "📋", badge: 4 \},\s*)\{ key: "requests",[^\n]+\n',
    r'\1',
    text
)

# Replace "ASSIGNED" with "ACCEPTED" in local status constants
text = text.replace('"ASSIGNED": { en: "Assigned", th: "จ่ายงานแล้ว", zh: "已分配" }', '"ASSIGNED": { en: "Accepted", th: "รับงานแล้ว", zh: "已接受" }')

with open('apps/web/app/[locale]/fixers/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
