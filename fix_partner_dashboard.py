import re
with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update TabKey type definition
text = re.sub(
    r'type TabKey = "overview" \| "active" ',
    'type TabKey = "overview" | "requests" | "active" ',
    text
)

# 2. Add 'Requests' to tabs array
text = re.sub(
    r'\{ key: "active", label: locale === "th" \? "งานปัจจุบัน" : locale === "zh" \? "当前工作" : "Active Jobs", icon: "", badge: 0 \},',
    '{ key: "requests", label: locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "Requests", icon: "", badge: 0 },\n    { key: "active", label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "当前工作" : "Active Jobs", icon: "", badge: 0 },',
    text
)

# 3. Add 'Requests' tab logic (basically copy the incoming requests map but unbounded)
# But wait, we can just replace the 'active' tab logic to be read-only and write 'requests' tab.
# Let's inspect the file where `activeTab === "active"` starts.

