import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Let's inspect the active jobs mapping inside the component
m = re.search(r"function PartnerActiveJobs[\s\S]*?function", text)
if m:
    print("PartnerActiveJobs found")

