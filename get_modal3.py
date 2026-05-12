import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

m = re.search(r"waitModalOrder &&\s*\(.*?<\/div>\s*<\/div>\s*\)", text, re.DOTALL)
if m:
    print(m.group(0)[1500:3000])

