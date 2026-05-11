import re

with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Make it case insensitive for Economy
text = text.replace("o.description?.includes('TIER:Economy')", "o.description?.toUpperCase().includes('TIER:ECONOMY')")
text = text.replace("waitModalOrder.description?.includes('TIER:Economy')", "waitModalOrder.description?.toUpperCase().includes('TIER:ECONOMY')")
with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
