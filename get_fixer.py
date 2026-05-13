import re
with open("apps/web/app/[locale]/components/FixerResults.tsx", "r") as f:
    text = f.read()

m = re.search(r'(const steps\s*=.*?\];)', text, re.DOTALL)
if m:
    print(m.group(1))

m2 = re.search(r'<div className="mb-8">.*?</div>\n\s*</(div|React.Fragment)>', text, re.DOTALL)
if m2:
    print(m2.group(0)[:800])
