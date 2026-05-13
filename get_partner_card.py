import re
with open("apps/web/app/[locale]/partner-zone/page.tsx", "r") as f:
    text = f.read()

# find renderActiveCard or similar
match = re.search(r'const renderJobCard\s*=\s*.*?return\s*\(.*?\);\s*\}', text, re.DOTALL)
if match:
    print("Found renderJobCard:")
    print(match.group(0))
else:
    # Just grab anything around "render"
    for m in re.finditer(r'const render.*?\{.*?(?:return|\}).*?\}', text, re.DOTALL):
         print("Found a render block:")
         print(m.group(0)[:500] + "...\n")
