import re
with open("app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

# Replace handleOrderClick
text = re.sub(
    r"const handleOrderClick = \(o: any\) => \{ if \(o\.status && \['MATCHING', 'CREATED', 'PENDING'\]\.includes\(o\.status\.toUpperCase\(\)\)\) setWaitModalOrder\(o\); else window\.location\.href = `\$\{prefix\}/chat/\$\{o\.id\}`; \};",
    r"const handleOrderClick = (o: any) => { if (o.status && ['MATCHING', 'CREATED', 'PENDING'].includes(o.status.toUpperCase())) window.location.href = `${prefix}/booking/resume/${o.id}`; else window.location.href = `${prefix}/chat/${o.id}`; };",
    text
)
with open("app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
