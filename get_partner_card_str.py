import re
with open("apps/web/app/[locale]/partner-zone/page.tsx", "r") as f:
    text = f.read()

# Grab whatever is inside Active Jobs list
idx = text.find('activeTab === "bookings"')
if idx != -1:
    print(text[idx-50:idx+2500])
