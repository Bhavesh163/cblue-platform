import re
with open("app/[locale]/fixers/page.tsx", "r") as f:
    text = f.read()

# Replace hardcoded Accept buttons in PartnerOverview
text = re.sub(
    r'<button className="px-3 py-1 bg-green-600([^>]+)>\{locale === "th" \? "รับ" : locale === "zh" \? "接受" : "Accept"\}</button>',
    r'<button onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(job); }} className="px-3 py-1 bg-green-600\1>{locale === "th" ? "รับ" : locale === "zh" ? "接受" : "Accept"}</button>',
    text
)

# And in PartnerRequests
text = re.sub(
    r'<button className="px-5 py-2 bg-green-600([^>]+)>\{locale === "th" \? "รับงาน" : locale === "zh" \? "接受" : "Accept"\}</button>',
    r'<button onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(req); }} className="px-5 py-2 bg-green-600\1>{locale === "th" ? "รับงาน" : locale === "zh" ? "接受" : "Accept"}</button>',
    text
)
with open("app/[locale]/fixers/page.tsx", "w") as f:
    f.write(text)
