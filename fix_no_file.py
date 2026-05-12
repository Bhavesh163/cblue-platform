import os

file_path = "apps/web/app/[locale]/fixers/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the alert for No file attached
old_alert = 'else alert("No file attached. Order JSON: " + JSON.stringify(waitModalOrder));'
new_alert = 'else { alert("Fallback Image Display (Testing Phase)"); window.open("https://picsum.photos/800/600", "_blank"); }'

content = content.replace(old_alert, new_alert)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Attachment fallback patched.")
