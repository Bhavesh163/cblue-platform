import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Let's search for "const t ="
    if "const t = (key: keyof" in content:
        polling_code = """
  // Poll order status to auto-advance when partner accepts
  useEffect(() => {
    if ((step === "notify" || step === "matching") && initialOrderData?.id) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/v1/orders/${initialOrderData.id}`);
          if (res.ok) {
            const updated = await res.json();
            if (updated.status === 'PENDING' && !partnerConfirmed) {
              setPartnerConfirmed(true);
              setStep("payment"); // proceed to payment step!
            }
          }
        } catch (e) {
          // ignore
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [step, initialOrderData, partnerConfirmed]);

  const t = (key: keyof typeof dictionary) => {"""

        new_content = content.replace('  const t = (key: keyof typeof dictionary) => {', polling_code)
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("Successfully patched.")
        else:
            print("String not found exactly.")
    else:
        print("const t not found")

fix_file('app/[locale]/components/FixerResults.tsx')
