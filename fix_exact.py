import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

# For 'o':
text = re.sub(r'(\.map\(\(o: any(?:, i: number)?\)(\s*=>\s*)\n\s*)<div (key=\{i\} className="[^"]*cursor-pointer")', r'\1<div \3 onClick={() => window.location.href = `${prefix}/chat/${o.id}`}', text)
text = re.sub(r'(\.map\(\(o: any(?:, i: number)?\)(\s*=>\s*)\n\s*)<tr (key=\{i\} className="[^"]*cursor-pointer")', r'\1<tr \3 onClick={() => window.location.href = `${prefix}/chat/${o.id}`}', text)

# For 'b':
text = re.sub(r'(\.map\(\(b: any(?:, i: number)?\)(\s*=>\s*)\n\s*)<div (key=\{b\.id\}|key=\{i\} className="[^"]*cursor-pointer")', r'\1<div \3 onClick={() => window.location.href = `${prefix}/chat/${b.id}`}', text)

# For 'h':
text = re.sub(r'(\.map\(\(h: any(?:, i: number)?\)(\s*=>\s*)\n\s*)<div (key=\{h\.id\}|key=\{i\} className="[^"]*cursor-pointer")', r'\1<div \3 onClick={() => window.location.href = `${prefix}/chat/${h.id}`}', text)


with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
