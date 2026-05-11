import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r") as f:
    text = f.read()

# We can parse the tier from the `description`.
# "TIER:Economy |"
def replacer(match):
    return "{o.description?.includes('TIER:') ? o.description.split('TIER:')[1].split(' |')[0] : 'Standard'}"

text = re.sub(r"\{o\.tier \|\| 'Standard'\}", replacer, text)
text = re.sub(r'\{b\.tier \|\| \'Standard\'\}', "{b.description?.includes('TIER:') ? b.description.split('TIER:')[1].split(' |')[0] : 'Standard'}", text)
text = re.sub(r'\{h\.tier \|\| \'Standard\'\}', "{h.description?.includes('TIER:') ? h.description.split('TIER:')[1].split(' |')[0] : 'Standard'}", text)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w") as f:
    f.write(text)
