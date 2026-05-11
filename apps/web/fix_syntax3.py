import re

with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(r'[\'MATCHING\', \'CREATED\']', "['MATCHING', 'CREATED']")

with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

