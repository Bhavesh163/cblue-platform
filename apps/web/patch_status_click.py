import re

with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    "const handleOrderClick = (o: any) => { if (['MATCHING', 'CREATED'].includes(o.status))",
    "const handleOrderClick = (o: any) => { if (o.status && ['MATCHING', 'CREATED'].includes(o.status.toUpperCase()))"
)
text = text.replace(
    "{o.description?.toUpperCase().includes('TIER:ECONOMY') ? 'ECONOMY' : o.description?.includes('TIER:Standard') ? 'Standard' : (o.tier || 'Standard')}",
    "{o.description?.toUpperCase().includes('TIER:ECONOMY') ? 'ECONOMY' : o.description?.toUpperCase().includes('TIER:STANDARD') ? 'Standard' : (o.tier || 'Standard')}"
)

with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
    
with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text2 = f.read()

text2 = text2.replace(
    "const handleJobClick = (job: any) => { if (['MATCHING', 'CREATED'].includes(job.status))",
    "const handleJobClick = (job: any) => { if (job.status && ['MATCHING', 'CREATED'].includes(job.status.toUpperCase()))"
)

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text2)
