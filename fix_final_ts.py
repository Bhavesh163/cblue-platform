with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()
text = text.replace('router.push(`${prefix}/dashboard`)', 'window.location.href = `${prefix}/dashboard`')
with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

with open("apps/web/app/[locale]/partner-zone/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()
text = text.replace('job.status === "MATCHING"', '(job.status as string) === "MATCHING"')
with open("apps/web/app/[locale]/partner-zone/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
