import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update progress calculation
old_progress = "progress: o.status === 'COMPLETED' ? 100 : o.status === 'IN_PROGRESS' ? 50 : 20,"
new_progress = "progress: o.status === 'COMPLETED' ? 100 : (['IN_PROGRESS', 'CONFIRMED', 'ACCEPTED'].includes(o.status) ? 40 : 15),"
text = text.replace(old_progress, new_progress)

# 2. Update mappedOrders mapping properties to include proper budget and formatted dates/POs
old_mapped_1 = """    const mappedOrders = orders.map(o => ({
      id: o.id,
      customer: o.user?.name || "Customer",
      type: o.orderType?.toLowerCase() || "household","""
new_mapped_1 = """    const mappedOrders = orders.map(o => ({
      id: o.id,
      poNumber: o.id.length >= 8 ? `${o.id.slice(0, 4)}-${o.id.slice(4, 8)}` : o.id,
      subdistrict: o.user?.subdistrict || "Saphansong",
      customer: o.user?.name || "Customer",
      type: o.orderType?.toLowerCase() || "household","""
text = text.replace(old_mapped_1, new_mapped_1)

old_fee = 'fee: o.estimatedPrice ? `฿${o.estimatedPrice}` : "TBD"'
new_fee = 'fee: o.estimatedPrice ? `฿${o.estimatedPrice.toLocaleString()}` : "0", budget: o.estimatedPrice ? o.estimatedPrice.toLocaleString() : "0"'
text = text.replace(old_fee, new_fee)

# 3. In `PartnerActiveJobs`/ `Active Jobs Preview`/ `PartnerJobs` correct the rendering format!
old_partner_active_job_text = '<p className="text-sm text-gray-500 mt-1">Customer #{o.id.slice(-4)} &middot; {new Date(o.createdAt).toLocaleDateString()}</p>'
new_partner_active_job_text = '<p className="text-sm text-gray-500 mt-1">{o.user?.name || "Customer"} &middot; {new Date(o.createdAt).toLocaleDateString()} &middot; Budget: ฿{o.estimatedPrice || "0"} &middot; PO-{o.id.slice(0, 4)}-{o.id.slice(4, 8)} | {o.user?.subdistrict || "Saphansong"}</p>\\n<div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full" style={{ width: (o.status === "COMPLETED" ? "100%" : (["IN_PROGRESS", "CONFIRMED", "ACCEPTED"].includes(o.status) ? "40%" : "15%")) }} /></div>'
text = text.replace(old_partner_active_job_text, new_partner_active_job_text)

old_preview_text = '{job.customer} &middot; {job.date} &middot; {locale === "th" ? "งบ" : "Budget"}: ฿{job.budget || job.earnings || "-"} &middot; PO-{job.poNumber || job.id.slice(-6)} | {job.subdistrict || "Saphansong"}'
new_preview_text = '{job.customer} &middot; {job.date} &middot; {locale === "th" ? "งบ" : "Budget"}: ฿{job.budget || "0"} &middot; PO-{job.poNumber || job.id.slice(-6)} | {job.subdistrict || "Saphansong"}'
text = text.replace(old_preview_text, new_preview_text)

# Also fix the `Budget: ฿{job.budget || job.earnings || "-"}` in `Active Jobs Preview` and `PartnerJobs` where it has TH variables
text = text.replace('฿{job.budget || job.earnings || "-"}', '฿{job.budget || "0"}')

with open("apps/web/app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

