import re
with open("app/[locale]/fixers/page.tsx", "r") as f:
    text = f.read()

# Delete PartnerRequests component
text = re.sub(r'/\* ===== PARTNER REQUESTS ===== \*/(.|\n)*?\n\}', '', text)
text = text.replace('{activeTab === "requests" && <PartnerRequests locale={locale} incomingJobs={incomingJobs} />}', '')

with open("app/[locale]/fixers/page.tsx", "w") as f:
    f.write(text)
