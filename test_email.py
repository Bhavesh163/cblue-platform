import re

with open("backend/src/modules/subscription/subscription.service.ts", "r", encoding="utf-8") as f:
    text = f.read()

m = re.search(r"try \{\s*const response = await fetch\('https://api\.mailjet\.com.*?\}\s*catch", text, re.DOTALL)
if m:
    print(m.group(0)[:1500])

