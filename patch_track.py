import re

with open("apps/web/app/[locale]/components/FixerResults.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Replace PromptPay QR section with a Testing Pill button
old_qr = """<div className="mx-auto bg-yellow-100 text-yellow-800 rounded-xl border-2 border-yellow-200 flex flex-col items-center justify-center mb-6 p-6 shadow-sm">
            <span className="font-bold text-lg mb-2">🚧 Payment system via PromptPay QR 🚧</span>
            <span className="text-sm text-center">Testing Pill: This is a temporary pill showing it is testing period for customer to click and pass the step.</span>
          </div>"""

new_qr_btn = """<div className="mx-auto bg-yellow-100 text-yellow-800 rounded-xl border-2 border-yellow-200 flex flex-col items-center justify-center mb-6 p-6 shadow-sm cursor-pointer hover:bg-yellow-200 transition" onClick={() => setStep("done")}>
            <span className="font-bold text-lg mb-2">🚧 Testing Period Payment Pill 🚧</span>
            <span className="text-sm text-center font-bold">Click here to pass free payment simulation</span>
          </div>"""

text = text.replace(old_qr, new_qr_btn)

with open("apps/web/app/[locale]/components/FixerResults.tsx", "w", encoding="utf-8") as f:
    f.write(text)

