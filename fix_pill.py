import re
path = "/home/ballhog/cblue-platform/apps/web/app/[locale]/components/FixerResults.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace setStep("done") in the testing pill with handlePaymentComplete or setStep("chat")
content = content.replace(
    'onClick={() => setStep("done")}>\n            <span className="font-bold text-lg mb-2">🚧 Testing Period Payment Pill 🚧',
    'onClick={handlePaymentComplete}>\n            <span className="font-bold text-lg mb-2">🚧 Testing Period Payment Pill 🚧'
)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
