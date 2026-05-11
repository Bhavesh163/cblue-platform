with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace("Step 4 of 12", "Step 5 of 12")
text = text.replace("Go to Our Partner Dashboard", "Go to Our Customer Page")

with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
