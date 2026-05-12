import os

file_path = "apps/web/app/[locale]/fixers/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Accept PO fetch - add /status
old_fetch = "await fetch(`/api/v1/orders/${waitModalOrder.id}`"
new_fetch = "await fetch(`/api/v1/orders/${waitModalOrder.id}/status`"
content = content.replace(old_fetch, new_fetch)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched Accept PO handler.")
