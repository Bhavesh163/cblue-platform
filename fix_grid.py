import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Make the Customer Overview Left Column wider (lg:col-span-2)
text = text.replace('<div className="space-y-6">', '<div className="space-y-6 lg:col-span-2">', 1)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

