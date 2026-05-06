import os

file_path = "apps/web/app/[locale]/lib/api.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Use relative API routing so CF Worker correctly forwards to backend
old_str = """  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "cblue.co.th" || host === "www.cblue.co.th") {
      return "https://api.cblue.co.th/api/v1";
    }
  }

  return "http://localhost:3002/api/v1";"""

new_str = """  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "cblue.co.th" || host === "www.cblue.co.th") {
      return "/api/v1";
    }
  }

  return "http://localhost:3002/api/v1";"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched api.ts successfully!")
else:
    print("Could not find patch target in api.ts")
