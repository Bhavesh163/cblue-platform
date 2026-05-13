import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Progress12Steps to have filled circle and checkmarks
new_progress = """  const Progress12Steps = ({ currentStep }: { currentStep: number }) => (
    <div className="w-full mt-4 overflow-x-auto pb-4 hide-scrollbar">
      <div className="flex items-center min-w-max relative px-2">
        <div className="absolute left-4 right-4 top-3 -translate-y-1/2 h-1 bg-gray-200 rounded-full"></div>
        <div className="absolute left-4 top-3 -translate-y-1/2 h-1 bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100))}%` }}></div>
        
        {STEPS.map((s, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div key={s} className="relative z-10 flex flex-col items-center flex-1 px-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isCompleted ? 'bg-sky-500 text-white' : isCurrent ? 'bg-sky-500 text-white shadow-[0_0_0_4px_rgba(14,165,233,0.2)]' : 'bg-white border-2 border-gray-300 text-gray-400'}`}>
                {isCompleted ? '✓' : stepNum}
              </div>
              <span className={`text-[10px] mt-2 whitespace-nowrap ${isCurrent ? 'text-sky-600 font-bold' : isCompleted ? 'text-sky-500' : 'text-gray-400'}`}>
                {s}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );"""

content = re.sub(r'const Progress12Steps = \(\{ currentStep \}: \{ currentStep: number \}\) => \(.*?\n  \);', new_progress, content, flags=re.DOTALL)

# 2. Update Upcoming Meetings array if it exists or Active Jobs mocking array...
# The user wants Recent Incoming Chats: "System" -> "Cblue", and msg: "PO-3a68-12e3 just be paid by customer to notify to proceed and let both meet."
# 3. Recent Alerts: "Partner notified to review job with PO and detail, to confirm meeting. Partner to review variation order and complete. etc"
alerts_pattern = r'const RECENT_ALERTS_MOCK = \[.*?\];'
new_alerts = """const RECENT_ALERTS_MOCK = [
    { title: "Partner notified to review job with PO and detail, to confirm meeting.", time: "Recently", status: "unread" },
    { title: "Partner to review variation order and complete.", time: "Recently", status: "unread" },
    { title: "Your order is matching", time: "Recently", status: "read" },
  ];"""
content = re.sub(alerts_pattern, new_alerts, content, flags=re.DOTALL)

chats_pattern = r'const RECENT_CHATS_MOCK = \[.*?\];'
new_chats = """const RECENT_CHATS_MOCK = [
    { name: "Cblue", msg: "Please inform us of your available time to meet at the jobsite. The chat is now active for both to use for this project.", time: "Just now", unread: 1 },
    { name: "Cblue", msg: "PO-3a68-12e3 just be paid by customer to notify to proceed and let both meet.", time: "2 mins ago", unread: 0 },
  ];"""
content = re.sub(chats_pattern, new_chats, content, flags=re.DOTALL)

# Write back
with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched Progress12Steps and Mock data!")
