import os
import re

file_path = "apps/web/app/[locale]/fixers/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I will replace the Recent Activity Sections (Lines 738-757ish) and the other Recent Alerts
dupe1 = r"""      \{/\* Recent Activity Sections \*/}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6"\>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"\>
          <div className="px-6 py-4 border-b border-gray-100"\>
            <h2 className="font-bold text-gray-900"\>Recent Alerts</h2\>
          </div\>
          <div className="p-6 text-center text-sm text-gray-500"\>No recent alerts\.</div\>
        </div\>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"\>
          <div className="px-6 py-4 border-b border-gray-100"\>
            <h2 className="font-bold text-gray-900"\>Pending Ratings</h2\>
          </div\>
          <div className="p-6 text-center text-sm text-gray-500"\>No pending ratings\.</div\>
        </div\>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"\>
          <div className="px-6 py-4 border-b border-gray-100"\>
            <h2 className="font-bold text-gray-900"\>Recent Chats</h2\>
          </div\>
          <div className="p-6 text-center text-sm text-gray-500"\>No recent chats\.</div\>
        </div\>"""
# replace with just nothing
content = re.sub(dupe1, r"", content, flags=re.MULTILINE)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Duplicates removed.")
