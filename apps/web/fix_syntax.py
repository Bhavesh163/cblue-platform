import re

with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()
text = text.replace('null}">', 'null}>')
with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()
text = text.replace('null}">', 'null}>')
with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
