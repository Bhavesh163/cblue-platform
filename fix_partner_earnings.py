import re
with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Add standard aesthetic 14-month grid
start = text.find('Monthly Earnings')
if start != -1:
    print(text[start:start+400])

