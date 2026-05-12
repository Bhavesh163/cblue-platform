import re

with open("apps/web/app/[locale]/components/FixerResults.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Fix notify step to jump to confirm instead of payment (so to not skip)
text = text.replace('setStep("payment"); // proceed to payment step!', 'setStep("confirm"); // proceed to confirm step!')

# Add a test pill to notify step to skip to confirm
notify_render = """<div className="flex items-center justify-center gap-3 mb-6">
                  <span className="inline-block w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-amber-600 font-medium">{t("notifyWaiting")}</span>
                </div>"""
notify_patch = """<div className="flex items-center justify-center gap-3 mb-6">
                  <span className="inline-block w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-amber-600 font-medium">{t("notifyWaiting")}</span>
                </div>
                {/* TEST PILL TO BYPASS */}
                <button onClick={() => setStep("confirm")} className="mt-4 px-4 py-1 text-xs bg-red-100 text-red-600 rounded-full border border-red-300">
                  (Test Pill) Force Partner Accepted
                </button>"""
text = text.replace(notify_render, notify_patch)

# Now, Fix the QR in the 'payment' step
qr_render_1 = """            <span className="font-bold text-lg mb-2">🚧 Payment system via PromptPay QR 🚧</span>
            <div className="bg-white p-4 inline-block rounded-xl shadow-sm border border-gray-200">
              {payload ? (
                <QRCodeSVG value={payload} size={200} />
              ) : (
                <div className="w-[200px] h-[200px] bg-gray-100 flex items-center justify-center rounded-lg">
                  <span className="text-gray-400 text-sm">{t("loading")}</span>
                </div>
              )}
            </div>"""
qr_patch_1 = """            <span className="font-bold text-lg mb-2">🚧 Payment testing period 🚧</span>
            <div className="bg-white p-4 inline-block rounded-xl shadow-sm border border-gray-200 mb-4 text-center">
               <p className="text-sm text-gray-500 mb-3">No actual payment needed during testing. Click the pill below to pass this step.</p>
               <button onClick={handlePaymentComplete} className="px-6 py-2 bg-green-100 text-green-700 font-medium rounded-full border border-green-300 hover:bg-green-200 transition">
                 (Test Pill) Mark Payment as Complete
               </button>
            </div>"""
text = text.replace(qr_render_1, qr_patch_1)


with open("apps/web/app/[locale]/components/FixerResults.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Patched FixerResults.tsx")
