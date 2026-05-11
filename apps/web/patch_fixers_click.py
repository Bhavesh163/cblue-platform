import re

with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Remove requests pill
text = re.sub(r'\{ id: "requests"[^\}]+\},', '', text)

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
