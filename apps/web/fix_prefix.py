with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    'window.location.href = `${prefix}/chat/${job.id}`',
    'window.location.href = `/${locale}/chat/${job.id}`'
)

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
