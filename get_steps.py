import re

with open("apps/web/app/[locale]/components/FixerResults.tsx", "r", encoding="utf-8") as f:
    text = f.read()

for i, step in enumerate(text.split("step ===")[1:], 1):
    print(f"--- STEP {i} ---")
    print(step[:500])

