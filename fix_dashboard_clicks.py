import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

# Replace the div tag to add onClick
text = text.replace(
    '<div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">',
    '<div key={i} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer" onClick={() => router.push(`${prefix}/chat/${o.id}`)}>'
)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
