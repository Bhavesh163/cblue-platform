import os
import re

file_path = "apps/web/app/[locale]/fixers/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Accept PO fetch
old_fetch = """                    await fetch(`/api/v1/orders/${waitModalOrder.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify({ status: "CONFIRMED" })
                    });
                    window.location.reload();"""

new_fetch = """                    const res = await fetch(`/api/v1/orders/${waitModalOrder.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify({ status: "CONFIRMED" })
                    });
                    if (!res.ok) {
                        const errorText = await res.text();
                        console.error('Accept PO Error:', errorText);
                        alert(`Error accepting PO: ${res.status} - ${errorText}`);
                        return;
                    }
                    window.location.reload();"""

# Fix 2: Alert JSON
old_alert = 'else alert("No file attached");'
new_alert = 'else alert("No file attached. Order JSON: " + JSON.stringify(waitModalOrder));'

content = content.replace(old_fetch, new_fetch)
content = content.replace(old_alert, new_alert)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched Accept PO handler.")
