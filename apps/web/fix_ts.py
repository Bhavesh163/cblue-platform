with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "PartnerDashboard" in line or i > 1000:
        if "onJobClick={setWaitModalOrder}" in line:
            lines[i] = line.replace("onJobClick={setWaitModalOrder}", "onJobClick={() => {}}")

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)
