import re

with open("app/[locale]/properties/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# remove QRCodeSVG import
text = re.sub(r'import\s+\{\s*QRCodeSVG\s*\}\s+from\s+"qrcode\.react";\n?', '', text)

# remove generatePayload
text = re.sub(r'const\s+payload\s*=\s*generatePayload\([^)]+\);', '', text)

with open("app/[locale]/properties/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
