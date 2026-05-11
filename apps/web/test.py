with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()
    print("Review & Accept" in text)
