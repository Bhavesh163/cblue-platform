import re

with open('overview_dump.txt', 'r', encoding='utf-8') as f:
    orig = f.read()

# I want to swap `Active Jobs Preview`, `Incoming Requests Preview`, `Notifications + Chat side by side`

part1_start = orig.find('{/* Active Jobs Preview */}')
part2_start = orig.find('{/* Incoming Requests Preview */}')
part3_start = orig.find('{/* Notifications + Chat side by side */}')
part4_start = orig.find('<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">') # This is the Recent History
part4_start = orig.rfind('<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">', part3_start)

# Actually there is no comment for Recent History, it's just a div. Let's find it by "Recent History"
part4_start = orig.find('<h2 className="font-bold text-gray-900">Recent History</h2>')
# Go back to the <div className="..."> that starts Recent History
part4_start = orig.rfind('<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">', part3_start, part4_start)

if part1_start == -1 or part2_start == -1 or part3_start == -1:
    print("Cannot find parts!")
    exit(1)

# Now extract the chunks
chunk1_active = orig[part1_start:part2_start]
chunk2_incoming = orig[part2_start:part3_start]
chunk3_notif = orig[part3_start:part4_start]

# Rearrange: Incoming -> Notif -> Active
new_inner = chunk2_incoming + chunk3_notif + chunk1_active

new_overview = orig[:part1_start] + new_inner + orig[part4_start:]

# Write new overview to a file or inject it directly. Wait we need it directly in page.tsx. Let's just do that in `apps/web/app/[locale]/fixers/page.tsx`
with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    page_text = f.read()

# Replace the old PartnerOverview body with the new one. Since function signature changed, let's grab it all.
res = re.split(r'function PartnerOverview\(\{[\s\S]*?\{/\* PARTNER JOBS \(Active\) \*/\}', page_text)
if len(res) == 2:
    sig_start = page_text.find('function PartnerOverview({')
    end_val = page_text.find('{/* ===== PARTNER JOBS (Active) ===== */}')
    if end_val != -1:
        page_text = page_text[:sig_start] + new_overview + "\n\n" + page_text[end_val:]
        with open('apps/web/app/[locale]/fixers/page.tsx', 'w', encoding='utf-8') as f:
            f.write(page_text)
            print("Layout updated.")
else:
    print("Failed to replace in page.tsx")
