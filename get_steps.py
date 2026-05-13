import re
with open("apps/web/app/[locale]/components/FixerResults.tsx", "r") as f:
    text = f.read()

# Let's search for "Progress" or the 12-step mapping
idx = text.find('STEPS = [')
if idx != -1:
    print(text[idx-100:idx+2000])

