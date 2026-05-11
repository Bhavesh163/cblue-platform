import re

with open("apps/web/app/[locale]/components/FixerResults.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    'const hideVariation = !showVariation && step !== "variation";',
    'const hideVariation = false; // Always show variation to be strictly 12 steps'
)

with open("apps/web/app/[locale]/components/FixerResults.tsx", "w", encoding="utf-8") as f:
    f.write(text)

