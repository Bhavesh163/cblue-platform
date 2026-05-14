import re

with open('apps/web/app/[locale]/partner-zone/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('waitModalJob?.issueImage', '(waitModalJob as any)?.issueImage')

with open('apps/web/app/[locale]/partner-zone/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

