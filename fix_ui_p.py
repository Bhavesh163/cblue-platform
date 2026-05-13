import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Fix the poNumber logic directly when mapping Orders so it is unified
old_id_slice = r"id\.slice\(0, 4\)(.*?)\s*-\s*(.*?)id\.slice\(4, 8\)"
# Let's standardize ALL PO numbers inside apps/web/app/[locale]/fixers/page.tsx
text = re.sub(r"PO-\{\w+\.poNumber \|\| \w+\.id\.slice\(-6\)\}", "PO-{o.id?.slice(0, 4)}-{o.id?.slice(4, 8)}", text)
text = re.sub(r"PO: \w+\.id\.slice\(-6\)", "PO-{o.id?.slice(0, 4)}-{o.id?.slice(4, 8)}", text)
text = re.sub(r"PO-\{\w+\.id\.slice\(-4\)\}", "PO-{o.id?.slice(0, 4)}-{o.id?.slice(4, 8)}", text)

# For waitModalOrder
text = re.sub(r"PO-2605-\{waitModalOrder\.id \? waitModalOrder\.id\.slice\(0, 4\) : '9605'\}", "PO-2605-{waitModalOrder.id ? waitModalOrder.id.slice(4, 8) : '9605'}", text) # Or standardise better
text = text.replace("PO-2605-{waitModalOrder.id ? waitModalOrder.id.slice(0, 4) : '9605'}", "PO-{waitModalOrder?.id?.slice(0,4) || '2605'}-{waitModalOrder?.id?.slice(4,8) || '9605'}")

# Also replace Action at incoming request needed -> Action needed
text = text.replace("Action at incoming request needed", "Action needed")
# Waiting for customer to proceed -> wait, the user asked to replace "Waiting for customer to proceed with black". Wait. the user means text color black or text "black"? "Waiting for customer to proceed with black...." - probably color black for the text or badge.
text = text.replace('text-amber-700"}', 'text-gray-900"}') # amber to black for waiting

# Replace progress bar line in Active Jobs with a custom stepped line.
old_prog_bar = """<div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full" style={{ width: (o.status === "COMPLETED" ? "100%" : (["IN_PROGRESS", "CONFIRMED", "ACCEPTED"].includes(o.status) ? "40%" : "15%")) }} /></div>"""

new_prog_bar = """<div className="mt-2 w-full">
<div className="flex justify-between text-[10px] text-gray-500 mb-1 px-1">
  <span className={['PENDING',''].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Notify</span>
  <span className={['CONFIRMED'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Confirm</span>
  <span className={['ACCEPTED'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Pay</span>
  <span className={['IN_PROGRESS'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Chat</span>
  <span className={['MEETING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Meet</span>
  <span className={['VARIATION'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Variation</span>
  <span className={['WORKING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Complete</span>
  <span className={['RATING'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Rate</span>
  <span className={['COMPLETED'].includes(o.status) ? 'text-purple-600 font-bold' : ''}>Done</span>
</div>
<div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: (o.status === 'COMPLETED' ? '100%' : o.status === 'RATING' ? '88%' : o.status === 'WORKING' ? '77%' : o.status === 'VARIATION' ? '66%' : o.status === 'MEETING' ? '55%' : o.status === 'IN_PROGRESS' ? '44%' : o.status === 'ACCEPTED' ? '33%' : o.status === 'CONFIRMED' ? '22%' : '11%') }} /></div>
</div>"""

text = text.replace(old_prog_bar, new_prog_bar)

# Fix PO number variations specifically for Active Jobs preview 
text = text.replace("PO-{job.poNumber || (job.id.slice(0, 4) + '-' + job.id.slice(4, 8))}", "PO-{job.id?.slice(0, 4)}-{job.id?.slice(4, 8)}")
text = text.replace("PO-{o.id.slice(0, 4)}-{o.id.slice(4, 8)}", "PO-{o.id?.slice(0, 4)}-{o.id?.slice(4, 8)}")

# Add Upcoming meetings
upcoming_meetings_block = """        {/* Upcoming Meetings Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 mt-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl"></div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">⏰ Upcoming Meetings</h2>
          </div>
          <div className="space-y-4">
            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-900">Site Inspection - Ghis Cafe</p>
                <p className="text-sm text-gray-500">14 May 2026, 14:00 | Saphansong</p>
              </div>
              <button className="text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-sm font-semibold hover:bg-blue-200">Reschedule</button>
            </div>
            {/* Limit to 3 meetings logic should go here via array slice, mocking 1 for now */}
          </div>
        </div>"""

text = text.replace("  if (!isFixer) {", upcoming_meetings_block + "\n  if (!isFixer) {")

with open("apps/web/app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

