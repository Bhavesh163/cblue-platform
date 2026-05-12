import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Replace "assigned" with "accepted" globally if applicable.
# Let's target the word "assigned" and Change it.
text = text.replace('"Assigned"', '"Accepted"')
text = text.replace("'Assigned'", "'Accepted'")

# The user wants: `GREEN CONSTRUCTION Ghis Cafe · 5/11/2026 · Budget: ฿45000000 · PO-2605-8471 | Saphansong.`
# Instead of: `{job.customer} &middot; {job.date} &middot; PO: {job.poNumber || job.id.slice(-6)} &middot; {locale === "th" ? "งบ" : "Budget"}: ฿{job.budget || job.earnings || "-"} &middot; {locale === "th" ? "โครงการ" : "Project"}: {job.project || "Cblue"}`

old_detail_1 = '{job.customer} &middot; {job.date} &middot; PO: {job.poNumber || job.id.slice(-6)} &middot; {locale === "th" ? "งบ" : "Budget"}: ฿{job.budget || job.earnings || "-"} &middot; {locale === "th" ? "โครงการ" : "Project"}: {job.project || "Cblue"}'

new_detail_1 = '{job.customer} &middot; {job.date} &middot; {locale === "th" ? "งบ" : "Budget"}: ฿{job.budget || job.earnings || "-"} &middot; PO-{job.poNumber || job.id.slice(-6)} | {job.subdistrict || "Saphansong"}'

text = text.replace(old_detail_1, new_detail_1)

# Now, progress line calculation
# "the purple length (percentage) of the progress line in active jobs should not be the same between jobs with Action at incoming request needed and jobs with Waiting for customer to proceed"
# Check if there is already logic, or we replace arbitrary widths.
# We'll replace the full style for width

text = re.sub(
    r'style=\{\{ width: "[^"]+" \}\}',
    r'style={{ width: job.status === "Waiting for customer to proceed" ? "40%" : (job.status === "Action at incoming request needed" ? "10%" : "50%") }}',
    text
)


# Re-run fixing limiting in Active Jobs Overview
text = text.replace('activeJobs.map((job) => (', 'activeJobs.slice(0, 5).map((job) => (')
# Wait, this might affect PartnerJobs which shouldn't be limited!
# Let's replace ONLY inside 'Overview' portion.
# Actually, the user says "Overview shows no more than ... 5 active jobs."
# "Active Jobs page: Please make the content of this active jobs page same as revised content in overview but not limited by the number of jobs"

with open("apps/web/app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("done")
