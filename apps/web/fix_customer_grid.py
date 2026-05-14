import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# The grid goes: <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${activeTab !== 'overview' ? 'hidden' : ''}`}>
# Left column: <div className="space-y-6">  (should be col-span-2)
# Let's change the layout to lg:grid-cols-3, left column gets lg:col-span-2, right gets lg:col-span-1

text = text.replace('<div className="space-y-6">', '<div className="space-y-6 lg:col-span-2">', 1)

# Now move Recent Incoming Chats and Recent Alerts above Incoming Requests
# Wait, they are currently in the `<div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">`
# Let's see the structure first.
