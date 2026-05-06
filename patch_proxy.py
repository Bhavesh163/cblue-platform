import re

file_path = "apps/web/app/api/v1/[...path]/route.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to make sure the token from cookies is extracted and sent as Authorization header
# Cloudflare Worker might not pass cookies directly if it's cross-domain from some perspectives, or we need to manually pass it.

old_str = """    request.headers.forEach((v, k) => {
      if (!SKIP_REQ.has(k.toLowerCase())) headers.set(k, v);
    });"""

new_str = """    request.headers.forEach((v, k) => {
      if (!SKIP_REQ.has(k.toLowerCase())) headers.set(k, v);
    });
    
    // Explicitly add Authorization header if token exists in cookies
    const token = request.cookies.get('token')?.value;
    if (token && !headers.has('authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched route.ts successfully!")
else:
    print("Failed to patch route.ts")
