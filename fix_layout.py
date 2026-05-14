import re
with open('apps/web/app/[locale]/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# I need to see the exact structure from "md:col-span-2 space-y-6" to understand how to swap them.
# Let's extract the part
import sys
match = re.search(r'(<div className="md:col-span-2 space-y-6">)(.*?)</div>\s*</div>\s*</div>\s*</div>\s*</div>', c, re.DOTALL)
if match:
    sys.exit(0)
else:
    sys.exit(1)
