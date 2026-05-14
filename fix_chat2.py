import re

with open('apps/web/app/[locale]/chat/[id]/ClientChatPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('if (!mounted) return null;', 'if (!mounted) return <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center">Loading...</div>;')

with open('apps/web/app/[locale]/chat/[id]/ClientChatPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

