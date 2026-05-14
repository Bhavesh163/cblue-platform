import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Move chats and alerts grid to just below the Upcoming meetings or above Incoming Requests!
# Let's extract the chats and alerts grid.
grid_start = text.find('<div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">')
grid_str = text[grid_start:]
# Find the closing </div> of that grid. We can count divs.
def extract_element(s, start_idx):
    level = 0
    i = start_idx
    while i < len(s):
        if s[i:i+4] == '<div':
            level += 1
            i += 4
        elif s[i:i+5] == '</div':
            level -= 1
            i += 5
            if level == 0:
                return s[start_idx:i+1]
        else:
            i += 1
    return None

chats_grid = extract_element(text, grid_start)
if chats_grid:
    # Remove it from original text
    text = text.replace(chats_grid, '')
else:
    print("Could not extract grid")

# Insert it before Incoming Requests
ir_h2 = '<h2 className="text-xl font-bold mb-4">{t(\'incomingRequests\')}</h2>'
# Wait, incoming requests section in dashboard/page.tsx:
ir_start = text.find(ir_h2)

# Also wrap Incoming Requests. The mapped array is REQUESTS_MOCK.slice(...)
# We want it to be a bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50
# Currently it is handled inside the <div className="mb-4">...
# Let's just do a big replace from ir_start to whatever.

# I will just write a small targeted script for the specific wrapper. Then commit.

