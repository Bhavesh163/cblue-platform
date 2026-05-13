import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

old_width = 'style={{ width: `${Math.min(100, Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100))}%` }}'
new_width = 'style={{ width: `${Math.min(100, Math.max(0, ((currentStep - 4) / (STEPS.length - 1)) * 100))}%` }}'

text = text.replace(old_width, new_width)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Patched Progress width")
