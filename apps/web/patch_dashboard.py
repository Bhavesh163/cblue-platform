import re

with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Rename "Active Services" to "Active Jobs"
text = text.replace(">Active Services<", ">Active Jobs<")
text = text.replace("Active Services\n", "Active Jobs\n")

# Remove "Requests" from pills
text = re.sub(r'\{\s*id:\s*\'requests\',\s*label:\s*\'Requests\',\s*icon:\s*.*?\},', '', text, flags=re.DOTALL)

with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text2 = f.read()

# Remove "Requests" from partner pills
text2 = re.sub(r'\{\s*id:\s*\'requests\',\s*label:\s*\'Requests\',\s*icon:\s*.*?\},', '', text2, flags=re.DOTALL)

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text2)

