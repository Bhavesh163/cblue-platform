import re
with open("app/[locale]/components/FixerResults.tsx", "r") as f:
    text = f.read()

text = re.sub(
    r"issueImages\?: File\[\];\n  onNewBooking: \(\) => void;\n}",
    r"issueImages?: File[];\n  onNewBooking: () => void;\n  initialStep?: string;\n  initialOrderData?: any;\n}",
    text
)
with open("app/[locale]/components/FixerResults.tsx", "w") as f:
    f.write(text)
