with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# Fix modal text
text = text.replace(
    'Waiting for Partner Confirmation</h2>',
    'Review PO Details</h2>'
)
text = text.replace(
    'Customer has placed a request for \n{waitModalOrder.service}. Please review the PO details below and confirm.</p>',
    'Customer has placed a request for {waitModalOrder.service}. Please review the PO details below and confirm.</p>'
)
text = text.replace(
    'Customer has placed a request for {waitModalOrder.service}. Please review the PO details below and confirm.</p>',
    'Customer has placed a request for {waitModalOrder.serviceTh || waitModalOrder.service}. Please review the PO details below and accept or decline.</p>'
)

old_buttons = """<div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${job.progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{job.progress}% {locale === "th" ? "ดำเนินการแล้ว" : locale === "zh" ? "已完成" : "completed"}</p>
              </div>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition">{locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat"}</button>
            </div>"""

new_buttons = """<div className="flex items-center gap-4">
              {['MATCHING', 'CREATED', 'PENDING'].includes(job.status?.toUpperCase()) ? (
                <>
                  <div className="flex-1">
                    <p className="text-sm text-amber-600 font-bold mb-1">Awaiting Your Confirmation</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{job.description || "Review project info and files"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition" onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(job); }}>{locale === "th" ? "ดูและรับงาน" : locale === "zh" ? "查看并接受" : "Review & Accept"}</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${job.progress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{job.progress}% {locale === "th" ? "ดำเนินการแล้ว" : locale === "zh" ? "已完成" : "completed"}</p>
                  </div>
                  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition" onClick={(e) => { e.stopPropagation(); window.location.href = `${prefix}/chat/${job.id}`; }}>{locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chat"}</button>
                </>
              )}
            </div>"""

text = text.replace(old_buttons, new_buttons)

with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

