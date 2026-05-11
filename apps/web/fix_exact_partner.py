import re

with open("app/[locale]/partner-zone/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace(
    'function OverviewTab({ t, locale, prefix, profile, activeJobs, pastJobs, notifications, properties }: {',
    'function OverviewTab({ t, locale, prefix, profile, activeJobs, pastJobs, notifications, properties, onOrderClick }: {\n  onOrderClick?: (job: any) => void;'
)

text = text.replace(
    '<OverviewTab t={t} locale={locale} prefix={prefix} profile={userProfile} activeJobs={activeJobs} pastJobs={pastJobs} notifications={DEMO_NOTIFICATIONS} properties={DEMO_PROPERTIES} />',
    '<OverviewTab t={t} locale={locale} prefix={prefix} profile={userProfile} activeJobs={activeJobs} pastJobs={pastJobs} notifications={DEMO_NOTIFICATIONS} properties={DEMO_PROPERTIES} onOrderClick={(job) => {\n          if (job && (job.status === "pending" || job.status === "MATCHING" || job.status === "matching")) {\n            setWaitModalJob(job);\n          } else {\n            setSelectedJob(job.id); setActiveTab("chat");\n          }\n        }} />'
)

text = text.replace(
    '<div key={job.id} className="px-6 py-4 flex items-center gap-3 hover:bg-gray-50/50 transition">',
    '<div key={job.id} className="px-6 py-4 flex items-center gap-3 hover:bg-gray-50/50 transition cursor-pointer" onClick={() => onOrderClick && onOrderClick(job)}>'
)

with open("app/[locale]/partner-zone/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

