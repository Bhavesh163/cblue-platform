with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

bad = "const handleOrderClick = (o: any) => { if (o.status && ['MATCHING', 'CREATED', 'PENDING'].includes(o.status.trim().toUpperCase())) window.location.href = `${prefix}/booking/resume/${o.id}`;\n"
good = "const handleOrderClick = (o: any) => { if (o.status && ['MATCHING', 'CREATED', 'PENDING'].includes(o.status.trim().toUpperCase())) window.location.href = `${prefix}/booking/resume/${o.id}`; else window.location.href = `${prefix}/chat/${o.id}`; };\n"

text = text.replace(bad, good)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
