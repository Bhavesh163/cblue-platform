import re

with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Fix error in unused PartnerDashboard 
text = text.replace("<PartnerJobs locale={locale} activeJobs={[...activeOrders, ...(orders || [])]} onJobClick={handleJobClick} />", "<PartnerJobs locale={locale} activeJobs={[...activeOrders, ...(orders || [])]} />")

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
