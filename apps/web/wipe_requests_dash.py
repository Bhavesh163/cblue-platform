import re
with open("app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

# Delete RequestsTab component
text = re.sub(r'/\* ===== REQUESTS TAB ===== \*/(.|\n)*?\n\}', '', text)
text = text.replace('{activeTab === "requests" && (', '')

with open("app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
