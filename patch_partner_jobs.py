import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Fix the PartnerJobs component
pattern = r'(function PartnerJobs[^{]+{[^}]+<div className="divide-y divide-gray-50">\s*\{)activeJobs\.slice\(0, 5\)(\.map)'
text = re.sub(pattern, r'\1activeJobs\2', text)

with open("apps/web/app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

