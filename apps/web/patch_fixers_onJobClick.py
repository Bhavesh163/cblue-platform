import re

with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Add handleJobClick 
if "const handleJobClick" not in text:
    text = text.replace(
        "const [waitModalOrder, setWaitModalOrder] = useState<any>(null);",
        "const [waitModalOrder, setWaitModalOrder] = useState<any>(null);\n  const handleJobClick = (job: any) => { if (['MATCHING', 'CREATED'].includes(job.status)) setWaitModalOrder(job); else window.location.href = `${prefix}/chat/${job.id}`; };"
    )

# Replace onJobClick usage in PartnerJobs 
text = re.sub(r'onJobClick=\{\(\) => \{[^}]*\}\}', 'onJobClick={handleJobClick}', text)
text = re.sub(r'onJobClick=\{\(job\) => [^}]*\}', 'onJobClick={handleJobClick}', text)

# Just in case, add it directly to props
text = text.replace("<PartnerOverview locale={locale} stats={stats} subscriber={subscriber} />", "<PartnerOverview locale={locale} stats={stats} subscriber={subscriber} onJobClick={handleJobClick} />")
text = text.replace("<PartnerJobs locale={locale} jobs={orders} />", "<PartnerJobs locale={locale} jobs={orders} onJobClick={handleJobClick} />")

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
