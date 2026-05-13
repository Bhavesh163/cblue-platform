import re
path = "/home/ballhog/cblue-platform/apps/web/app/[locale]/dashboard/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in [741, 808]: # 742 and 809 in 1-indexed
    lines[i] = lines[i].replace("o.id", "job.id")

# Find line 1409 error: "job.id" where it should be "o.id"?
# Wait, look at the error for 1409: `Customer #{job.id?.slice(-4)}`
# Let's see what is on 1408
for i in range(1390, 1420):
    if "job.id" in lines[i]:
        lines[i] = lines[i].replace("job.id", "o.id")
        
with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)
