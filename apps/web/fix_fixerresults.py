import re
with open("app/[locale]/components/FixerResults.tsx", "r") as f:
    text = f.read()

# Add initial values to props
text = re.sub(
    r"issueImages\?: File\[\];\n  onNewBooking: \(\) => void;\n\)",
    r"issueImages?: File[];\n  onNewBooking: () => void;\n  initialStep?: string;\n  initialOrderData?: any;\n})",
    text
)

text = re.sub(
    r"issueImages,\n  onNewBooking,\n}: {",
    r"issueImages,\n  onNewBooking,\n  initialStep,\n  initialOrderData,\n}: {",
    text
)

text = re.sub(
    r'const \[step, setStep\] = useState<Step>\("matching"\);',
    r'const [step, setStep] = useState<Step>((initialStep as any) || "matching");',
    text
)

text = re.sub(
    r'const \[selectedFixer, setSelectedFixer\] = useState<Fixer \| null>\(null\);',
    r'const [selectedFixer, setSelectedFixer] = useState<Fixer | null>(initialOrderData?.fixer || null);',
    text
)

text = re.sub(
    r'const \[poNumber, setPoNumber\] = useState\("PO-0000-0000"\);',
    r'const [poNumber, setPoNumber] = useState(initialOrderData?.poNumber || "PO-0000-0000");',
    text
)

# And if initialOrderData has status PENDING, bypass wait
text = text.replace(
    'const [partnerConfirmed, setPartnerConfirmed] = useState(false);',
    'const [partnerConfirmed, setPartnerConfirmed] = useState(initialOrderData?.status?.toUpperCase() === "PENDING");'
)

# We also need to set an orderId so chat works properly
text = text.replace(
    'const [orderId, setOrderId] = useState<string | null>(null);',
    'const [orderId, setOrderId] = useState<string | null>(initialOrderData?.id || null);'
)

with open("app/[locale]/components/FixerResults.tsx", "w") as f:
    f.write(text)
