import re

file_path = "apps/web/app/[locale]/fixers/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

dupe2 = r"""          \{/\* Recent Alerts \*/}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"\>
            <div className="px-5 py-4 border-b border-gray-100"\>
              <h3 className="font-bold text-gray-900 flex items-center gap-2"\>Recent Alerts</h3\>
            </div\>
            <div className="p-4 space-y-4"\>
              <div className="flex gap-3"\>
                <span className="w-2 h-2 mt-1\.5 rounded-full bg-purple-500 flex-shrink-0"\></span\>
                <div\>
                  <p className="text-sm text-gray-800 font-medium"\>Customer #[A-Z0-9]+ sent a new message</p\>
                  <p className="text-xs text-gray-400 mt-1"\>2m ago</p\>
                </div\>
              </div\>
              <div className="flex gap-3"\>
                <span className="w-2 h-2 mt-1\.5 rounded-full bg-amber-500 flex-shrink-0"\></span\>
                <div\>
                  <p className="text-sm text-gray-800"\>You have 3 new job requests</p\>
                  <p className="text-xs text-gray-400 mt-1"\>15m ago</p\>
                </div\>
              </div\>
              <div className="flex gap-3"\>
                <span className="w-2 h-2 mt-1\.5 rounded-full bg-green-500 flex-shrink-0"\></span\>
                <div\>
                  <p className="text-sm text-gray-800"\>Payment of ฿3,200 received</p\>
                  <p className="text-xs text-gray-400 mt-1"\>1h ago</p\>
                </div\>
              </div\>
            </div\>
          </div\>"""

content = re.sub(dupe2, r"", content, flags=re.MULTILINE)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Second duplicate removed")
