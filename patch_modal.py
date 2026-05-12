import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

old_budget = "฿{waitModalOrder.estimatedPrice || 'N/A'}"
new_budget = "฿{waitModalOrder.budget || waitModalOrder.estimatedPrice || waitModalOrder.finalPrice || '0'}"
text = text.replace(old_budget, new_budget)

with open("apps/web/app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

