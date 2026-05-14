import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. We want to extract the grid with chats and alerts, and the upcoming meetings block if any,
# and insert them before <div className="mb-4"> ... incoming requests

chats_alerts_pattern = re.compile(
    r'(<div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">.*?</div>\s*</div>)',
    re.DOTALL
)
# Wait, grep shows:
# 1060: <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
# ...
# 1081: </div>

# So let's find that block exactly.
start_str = '<div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">'
start_idx = text.find(start_str)

if start_idx != -1:
    end_idx = text.find('</div>', text.find('</div>', text.find('</div>', start_idx) + 1) + 1) + 6 # Rough guess, let's use a safer way
