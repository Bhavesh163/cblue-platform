import os

file_path = "apps/web/app/[locale]/components/FixerResults.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the payment section directly
old_payment_ui = """  if (step === "payment" && selectedFixer) {
    return (
      <div className="bg-white rounded-3xl p-8 max-w-md mx-auto text-center border shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RiQrCodeLine className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t("paymentTitle")}</h2>
          <p className="text-gray-500 text-sm mb-6">{t("paymentDesc")}</p>
          
          {/* QR Code Placeholder */}
          <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 inline-block mb-6">
            <div className="w-48 h-48 bg-white border shadow-sm rounded-xl flex items-center justify-center">
              <RiQrCodeLine className="w-24 h-24 text-gray-300" />
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-left mb-8 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">{t("paymentAmount")}</span>
              <span className="font-bold text-gray-800">฿{processingFee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("paymentRef")}</span>
              <span className="font-mono text-gray-800">{orderId || "xxx-xxx"}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={simulatePayment}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg"
        >
          {t("paymentComplete")}
        </button>
      </div>
    );
  }"""

new_payment_ui = """  if (step === "payment" && selectedFixer) {
    return (
      <div className="bg-white rounded-3xl p-8 max-w-md mx-auto text-center border shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RiQrCodeLine className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Required</h2>
          
          <div className="bg-blue-50 text-blue-800 p-6 rounded-2xl border border-blue-200 inline-block mb-6 w-full cursor-pointer hover:bg-blue-100 transition" onClick={simulatePayment}>
            <p className="font-bold mb-2 text-xl">Testing Period</p>
            <p className="text-sm">Click here to pass the payment step!</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-left mb-8 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">{t("paymentAmount")}</span>
              <span className="font-bold text-gray-800">฿{processingFee}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t("paymentRef")}</span>
              <span className="font-mono text-gray-800">{orderId || "xxx-xxx"}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={simulatePayment}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg"
        >
          Skip Payment Phase
        </button>
      </div>
    );
  }"""

if old_payment_ui in content:
    content = content.replace(old_payment_ui, new_payment_ui)
    print("Replaced old payment ui successfully!")
else:
    print("WARNING: Old payment UI string not found! Cannot replace.")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

