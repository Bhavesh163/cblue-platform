import re

file_path = "app/[locale]/dashboard/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the specific divide-y container for Active Jobs
content = content.replace(
    '<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">\n              {combinedActive.map((m, i) => renderActiveCard(m, i))}\n            </div>',
    '<div className="flex flex-col gap-3 mt-4">\n              {combinedActive.map((m, i) => renderActiveCard(m, i))}\n            </div>'
)
content = content.replace(
    '<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">\n            {combinedActive.map((m, i) => renderActiveCard(m, i))}\n          </div>',
    '<div className="flex flex-col gap-3 mt-4">\n            {combinedActive.map((m, i) => renderActiveCard(m, i))}\n          </div>'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

