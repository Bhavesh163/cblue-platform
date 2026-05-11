with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    'tier: "Standard",',
    'tier: o.description?.toUpperCase().includes("TIER:ECONOMY") ? "ECONOMY" : o.description?.toUpperCase().includes("TIER:STANDARD") ? "Standard" : o.description?.toUpperCase().includes("TIER:CORPORATE") ? "Corporate" : o.description?.toUpperCase().includes("TIER:SPECIALIST") ? "Specialist" : o.description?.toUpperCase().includes("TIER:EXPERT") ? "Expert" : "Standard",'
)
with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

