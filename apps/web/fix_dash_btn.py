with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    'window.location.href = `${prefix}/dashboard`;',
    'window.location.href = `${prefix}/partner-zone`;'
)
text = text.replace(
    'Go to Our Customer Page',
    'Go to Our Partner Dashboard'
)

with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
