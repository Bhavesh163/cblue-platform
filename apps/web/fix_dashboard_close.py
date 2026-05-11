with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

text = text.replace('</div>\n              ))', '</Link>\n              ))')
text = text.replace('</div>\n                ))', '</Link>\n                ))')

with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
