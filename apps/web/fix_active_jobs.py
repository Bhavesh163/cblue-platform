with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    "const activeJobs = mappedOrders.filter(o => !['COMPLETED', 'CANCELLED', 'CREATED', 'PENDING'].includes(o.status));",
    "const activeJobs = mappedOrders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));"
)

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

