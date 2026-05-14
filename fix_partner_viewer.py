import re

with open('apps/web/app/[locale]/partner-zone/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the fallback unsplash image
# Wait, user explicitly requested "please don't fallback to other image. what is the problem? is the file lost?"
# Let's fix the View Docs / File attached logic to properly reference the jobData.
text = text.replace('https://images.unsplash.com/photo-1541888081622-3866d939b4b9?q=80&w=2670&auto=format&fit=crop', '')

with open('apps/web/app/[locale]/partner-zone/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

