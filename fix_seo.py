import re

file_path = "apps/web/app/layout.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add Bing verification and icon to the app
if "icons: {" not in content:
    replacement = """
  verification: {
    google: "google-site-verification-code",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {"""
    
    content = content.replace("  openGraph: {", replacement)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
