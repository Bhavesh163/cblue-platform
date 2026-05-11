with open("app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(len(lines)):
    if i > 700:
        lines[i] = lines[i].replace('onOrderClick ? onOrderClick(o) : null', 'handleOrderClick ? handleOrderClick(o) : null')

with open("app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)
