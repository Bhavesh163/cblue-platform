import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Fix incoming requests max 3 (was probably 2 or slice(0, 2))
text = text.replace("incomingJobs.slice(0, 2)", "incomingJobs.slice(0, 3)")
text = text.replace("incomingJobs.slice(0, 4)", "incomingJobs.slice(0, 3)")

# Fix chats max 4
text = text.replace("chats.slice(0, 3)", "chats.slice(0, 4)")
text = text.replace("chats.slice(0, 2)", "chats.slice(0, 4)")

with open("apps/web/app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("patched")
