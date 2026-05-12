import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

new_partner_jobs = '''function PartnerJobs({ locale, activeJobs, onJobClick }: { locale: string; activeJobs: any[]; onJobClick?: (job: any) => void; }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2"> {locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "进行中的工作" : "Active Jobs"}</h2>
        <span className="text-xs bg-sky-100 text-sky-700 px-2.5 py-1 rounded-full font-bold">{activeJobs.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {activeJobs.map((job) => (
          <div key={job.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-lg"></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? job.serviceTh : locale === "zh" ? job.serviceZh : job.service}</p>
              <p className="text-xs text-gray-500">{job.customer} &middot; {job.date} &middot; PO: {job.poNumber || job.id.slice(-6)} &middot; {locale === "th" ? "งบ" : "Budget"}: ฿{job.budget || job.earnings || "-"} &middot; {locale === "th" ? "โครงการ" : "Project"}: {job.project || "Cblue"}</p>
              <div className="mt-1.5 w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${job.progress}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[job.tier] || ""}`}>{job.tier}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[job.status] || ""}`}>{getStatusLabel(job.status, locale)}</span>
              <span className="text-xs font-bold text-gray-700">{job.earnings}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}'''

new_partner_requests = '''function PartnerRequests({ locale, incomingJobs, onJobClick }: { locale: string; incomingJobs: any[]; onJobClick?: (job: any) => void; }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">{locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新订单" : "Incoming Requests"}</h2>
        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-bold">{incomingJobs.length}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {incomingJobs.map((req) => (
          <div key={req.id} className="px-6 py-4 flex items-center gap-4 hover:bg-amber-50 transition cursor-pointer" onClick={() => onJobClick && onJobClick(req)}>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-lg"></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{locale === "th" ? req.serviceTh : locale === "zh" ? req.serviceZh : req.service}</p>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">{locale === "th" ? "โปรดพิจารณาและรับงานนี้เพื่อดำเนินการต่อ" : locale === "zh" ? "请审核并接受此工作以继续" : "Please review and accept this job to proceed"}</p>
              <p className="text-xs text-gray-500 mt-0.5">{req.customer} &middot; {req.date} &middot; {locale === "th" ? "งบ" : locale === "zh" ? "预算" : "Budget"}: {req.fee}</p>
              <p className="text-xs text-gray-500 mt-1" style={{ whiteSpace: "pre-wrap" }}>{req.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TIER_STYLE[req.tier] || ""}`}>{req.tier}</span>
              {req.urgency === "urgent" && <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700">{locale === "th" ? "เร่งด่วน" : locale === "zh" ? "紧急" : "Urgent"}</span>}
              <button onClick={(e) => { e.stopPropagation(); onJobClick && onJobClick(req); }} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition">{locale === "th" ? "รับ" : locale === "zh" ? "接受" : "Accept"}</button>
              <button className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition">{locale === "th" ? "ปฏิเสธ" : locale === "zh" ? "拒绝" : "Decline"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}'''

start_jobs = text.find('function PartnerJobs({')
end_jobs = text.find('function PartnerHistory({') # safe endpoint

if start_jobs != -1 and end_jobs != -1:
    text = text[:start_jobs] + new_partner_jobs + "\n\n" + new_partner_requests + "\n\n" + text[end_jobs:]
    
    # Add to tab render logic
    if '{activeTab === "requests" &&' not in text:
        text = text.replace(
            '{activeTab === "active" && <PartnerJobs locale={locale} activeJobs={activeJobs} onJobClick={handleJobClick} />}',
            '{activeTab === "requests" && <PartnerRequests locale={locale} incomingJobs={incomingJobs} onJobClick={handleJobClick} />}\n        {activeTab === "active" && <PartnerJobs locale={locale} activeJobs={activeJobs} onJobClick={handleJobClick} />}'
        )

    # Status dictionary addition
    text = text.replace('"ACCEPTED": { en: "Accepted", th: "รับงานแล้ว", zh: "已接受" }', '"ACCEPTED": { en: "Waiting for customer to proceed", th: "รอให้ลูกค้าดำเนินการ", zh: "等待客户处理" }')

    with open('apps/web/app/[locale]/fixers/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

