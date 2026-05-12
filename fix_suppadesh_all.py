import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Update issue image lookup in Modal
old_modal_image = r"let url = waitModalOrder\.image \|\| waitModalOrder\.fileUrl \|\| \(waitModalOrder\.projectImages && waitModalOrder\.projectImages\[0\]\) \|\| \(waitModalOrder\.images && waitModalOrder\.images\[0\]\) \|\| \(waitModalOrder\.metadata\?\.images && waitModalOrder\.metadata\.images\[0\]\);"
new_modal_image = "let url = waitModalOrder?.issueImage || waitModalOrder?.image || waitModalOrder?.fileUrl || (waitModalOrder?.projectImages && waitModalOrder?.projectImages[0]) || (waitModalOrder?.images && waitModalOrder?.images[0]) || (waitModalOrder?.metadata?.images && waitModalOrder?.metadata.images[0]) || (waitModalOrder?.metadata?.issueImageUrl) || (waitModalOrder?.metadata?.issueImage);"
text = re.sub(old_modal_image, new_modal_image, text)

# 2. Fix budget in PO Modal to format exactly like the request (e.g. ฿45000000 instead of N/A)
old_budget_modal = r"฿\{waitModalOrder\.budget \|\| waitModalOrder\.estimatedPrice \|\| waitModalOrder\.finalPrice \|\| '0'\}"
new_budget_modal = "฿{waitModalOrder.budget || waitModalOrder.estimatedPrice || waitModalOrder.finalPrice || '0'}"
text = text.replace(old_budget_modal, new_budget_modal) # Just making sure it's correct

# 3. Add mapping for 14 months of earnings
old_earnings_map = """  const earningsData = [
    { month: "Jan", amount: 45000 },
    { month: "Feb", amount: 52000 },
    { month: "Mar", amount: 48000 },
    { month: "Apr", amount: 61000 },
    { month: "May", amount: 58000 },
    { month: "Jun", amount: 65000 },
    { month: "Jul", amount: 72000 }
  ];"""
new_earnings_map = """  const earningsData = [
    { month: "May 25", amount: 45000 },
    { month: "Jun 25", amount: 52000 },
    { month: "Jul 25", amount: 48000 },
    { month: "Aug 25", amount: 51000 },
    { month: "Sep 25", amount: 49000 },
    { month: "Oct 25", amount: 53000 },
    { month: "Nov 25", amount: 55000 },
    { month: "Dec 25", amount: 58000 },
    { month: "Jan 26", amount: 61000 },
    { month: "Feb 26", amount: 65000 },
    { month: "Mar 26", amount: 62000 },
    { month: "Apr 26", amount: 68000 },
    { month: "May 26", amount: 72000 },
    { month: "Jun 26", amount: 75000 }
  ];"""
text = text.replace(old_earnings_map, new_earnings_map)

# 4. Limit recent incoming chats to 4 and recent alerts to 4
text = text.replace("tasks.slice(0, 3).map", "tasks.slice(0, 4).map")
text = text.replace("tasks.slice(0, 2).map", "tasks.slice(0, 4).map")

# 5. Fix PO numbers in active jobs mappedOrders to follow upcoming requests (use id slice 0,4 and 4,8 format)
text = text.replace("PO: {job.poNumber || job.id.slice(-6)}", "PO-{job.poNumber || (job.id.slice(0, 4) + '-' + job.id.slice(4, 8))} | {job.subdistrict || 'Saphansong'}")

# Fix Active Jobs in PartnerJobs to have same formatting as overview
old_partner_jobs_map = """              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shadow-sm"></div>
                <div>
                  <h3 className="font-bold text-gray-900">{o.service} <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">{o.tier || 'Standard'}</span></h3>
                  <p className="text-sm text-gray-500 mt-1">{o.user?.name || "Customer"} &middot; {new Date(o.createdAt).toLocaleDateString()} &middot; Budget: ฿{o.estimatedPrice || "0"} &middot; PO-{o.id.slice(0, 4)}-{o.id.slice(4, 8)} | {o.user?.subdistrict || "Saphansong"}</p>
<div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full" style={{ width: (o.status === "COMPLETED" ? "100%" : (["IN_PROGRESS", "CONFIRMED", "ACCEPTED"].includes(o.status) ? "40%" : "15%")) }} /></div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{o.status}</span>
                <span className="font-bold text-gray-900 mt-1">฿{o.finalPrice || o.estimatedPrice || 0}</span>"""

new_partner_jobs_map = """              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl shadow-sm"></div>
                <div>
                  <h3 className="font-bold text-gray-900">{o.service}</h3>
                  <p className="text-sm text-gray-500 mt-1">{o.user?.name || "Customer"} &middot; {new Date(o.createdAt).toLocaleDateString()} &middot; Budget: ฿{o.estimatedPrice || "0"}</p>
                  <p className="text-sm text-gray-500 mt-1">PO-{o.id.slice(0, 4)}-{o.id.slice(4, 8)} | TIER:{o.tier?.toUpperCase() || 'ECONOMY'} | {o.user?.subdistrict || "Saphansong"}</p>
<div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full" style={{ width: (o.status === "COMPLETED" ? "100%" : (["IN_PROGRESS", "CONFIRMED", "ACCEPTED"].includes(o.status) ? "40%" : "15%")) }} /></div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="font-bold text-gray-900 mt-1">{o.tier?.toUpperCase() || 'ECONOMY'}</span>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${o.status === "CONFIRMED" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{o.status === "CONFIRMED" ? "Waiting for customer to proceed" : "Action at incoming request needed"}</span>"""

text = text.replace(old_partner_jobs_map, new_partner_jobs_map)


with open("apps/web/app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

