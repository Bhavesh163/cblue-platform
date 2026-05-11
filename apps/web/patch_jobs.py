with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Replace "Active Services" text in pills and headings
text = text.replace("Active Services", "Active Jobs")

with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
