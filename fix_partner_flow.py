import os
import re

fixers_page = "apps/web/app/[locale]/fixers/page.tsx"
fixer_results = "apps/web/app/[locale]/components/FixerResults.tsx"

# 1. Update partner "Accept PO" to send { status: "CONFIRMED" }
if os.path.exists(fixers_page):
    with open(fixers_page, "r", encoding="utf-8") as f:
        c = f.read()
    
    # Change status to CONFIRMED
    c = re.sub(
        r'body: JSON.stringify\(\{ status: "PENDING" \}\)',
        r'body: JSON.stringify({ status: "CONFIRMED" })',
        c
    )
    
    # Add click handler to 1 file attached
    c = re.sub(
        r'(<span className="font-semibold text-sky-600[^<]*(?:\'1 file attached \(Click to View\)\' : \'1 file attached \(Click to View\)\')</span>)',
        r'<span className="font-semibold text-sky-600 cursor-pointer hover:underline" onClick={() => window.open(waitModalOrder.image || waitModalOrder.fileUrl || (waitModalOrder.projectImages && waitModalOrder.projectImages[0]) || (waitModalOrder.images && waitModalOrder.images[0]) || (waitModalOrder.metadata?.images && waitModalOrder.metadata.images[0]), "_blank")}>{(waitModalOrder.image || (waitModalOrder.images && waitModalOrder.images.length > 0) || waitModalOrder.fileUrl || (waitModalOrder.projectImages && waitModalOrder.projectImages.length > 0) || waitModalOrder.metadata?.images) ? "1 file attached (Click to View)" : "1 file attached (Click to View)"}</span>',
        c
    )
    with open(fixers_page, "w", encoding="utf-8") as f:
        f.write(c)
    print("Patched fixers/page.tsx")

# 2. Update FixerResults.tsx to listen for CONFIRMED
if os.path.exists(fixer_results):
    with open(fixer_results, "r", encoding="utf-8") as f:
        c = f.read()
    
    c = re.sub(
        r"if \(updated\.status === 'PENDING' && !partnerConfirmed\)",
        r"if (updated.status === 'CONFIRMED')",
        c
    )
    # also initial states
    c = re.sub(
        r'const \[partnerConfirmed, setPartnerConfirmed\] = useState\(initialOrderData\?\.status\?\.toUpperCase\(\) === "PENDING"\);',
        r'const [partnerConfirmed, setPartnerConfirmed] = useState(initialOrderData?.status?.toUpperCase() === "CONFIRMED");',
        c
    )
    with open(fixer_results, "w", encoding="utf-8") as f:
        f.write(c)
    print("Patched FixerResults.tsx")

resume_page = "apps/web/app/[locale]/booking/resume/[id]/page.tsx"
if os.path.exists(resume_page):
    with open(resume_page, "r", encoding="utf-8") as f:
        c = f.read()
        
    c = re.sub(
        r'if \(order\.status\?\.toUpperCase\(\) === "PENDING"\) {\s*initialStep = "notify";\s*} else if \(order\.status\?\.toUpperCase\(\) === "CREATED"\)',
        r'if (order.status?.toUpperCase() === "CONFIRMED") {\n    initialStep = "payment";\n  } else if (order.status?.toUpperCase() === "PENDING") {\n    initialStep = "notify";\n  } else if (order.status?.toUpperCase() === "CREATED")',
        c
    )
    with open(resume_page, "w", encoding="utf-8") as f:
        f.write(c)
    print("Patched resume page")

print("Done")
