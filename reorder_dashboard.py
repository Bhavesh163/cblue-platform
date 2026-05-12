import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Separate the grid contents
# Pattern starts after `                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">`
# We need to extract the 4 blocks and reassemble them.
# Active Jobs Block
active_jobs_match = re.search(r'(<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">\s*<div className="p-6 border-b border-gray-100 flex justify-between items-center">\s*<h2 className="text-lg font-bold text-gray-800">.*?\{locale === "th" \? "งานปัจจุบัน" : locale === "zh" \? "当前工作" : "Active Jobs"\}</h2>.*?<Link href={`\$\{locale\}/chat/\$\{job.id\}`}.*?</div>)', text, re.DOTALL)
if active_jobs_match: print("Active jobs match found")
