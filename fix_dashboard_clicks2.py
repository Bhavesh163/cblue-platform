import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

# Replace router.push with window.location.href
text = text.replace(
    'onClick={() => router.push(`${prefix}/chat/${o.id}`)}',
    'onClick={() => window.location.href = `${prefix}/chat/${o.id}`}'
)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
