import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's search inside the text for `PartnerOverview` function
start = text.find('function PartnerOverview')
end = text.find('function PartnerJobs', start)
overview_text = text[start:end] if end != -1 else text[start:]

with open('overview_dump.txt', 'w', encoding='utf-8') as f:
    f.write(overview_text)

