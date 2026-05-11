import os
import re

files_to_fix = [
    "apps/web/app/[locale]/booking/resume/[id]/page.tsx",
    "apps/web/app/[locale]/components/FixerResults.tsx",
    "apps/web/app/[locale]/fixers/page.tsx",
    "apps/web/app/[locale]/dashboard/page.tsx",
]

def add_auth_header(content):
    # Fix fetch(`/api/v1/...`) without headers
    content = re.sub(
        r'fetch\(`([^`]+\$\{id\}[^`]*)`\)',
        r'fetch(`\1`, { headers: { Authorization: `Bearer ${localStorage.getItem("subscriber_token")}` } })',
        content
    )
    content = re.sub(
        r'fetch\(`/api/v1/orders/\$\{initialOrderData\.id\}`\)',
        r'fetch(`/api/v1/orders/${initialOrderData.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("subscriber_token")}` } })',
        content
    )
    return content

for fp in files_to_fix:
    if os.path.exists(fp):
        with open(fp, "r", encoding="utf-8") as f:
            c = f.read()
        c2 = add_auth_header(c)
        with open(fp, "w", encoding="utf-8") as f:
            f.write(c2)
        if c != c2:
            print(f"Patched Authorization headers in {fp}")

print("Done")
