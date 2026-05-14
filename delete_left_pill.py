import re

with open('apps/web/app/[locale]/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the grid wrapper and left column
grid_start = r'<div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 \${activeTab !== \'overview\' \? \'hidden\' \: \'\'}`}>\s*<!-- LEFT COLUMN: Profile & Alerts -->\s*<div className="space-y-6">'

# In dashboard/page.tsx around line 942:
# <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${activeTab !== 'overview' ? 'hidden' : ''}`}>
#   {/* LEFT COLUMN: Profile & Alerts */}
#   <div className="space-y-6">
#     {/* Profile Card */}
#     ...
#   </div>
#   {/* RIGHT COLUMN: Main content feeds */}
#   <div className="lg:col-span-2 space-y-6">

# Since we want to remove the left column completely:
profile_match = re.search(r'(<div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 \${activeTab !== \'overview\' \? \'hidden\' : \'\'}`}>\s*\{\/\* LEFT COLUMN: Profile & Alerts \*\/\}\s*<div className="space-y-6">.*\{\/\* RIGHT COLUMN: Main content feeds \*\/\}\s*<div className="lg:col-span-2 space-y-6">)', text, re.DOTALL)

if profile_match:
    print("Found grid wrap!")
    new_wrap = '''<div className={`flex flex-col gap-6 ${activeTab !== 'overview' ? 'hidden' : ''}`}>'''
    text = text.replace(profile_match.group(1), new_wrap)
else:
    print("Not found grid wrap!")

# Now close the flex col properly
# The overall grid is closed at the very end of the overview section:
#               )}
#             </div>
#           </div>
#         </div>
#       </div>

with open('apps/web/app/[locale]/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

