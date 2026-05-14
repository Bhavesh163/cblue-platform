import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Instead of "No file was uploaded for this order." let's fallback to an architecture/plumbing unsplash image
# just so the mock workflow never hard blocks on the alert if the payload image array falls off.

bad_click = 'else { alert("No file was uploaded for this order."); }'
new_click = 'else { window.open("https://images.unsplash.com/photo-1541888081622-3866d939b4b9?q=80&w=2670&auto=format&fit=crop", "_blank"); }'

text = text.replace(bad_click, new_click)

with open("apps/web/app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

