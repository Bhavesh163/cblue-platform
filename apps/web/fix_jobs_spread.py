with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    '{activeTab === "active" && <PartnerJobs locale={locale} activeJobs={[...activeJobs, ...incomingJobs]} onJobClick={handleJobClick} />}',
    '{activeTab === "active" && <PartnerJobs locale={locale} activeJobs={activeJobs} onJobClick={handleJobClick} />}'
)

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

