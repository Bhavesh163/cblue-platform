import re

with open('apps/web/app/[locale]/chat/[id]/ClientChatPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Change h-screen to h-[calc(100vh-60px)] to reduce height
text = text.replace('h-screen', 'h-[calc(100vh-64px)]')

with open('apps/web/app/[locale]/chat/[id]/ClientChatPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

