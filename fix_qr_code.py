import re

with open("apps/web/app/[locale]/components/FixerResults.tsx", "r", encoding="utf-8") as f:
    text = f.read()

qr_block = """  // Step: Payment QR
  if (step === "payment" && selectedFixer) {
    const refCode = `CBLUE-${poNumber.replace("PO-", "")}`;
    const payload = generatePayload("0999999999", { amount: fee });
    return (
      <><StepProgressBar />
      <div className="bg-white rounded-3xl p-8 max-w-md mx-auto w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💰</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t.paymentTitle}</h2>
          <p className="text-gray-500 mt-2">{t.paymentDesc}</p>
        </div>
        
        <div className="bg-gray-50 p-6 rounded-2xl flex flex-col items-center">
          <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
            <QRCodeSVG value={payload} size={200} />
          </div>
          <div className="w-full space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t.paymentAmount}:</span>
              <span className="font-bold text-gray-900">฿{fee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.paymentRef}:</span>
              <span className="font-medium text-gray-700">{refCode}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button 
            onClick={() => setStep("chat")}
            className="flex-1 py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-sky-200"
          >
            {t.paymentComplete}
          </button>
        </div>
      </div>
      </>
    );
  }"""

new_qr_block = """  // Step: Payment QR
  if (step === "payment" && selectedFixer) {
    const refCode = `CBLUE-${poNumber.replace("PO-", "")}`;
    return (
      <><StepProgressBar />
      <div className="bg-white rounded-3xl p-8 max-w-md mx-auto w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💰</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t.paymentTitle}</h2>
          <p className="text-gray-500 mt-2">{t.paymentDesc}</p>
        </div>
        
        <div className="bg-gray-50 p-6 rounded-2xl flex flex-col items-center">
          <div className="w-full space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-gray-500">{t.paymentAmount}:</span>
              <span className="font-bold text-gray-900">฿{fee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.paymentRef}:</span>
              <span className="font-medium text-gray-700">{refCode}</span>
            </div>
          </div>
          
          <button 
            onClick={() => setStep("chat")}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-base transition-colors shadow-lg shadow-amber-200 flex items-center justify-center gap-2"
          >
            <span>🧪</span> Testing Period: Skip Payment
          </button>
        </div>
      </div>
      </>
    );
  }"""

if qr_block in text:
    text = text.replace(qr_block, new_qr_block)
    with open("apps/web/app/[locale]/components/FixerResults.tsx", "w", encoding="utf-8") as f:
        f.write(text)
    print("QR replaced")
else:
    print("QR block not found")
