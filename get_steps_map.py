import re
with open("apps/web/app/[locale]/components/FixerResults.tsx", "r") as f:
    text = f.read()

# Grab whatever is around flowSteps
idx = text.find('flowSteps:')
if idx == -1: idx = text.find('flowSteps')
if idx != -1:
    print(text[idx:idx+1500])
