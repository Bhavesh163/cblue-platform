import re

dashboard_path = "apps/web/app/[locale]/dashboard/page.tsx"
with open(dashboard_path, "r", encoding="utf-8") as f:
    d_content = f.read()

d_content = d_content.replace("{ ...(token ? { Authorization: `Bearer ${token}` } : {}) }", "{ Authorization: `Bearer ${localStorage.getItem('subscriber_token')}` }")
with open(dashboard_path, "w", encoding="utf-8") as f:
    f.write(d_content)

fixers_path = "apps/web/app/[locale]/fixers/page.tsx"
with open(fixers_path, "r", encoding="utf-8") as f:
    f_content = f.read()

f_content = f_content.replace("{ ...(token ? { Authorization: `Bearer ${token}` } : {}) }", "{ Authorization: `Bearer ${localStorage.getItem('subscriber_token')}` }")
with open(fixers_path, "w", encoding="utf-8") as f:
    f.write(f_content)

print("Fixed token scope variable.")
