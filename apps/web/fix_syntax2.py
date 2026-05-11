import re

# dashboard
with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Fix OverviewTab destructuring
text = text.replace(
    'function OverviewTab({ locale, subscriber, activeOrders, historyOrders, chats, notifications }:',
    'function OverviewTab({ locale, subscriber, activeOrders, onOrderClick, historyOrders, chats, notifications }:'
)
# Fix RequestsTab destructuring
text = text.replace(
    'function RequestsTab({ activeOrders, historyOrders }:',
    'function RequestsTab({ activeOrders, historyOrders, onOrderClick }:'
)
text = text.replace(
    'activeOrders: any[]; historyOrders: any[]',
    'activeOrders: any[]; historyOrders: any[]; onOrderClick?: (o: any) => void'
)

# Fix onClick in CustomerDashboard wrappers
# In CustomerDashboard, the function is handleOrderClick.
# If we mistakenly inserted onOrderClick, replace it with handleOrderClick
text = re.sub(r'const handleOrderClick = \(o: any\) => \{ if \(\[\'MATCHING\', \'CREATED\'\]\.includes\(o\.status\)\) setWaitModalOrder\(o\); else window\.location\.href = `\$\{prefix\}/chat/\$\{o\.id\}`; \};\n\s+const activeOrders',
    r'const handleOrderClick = (o: any) => { if ([\'MATCHING\', \'CREATED\'].includes(o.status)) setWaitModalOrder(o); else window.location.href = `${prefix}/chat/${o.id}`; };\n  const onOrderClick = handleOrderClick;\n  const activeOrders', text)

with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

# fixers page
with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    'function OverviewTab({ locale, partner, activeOrders, historyOrders }:',
    'function OverviewTab({ locale, partner, activeOrders, historyOrders, onOrderClick }:'
)
text = text.replace(
    'function RequestsTab({ activeOrders, historyOrders }:',
    'function RequestsTab({ activeOrders, historyOrders, onOrderClick }:'
)

text = re.sub(
    r'(function PartnerDashboard[^\)]+\) \{[\s\S]+?const \[waitModalOrder, setWaitModalOrder\] = useState<any>\(null\);)',
    r'\1\n  const onOrderClick = setWaitModalOrder;',
    text,
    count=1
)

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
