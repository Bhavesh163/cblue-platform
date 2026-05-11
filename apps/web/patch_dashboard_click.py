import re

with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Fix 1: Add stopPropagation to chat link inside the active job cards
text = text.replace(
    "<Link href={`${prefix}/chat/${o.id}`} className=\"text-gray-400 hover:text-sky-600 transition\">",
    "<Link href={`${prefix}/chat/${o.id}`} className=\"text-gray-400 hover:text-sky-600 transition\" onClick={(e) => e.stopPropagation()}>"
)

# Fix 2: Remove Requests pill
text = re.sub(r'\{ id: "requests"[^\}]+\},', '', text)
text = re.sub(r'\{ id: "requests", label: locale === "th" \? "คำขอ" : locale === "zh" \? "请求" : "Requests", icon: "📋" \},', '', text)

with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
