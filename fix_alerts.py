import re

fp = "apps/web/app/[locale]/fixers/page.tsx"
with open(fp, "r", encoding="utf-8") as f:
    c = f.read()

# Fix 1 file attached
c = c.replace(
    '''<span className="font-semibold text-sky-600 cursor-pointer hover:underline">{(waitModalOrder.image || (waitModalOrder.images && waitModalOrder.images.length > 0) || waitModalOrder.fileUrl || (waitModalOrder.projectImages && waitModalOrder.projectImages.length > 0) || waitModalOrder.metadata?.images) ? '1 file attached (Click to View)' : '1 file attached (Click to View)'}</span>''',
    '''<span className="font-semibold text-sky-600 cursor-pointer hover:underline" onClick={() => { const url = waitModalOrder.image || waitModalOrder.fileUrl || (waitModalOrder.projectImages && waitModalOrder.projectImages[0]) || (waitModalOrder.images && waitModalOrder.images[0]) || (waitModalOrder.metadata?.images && waitModalOrder.metadata.images[0]); if(url) window.open(url, "_blank"); else alert("No file attached"); }}>{(waitModalOrder.image || (waitModalOrder.images && waitModalOrder.images.length > 0) || waitModalOrder.fileUrl || (waitModalOrder.projectImages && waitModalOrder.projectImages.length > 0) || waitModalOrder.metadata?.images) ? "1 file attached (Click to View)" : "1 file attached (Click to View)"}</span>'''
)

# Remove duplicate Recent Alerts / Recent Chats blocks in the right column
duplicate_blocks_regex = r'(<h2 className="text-xl font-bold text-gray-800 mb-6">Recent Alerts</h2>.*?<h2 className="text-xl font-bold text-gray-800 mb-6 mt-8">Recent Chats</h2>.*?<p className="text-gray-500">No recent chats\.</p>\s*</div>)'

c = re.sub(duplicate_blocks_regex, '', c, count=1, flags=re.DOTALL)

with open(fp, "w", encoding="utf-8") as f:
    f.write(c)

print("Fixed alerts and file clicks")
