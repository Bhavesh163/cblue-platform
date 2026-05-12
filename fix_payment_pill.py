import re

with open('apps/web/app/[locale]/components/FixerResults.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the payment UI entirely to be just the clickable pill
# Wait, I should make sure it calls `handlePaymentComplete` when the pill is clicked.

section_start = text.find('// Step: Payment QR')
if section_start != -1:
    section_end = text.find('// Step: Chat', section_start)
    if section_end != -1:
        part = text[section_start:section_end]
        
        # Now design the new pill section
        new_part = '''// Step: Payment Testing Pill
  if (step === "payment" && selectedFixer) {
    const refCode = `CBLUE-${poNumber.replace("PO-", "")}`;
    
    return (
      <><StepProgressBar />
      <div className="mx-auto max-w-md px-4 py-12 animate-in fade-in zoom-in duration-300">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 text-center relative overflow-hidden">
          {/* Decorative background */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sky-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
          
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-gray-900 mb-2">{t("paymentTitle")}</h2>
            <p className="text-gray-500 text-sm mb-8">{t("paymentDesc")}</p>

            <button 
              onClick={handlePaymentComplete}
              className="w-full relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-sky-400 to-amber-400 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative bg-white border-2 border-purple-100 rounded-2xl p-6 shadow-sm group-hover:border-purple-300 group-hover:-translate-y-1 transition duration-300">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-1">
                    <span className="text-2xl">🚧</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">Click to Confirm Payment</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    This is a temporary testing pill for the free testing period. 
                    No actual payment is required.
                  </p>
                  
                  <div className="flex flex-col w-full gap-2 mt-4 pt-4 border-t border-gray-100 text-left">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">Processing Fee:</span>
                      <span className="font-extrabold text-purple-600">฿{fee}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-medium">PO Reference:</span>
                      <span className="font-mono text-gray-600 font-medium">{refCode}</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
            
            <button 
              onClick={handleCancel}
              className="mt-6 text-sm text-gray-400 hover:text-gray-600 font-semibold transition"
            >
              Cancel Order
            </button>
          </div>
        </div>
      </div></>
    );
  }

  '''
        text = text[:section_start] + new_part + text[section_end:]
        with open('apps/web/app/[locale]/components/FixerResults.tsx', 'w', encoding='utf-8') as f:
            f.write(text)
            print("Pill updated.")

