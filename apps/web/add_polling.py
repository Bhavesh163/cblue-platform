import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # If the user is on step 4 or 5 ("notify" / "confirm") and the order is in the DB, 
    # we should poll to check if the partner accepted it.
    
    polling_code = """
  // Poll order status to auto-advance when partner accepts
  useEffect(() => {
    if (step >= 4 && initialOrderData?.id) {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/v1/orders/${initialOrderData.id}`);
          if (res.ok) {
            const updated = await res.json();
            if (updated.status === 'PENDING' && !partnerConfirmed) {
              setPartnerConfirmed(true);
              setStep(5);
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

    content = re.sub(r'const t = \(key: keyof typeof dictionary\) => \{', polling_code, content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        print("Fixed polling in " + filepath)

fix_file('app/[locale]/components/FixerResults.tsx')
