import re
with open("app/[locale]/components/FixerResults.tsx", "r") as f:
    text = f.read()

# Replace QR image with a button/pill to pass
text = re.sub(
    r'<div className="bg-white p-4 rounded-xl inline-block mb-6 shadow-sm border border-gray-100">(.|\n)*?<Image(.|\n)*?PromptPay QR"(.|\n)*?</div>',
    r"""<div className="bg-white p-6 rounded-xl inline-block mb-6 shadow-sm border border-sky-100 bg-sky-50 text-center">
                <p className="text-sm font-bold text-sky-700 mb-4">Testing Period: Free Payment</p>
                <button onClick={() => setStep("chat")} className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition shadow">Confirm Free Payment to Proceed</button>
              </div>""",
    text
)

with open("app/[locale]/components/FixerResults.tsx", "w") as f:
    f.write(text)
