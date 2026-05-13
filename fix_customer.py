import re
import os

filepath = "apps/web/app/[locale]/dashboard/page.tsx"
if not os.path.exists(filepath):
    print("Dashboard not found")
else:
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()

    # The user wants dashboard/page.tsx to have same layout as fixers/page.tsx 
    # Let's just check what's currently in customer dashboard
    m = re.search(r"export default function CustomerDashboard[\s\S]*?\}", text)
    if not m:
        m = re.search(r"export default function[\s\S]*", text)
    if m:
        print(m.group(0)[:1500])
