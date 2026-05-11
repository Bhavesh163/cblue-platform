import re

with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

fee_logic = """{(() => {
                  const desc = waitModalOrder.description || '';
                  if (desc.includes('TIER:ECONOMY')) return '100';
                  if (desc.includes('TIER:Standard')) return '400';
                  if (desc.includes('TIER:Corporate') || desc.includes('TIER:Upper')) return '600';
                  if (desc.includes('TIER:Specialist') || desc.includes('TIER:Manager') || desc.includes('TIER:Luxury')) return '800';
                  if (desc.includes('TIER:Expert') || desc.includes('TIER:Director') || desc.includes('TIER:Grandeur')) return '1,000';
                  return '100';
                })()}"""

text = re.sub(r"\{waitModalOrder\.description\?\.includes\('TIER:Economy'\) \? '100' : waitModalOrder\.description\?\.includes\('TIER:Standard'\) \? '400' : '100'\}", fee_logic, text)

with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
