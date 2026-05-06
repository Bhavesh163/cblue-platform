import re

file_path = "apps/web/app/[locale]/fixers/register/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Make KYC mandatory again for edits
old_str = "if (!isEditMode && kycImages.length === 0) {"
new_str = "if (kycImages.length === 0) {"

if old_str in content:
    content = content.replace(old_str, new_str)
    print("Patched kyc mandatory successfully!")
else:
    print("Failed to patch kyc mandatory")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
