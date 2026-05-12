import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make PartnerJobs match read-only mode from overview
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

# Replace the existing PartnerJobs with new_partner_jobs
text = re.sub(r'function PartnerJobs\(\{.*?\}(?=\n/\* ===== PARTNER PROPERTIES)', new_partner_jobs, text, flags=re.DOTALL)
# Wait, the end of PartnerJobs is right before /* ===== PARTNER PROPERTIES
# Actually regex dotall can be tricky. Let's do it safer.
