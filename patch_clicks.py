import re

# PATCH DASHBOARD
with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Fix inactive cards in Overview Tab, Active Tab, Requests Tab
# Find hover:bg-gray-50/50 and add onClick
text = re.sub(
    r'(<div key=\{[^\}]+\} className="p-6 hover:bg-gray-50\/50 transition)',
    r'\1 cursor-pointer" onClick={() => onOrderClick ? onOrderClick(b) : null}',
    text
)
# Note: In the above replace, the original ends with ` transition">`. So we want to replace `transition">` with `transition cursor-pointer" onClick={...}>`
text = re.sub(
    r'(<div key=\{b.id\} className="p-6 hover:bg-gray-50\/50 transition)">',
    r'\1 cursor-pointer" onClick={() => onOrderClick ? onOrderClick(b) : null}>',
    text
)

text = re.sub(
    r'(<div key=\{[^\}]+\} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer)">',
    r'\1" onClick={() => onOrderClick ? onOrderClick(o) : null}>',
    text
)

# Fix Standard fallback - change {o.tier || 'Standard'} to use extracted tier from description if possible
text = re.sub(
    r'\{o\.tier \|\| \'Standard\'\}',
    r"{o.description?.includes('TIER:Economy') ? 'ECONOMY' : o.description?.includes('TIER:Standard') ? 'Standard' : (o.tier || 'Standard')}",
    text
)

# Fix b.tier fallback
text = re.sub(
    r'\{b\.tier \|\| \'Standard\'\}',
    r"{b.description?.includes('TIER:Economy') ? 'ECONOMY' : b.description?.includes('TIER:Standard') ? 'Standard' : (b.tier || 'Standard')}",
    text
)


with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)


# PATCH PARTNER ZONE
with open("apps/web/app/[locale]/partner-zone/page.tsx", "r", encoding="utf-8") as f:
    ptext = f.read()

# Find row maps for jobs and trigger setWaitModalJob(job)
ptext = re.sub(
    r'(<div key=\{i\} className="p-6 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer)">',
    r'\1" onClick={() => handleJobClick(job)}>',
    ptext
)

ptext = re.sub(
    r'\{job\.tier \|\| \'Standard\'\}',
    r"{job.description?.includes('TIER:Economy') ? 'ECONOMY' : job.description?.includes('TIER:Standard') ? 'Standard' : (job.tier || 'Standard')}",
    ptext
)
ptext = re.sub(
    r'\{job\.tier\}',
    r"{job.description?.includes('TIER:ECONOMY') || job.description?.includes('TIER:Economy') ? 'ECONOMY' : job.description?.includes('TIER:Standard') ? 'Standard' : (job.tier || 'Standard')}",
    ptext
)


with open("apps/web/app/[locale]/partner-zone/page.tsx", "w", encoding="utf-8") as f:
    f.write(ptext)
