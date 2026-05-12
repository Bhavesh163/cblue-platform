import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Provide "chats: any[]" to PartnerOverview if missing
if 'chats: any[]' not in text.split('function PartnerOverview')[1].split(') {')[0]:
    text = re.sub(
        r'(function PartnerOverview\(\{[^\}]+\})',
        r'\1 /* NOTE: chats should be passed! */',
        text, count=1
    )
    # Actually I should properly add chats into props. I will do it manually.

