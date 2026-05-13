#!/bin/bash
python3 << 'PYTHON_EOF'
import re

file_path = "/home/ballhog/cblue-platform/apps/web/app/[locale]/dashboard/page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("🔧 Patching dashboard/page.tsx...")

# 1. Update REQUESTS_MOCK[0].desc
old_desc = 'desc: "I want ................."'
new_desc = 'desc: "I want to renovate my kitchen and fix the plumbing"'
if old_desc in content:
    content = content.replace(old_desc, new_desc)
    print("✅ REQUESTS_MOCK[0].desc: Updated to realistic description")

# 2. Update renderRequestCard
old_req = 'className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md cursor-pointer transition mb-4">'
new_req = 'className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition mb-4">'
if old_req in content:
    content = content.replace(old_req, new_req)
    print("✅ renderRequestCard: Applied big pill design (rounded-3xl, shadow-sm, p-6)")

# 3. Update renderActiveCard
old_act = 'className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md cursor-pointer transition mb-4 flex flex-col gap-3">'
new_act = 'className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition mb-4 flex flex-col gap-3">'
if old_act in content:
    content = content.replace(old_act, new_act)
    print("✅ renderActiveCard: Applied big pill design (rounded-3xl, shadow-sm, p-6)")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

PYTHON_EOF
