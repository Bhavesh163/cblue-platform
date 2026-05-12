import re

with open("apps/web/app/[locale]/components/FixerResults.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Make step 4/5 advance naturally or fix the condition
print("Found step 4?", "step === 4" in text)
print("Found step 5?", "step === 5" in text)

