import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Fix Modal logic for image
old_modal_image = r"let url = waitModalOrder\.image \|\| waitModalOrder\.fileUrl \|\| \(waitModalOrder\.projectImages && waitModalOrder\.projectImages\[0\]\) \|\| \(waitModalOrder\.images && waitModalOrder\.images\[0\]\) \|\| \(waitModalOrder\.metadata\?\.images && waitModalOrder\.metadata\.images\[0\]\);"
new_modal_image = "let url = waitModalOrder.issueImage || waitModalOrder.image || waitModalOrder.fileUrl || (waitModalOrder.projectImages && waitModalOrder.projectImages[0]) || (waitModalOrder.images && waitModalOrder.images[0]) || (waitModalOrder.metadata?.images && waitModalOrder.metadata.images[0]) || (waitModalOrder.metadata?.issueImageUrl);"
text = re.sub(old_modal_image, new_modal_image, text)

# Fix Upcoming Meetings in Overview
# Find the overview tab content
# Let's just output some of the file to see how tasks/alerts are rendered
m = re.search(r"Recent incoming chats(.*?)</div", text, re.DOTALL)
if m:
    print("Recent incoming chats found")

