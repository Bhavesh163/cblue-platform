import re
with open("app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

# Remove the whole Requests section
text = re.sub(r'      \n        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">((.|\n)*?)</div>\n      \)}', r'', text)

with open("app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
