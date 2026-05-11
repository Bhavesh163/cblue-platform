import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    d_text = f.read()

# Fix Tier
d_text = re.sub(
    r'\{o\.tier \|\| \'Standard\'\}',
    r"{o.description?.includes('TIER:Economy') ? 'ECONOMY' : o.description?.includes('TIER:Standard') ? 'Standard' : (o.tier || 'Standard')}",
    d_text
)
d_text = re.sub(
    r'\{b\.tier \|\| \'Standard\'\}',
    r"{b.description?.includes('TIER:Economy') ? 'ECONOMY' : b.description?.includes('TIER:Standard') ? 'Standard' : (b.tier || 'Standard')}",
    d_text
)

# Tabs propagation
d_text = d_text.replace(
    'activeOrders={activeOrders} historyOrders={historyOrders}',
    'activeOrders={activeOrders} historyOrders={historyOrders} onOrderClick={handleOrderClick}'
)
d_text = d_text.replace(
    'activeOrders: any[]; historyOrders: any[]',
    'activeOrders: any[]; historyOrders: any[]; onOrderClick?: (o: any) => void'
)

# Replace cursor-pointer maps in Dashboard
def replace_o(match):
    s = match.group(1)
    return s + ' onClick={() => onOrderClick ? onOrderClick(o) : null}'

d_text = re.sub(
    r'(<div key=\{i\} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer")',
    replace_o,
    d_text
)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(d_text)


# Fix Partner Zone
with open("apps/web/app/[locale]/partner-zone/page.tsx", "r", encoding="utf-8") as f:
    p_text = f.read()

p_text = re.sub(
    r'\{job\.tier\}',
    r"{job.description?.includes('TIER:Economy') ? 'ECONOMY' : job.description?.includes('TIER:Standard') ? 'Standard' : (job.tier || 'Standard')}",
    p_text
)
p_text = re.sub(
    r'\{job\.tier \|\| \'Standard\'\}',
    r"{job.description?.includes('TIER:Economy') ? 'ECONOMY' : job.description?.includes('TIER:Standard') ? 'Standard' : (job.tier || 'Standard')}",
    p_text
)

with open("apps/web/app/[locale]/partner-zone/page.tsx", "w", encoding="utf-8") as f:
    f.write(p_text)


# Fixer page (The Fixers dashboard)
with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    f_text = f.read()

f_text = re.sub(
    r'\{req\.tier\}',
    r"{req.description?.includes('TIER:Economy') || req.tier === 'ECONOMY' ? 'ECONOMY' : req.description?.includes('TIER:Standard') ? 'Standard' : (req.tier || 'Standard')}",
    f_text
)
f_text = re.sub(
    r'\{req\.tier \|\| \'Standard\'\}',
    r"{req.description?.includes('TIER:Economy') || req.tier === 'ECONOMY' ? 'ECONOMY' : req.description?.includes('TIER:Standard') ? 'Standard' : (req.tier || 'Standard')}",
    f_text
)
f_text = re.sub(
    r'\{o\.tier \|\| \'Standard\'\}',
    r"{o.description?.includes('TIER:Economy') || o.tier === 'ECONOMY' ? 'ECONOMY' : o.description?.includes('TIER:Standard') ? 'Standard' : (o.tier || 'Standard')}",
    f_text
)

with open("apps/web/app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(f_text)
