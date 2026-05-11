import re
with open("app/[locale]/fixers/page.tsx", "r") as f:
    text = f.read()

text = text.replace(
    "['MATCHING', 'CREATED', 'PENDING'].includes(job.status?.toUpperCase())",
    "['MATCHING', 'CREATED', 'PENDING'].includes(job.status?.trim()?.toUpperCase())"
)

text = text.replace(
    "['MATCHING', 'CREATED', 'PENDING'].includes(o.status?.toUpperCase())",
    "['MATCHING', 'CREATED', 'PENDING'].includes(o.status?.trim()?.toUpperCase())"
)

text = text.replace(
    "['MATCHING', 'CREATED', 'PENDING'].includes(req.status?.toUpperCase())",
    "['MATCHING', 'CREATED', 'PENDING'].includes(req.status?.trim()?.toUpperCase())"
)

with open("app/[locale]/fixers/page.tsx", "w") as f:
    f.write(text)
