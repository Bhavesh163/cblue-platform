import re
with open("apps/web/app/[locale]/partner-zone/page.tsx", "r") as f:
    text = f.read()

# Grab JobsTab component
idx = text.find('function JobsTab')
if idx != -1:
    print(text[idx:idx+3500])
