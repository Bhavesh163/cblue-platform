import re

with open('apps/web/app/[locale]/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# We need to remove one closing `</div>` right before `{waitModalOrder && (`
text = re.sub(
    r'</div>\s*\{waitModalOrder && \(',
    r'{waitModalOrder && (',
    text,
    count=1
)

with open('apps/web/app/[locale]/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

