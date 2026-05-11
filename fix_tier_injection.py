import re

with open("apps/web/app/[locale]/components/FixerResults.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    'description: `${poNumber} | ${description}`',
    'description: `${poNumber} | TIER:${typeof selectedFixer?.tier === "string" ? selectedFixer.tier.toUpperCase() : "STANDARD"} | ${description}`'
)

with open("apps/web/app/[locale]/components/FixerResults.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Tier injection fixed.")
