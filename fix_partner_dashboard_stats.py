import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix PartnerOverview signature
text = re.sub(
    r'function PartnerOverview\(\{\s*locale,\s*partner,\s*activeJobs,\s*incomingJobs,\s*completedJobs,\s*earnings,\s*stats,\s*notifications,\s*onJobClick\s*\}\s*:\s*\{[^\}]+\}\)\s*\{',
    r'''function PartnerOverview({ locale, partner, activeJobs, incomingJobs, completedJobs, earnings, stats, notifications, chats, onJobClick }: { locale: string; partner: PartnerInfo | null; activeJobs: any[]; incomingJobs: any[]; completedJobs: any[]; earnings: any[]; stats: any; notifications: any[]; chats: any[]; onJobClick?: (job: any) => void; }) {''',
    text
)

# And fix where it's called
text = re.sub(
    r'<PartnerOverview locale=\{locale\} partner=\{partner\} activeJobs=\{activeJobs\} incomingJobs=\{incomingJobs\} completedJobs=\{completedJobs\} earnings=\{\[\]\} stats=\{stats\} notifications=\{notifications\} onJobClick=\{handleJobClick\} />',
    r'<PartnerOverview locale={locale} partner={partner} activeJobs={activeJobs} incomingJobs={incomingJobs} completedJobs={completedJobs} earnings={[]} stats={stats} notifications={notifications} chats={[]} onJobClick={handleJobClick} />',
    text
)

with open('apps/web/app/[locale]/fixers/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

