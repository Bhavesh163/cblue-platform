import re
paths = [
    "/home/ballhog/cblue-platform/apps/web/app/[locale]/dashboard/page.tsx",
    "/home/ballhog/cblue-platform/apps/web/app/[locale]/fixers/page.tsx"
]
for path in paths:
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    for i in [741, 808]: # 742 and 809 in 1-indexed
        lines[i] = lines[i].replace("o.id", "job.id")
    for i in range(1390, 1420):
        if "job.id" in lines[i]:
            lines[i] = lines[i].replace("job.id", "o.id")
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)
