import re

with open('overview_dump.txt', 'r', encoding='utf-8') as f:
    orig = f.read()

part1_start = orig.find('{/* Active Jobs Preview */}')
part2_start = orig.find('{/* Incoming Requests Preview */}')
part3_start = orig.find('{/* Notifications + Chat side by side */}')
part4_start = orig.find('<h2 className="font-bold text-gray-900">Recent History</h2>')
part4_start = orig.rfind('<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">', part3_start, part4_start)

chunk1_active = orig[part1_start:part2_start]
chunk2_incoming = orig[part2_start:part3_start]
chunk3_notif = orig[part3_start:part4_start]

new_inner = chunk2_incoming + chunk3_notif + chunk1_active
new_overview = orig[:part1_start] + new_inner + orig[part4_start:]

# Also update the chats to props
new_overview = new_overview.replace('chats, ', 'chats, ') # Wait I already fixed it in page.tsx but my dump is old. I will pass.
# Wait, I didn't update overview_dump.txt. So it has the old signature. Let's fix the signature in new_overview.
new_overview = re.sub(
    r'function PartnerOverview\(\{[^\}]+\}\)',
    r'function PartnerOverview({ locale, partner, activeJobs, incomingJobs, completedJobs, earnings, stats, notifications, chats, onJobClick }: { locale: string; partner: PartnerInfo | null; activeJobs: any[]; incomingJobs: any[]; completedJobs: any[]; earnings: any[]; stats: any; notifications: any[]; chats: any[]; onJobClick?: (job: any) => void; })',
    new_overview
)

# And now active jobs detail update with PO number, budget, subdistrict
# Currently active jobs inside overview:
# <p className="text-xs text-gray-500">{job.customer} &middot; {job.date}</p>
new_overview = new_overview.replace(
    '<p className="text-xs text-gray-500">{job.customer} &middot; {job.date}</p>',
    '<p className="text-xs text-gray-500">{job.customer} &middot; {job.date} &middot; PO: {job.poNumber || job.id.slice(-6)} &middot; {locale === "th" ? "งบ" : "Budget"}: ฿{job.budget || job.earnings || "-"} &middot; {locale === "th" ? "โครงการ" : "Project"}: {job.project || "Cblue"}</p>'
)

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    page_text = f.read()

sig_start = page_text.find('function PartnerOverview({')
end_val = page_text.find('/* ===== PARTNER JOBS (Active) ===== */')
if sig_start != -1 and end_val != -1:
    page_text = page_text[:sig_start] + new_overview + "\n\n" + page_text[end_val:]
    with open('apps/web/app/[locale]/fixers/page.tsx', 'w', encoding='utf-8') as f:
        f.write(page_text)
        print("Layout updated!")
else:
    print("Failed finding endpoints in page.tsx")
