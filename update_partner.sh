cat << 'INNER_EOF' > /tmp/partner.txt
const DEMO_ACTIVE = [
  { id: "as-1", type: "household" as ServiceType, service: "Plumbing Repair", serviceTh: "ซ่อมประปา", serviceZh: "管道维修", partner: "Customer #A2X", tier: "Standard", status: "IN_PROGRESS", date: "2026-04-15", fee: "฿2,500" },
  { id: "as-2", type: "household" as ServiceType, service: "AC Maintenance", serviceTh: "ซ่อมแอร์", serviceZh: "空调维护", partner: "Customer #B7K", tier: "Corporate", status: "CONFIRMED", date: "2026-04-16", fee: "฿4,000" },
  { id: "as-3", type: "household" as ServiceType, service: "Electrical Work", serviceTh: "งานไฟฟ้า", serviceZh: "电气工程", partner: "Customer #C4M", tier: "Economy", status: "PENDING", date: "2026-04-17", fee: "฿1,800" }
];

const DEMO_HISTORY = [];

const DEMO_NOTIFICATIONS = [
  { id: "n1", msg: "Customer #A2X sent a new message", msgTh: "ลูกค้า #A2X ส่งข้อความใหม่", msgZh: "客户 #A2X 发送了新消息", time: "2m ago", timeTh: "2 นาทีที่ผ่านมา", timeZh: "2分钟前", dot: "bg-sky-500", unread: true },
  { id: "n2", msg: "You have 3 new requests", msgTh: "คุณมีคำขอใหม่ 3 รายการ", msgZh: "您有3个新请求", time: "15m ago", timeTh: "15 นาทีที่ผ่านมา", timeZh: "15分钟前", dot: "bg-amber-500", unread: true },
  { id: "n3", msg: "Payment received ฿3,200", msgTh: "ได้รับเงิน ฿3,200", msgZh: "收到付款 ฿3,200", time: "1h ago", timeTh: "1 ชั่วโมงที่ผ่านมา", timeZh: "1小时前", dot: "bg-green-500", unread: true }
];

const DEMO_CHATS = [
  { id: "c1", name: "Customer #A2X", service: "Plumbing", lastMsg: "Thanks, waiting for you", lastMsgTh: "ขอบคุณครับ รอช่างอยู่", lastMsgZh: "谢谢，在等你", time: "2m ago", timeTh: "2 นาทีที่ผ่านมา", timeZh: "2分钟前", unread: 2, online: true },
  { id: "c2", name: "Customer #B7K", service: "AC", lastMsg: "Which day is convenient?", lastMsgTh: "วันไหนสะดวกคะ?", lastMsgZh: "哪天方便？", time: "30m ago", timeTh: "30 นาทีที่ผ่านมา", timeZh: "30分钟前", unread: 1, online: true },
  { id: "c3", name: "Customer #C4M", service: "Electrical", lastMsg: "Job is done, thanks", lastMsgTh: "งานเสร็จแล้วครับ ขอบคุณ", lastMsgZh: "工作完成了，谢谢", time: "2h ago", timeTh: "2 ชั่วโมงที่ผ่านมา", timeZh: "2小时前", unread: 0, online: false }
];

const DEMO_REQUESTS = [
  { id: "r1", service: "Interior Design", serviceTh: "ออกแบบภายใน", serviceZh: "室内设计", customer: "Customer #D9P", date: "2026-04-18", budget: "฿15,000", tier: "Specialist", urgent: false },
  { id: "r2", service: "Landscaping", serviceTh: "จัดสวน", serviceZh: "园林绿化", customer: "Customer #E3R", date: "2026-04-19", budget: "฿25,000", tier: "Expert", urgent: true }
];
INNER_EOF

# Replace data arrays
sed -i -e '/const DEMO_ACTIVE = \[/,/];/c\'"$(cat /tmp/partner.txt | sed 's/$/\\/')" apps/web/app/[locale]/partner/dashboard/page.tsx
sed -i 's/\\$//' apps/web/app/[locale]/partner/dashboard/page.tsx

cat << 'INNER_EOF2' > /tmp/partner2.txt
export default function PartnerDashboard() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState("overview");
  const [subscriber, setSubscriber] = useState<SubscriberInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("subscriber");
    if (saved) {
      try {
        setSubscriber(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const prefix = `/${locale}`;

  const tabs = [
    { id: "overview", icon: "📊", label: locale === "th" ? "ภาพรวม" : locale === "zh" ? "概览" : "Overview" },
    { id: "active", icon: "🔧", label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "进行中" : "Active Work", badge: 3 },
    { id: "requests", icon: "📋", label: locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "New Requests", badge: 3 },
    { id: "chat", icon: "💬", label: locale === "th" ? "แชท" : locale === "zh" ? "聊天" : "Chats", badge: 3 },
    { id: "notifications", icon: "🔔", label: locale === "th" ? "แจ้งเตือน" : locale === "zh" ? "通知" : "Alerts", badge: 3 },
    { id: "profile", icon: "👤", label: locale === "th" ? "โปรไฟล์" : locale === "zh" ? "个人资料" : "Profile" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 md:pb-0">
      {/* Header logic ... */}
      <div className="bg-sky-600 text-white pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl"></div>
          <div className="absolute top-40 -left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-overlay filter blur-3xl"></div>
        </div>
        <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {locale === "th" ? "พาร์ทเนอร์แดชบอร์ด" : locale === "zh" ? "合作伙伴仪表板" : "Partner Dashboard"}
            </h1>
            <p className="text-sky-100">{subscriber ? `${locale === "th" ? "ยินดีต้อนรับ" : locale === "zh" ? "欢迎" : "Welcome back"}, ${subscriber.name}` : locale === "th" ? "จัดการงานและการนัดหมาย" : locale === "zh" ? "管理您的工作和预约" : "Manage your work and appointments"}</p>
          </div>
          {subscriber && (
            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-sky-600 text-xl font-bold shadow-inner">
                {subscriber.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold">{subscriber.name}</p>
                <div className="flex gap-2 text-xs text-sky-100">
                  <span>{subscriber.phone}</span>
                  <span className="bg-green-500/20 text-green-100 px-1.5 rounded">Corporate</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-12 relative z-20">
        {/* Desktop Tabs */}
        <div className="hidden md:flex bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6 gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition ${
                activeTab === t.id ? "bg-sky-50 text-sky-700" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
              {t.badge && (
                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === t.id ? "bg-sky-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mb-6">
          {activeTab === "overview" && <OverviewTab locale={locale} />}
          {activeTab === "active" && <ActiveTab locale={locale} />}
          {activeTab === "requests" && <RequestsTab locale={locale} />}
          {activeTab === "chat" && <ChatTab locale={locale} />}
          {activeTab === "notifications" && <NotificationsTab locale={locale} />}
          {activeTab === "profile" && <ProfileTab locale={locale} prefix={prefix} subscriber={subscriber} />}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around p-2 z-50 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {tabs.slice(0, 5).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl relative transition-all ${
              activeTab === t.id ? "text-sky-600" : "text-gray-400 hover:text-sky-500"
            }`}
          >
            {activeTab === t.id && <span className="absolute top-0 w-8 h-1 bg-sky-500 rounded-b-full"></span>}
            <span className={`text-2xl mb-1 ${activeTab === t.id ? "transform -translate-y-1" : ""} transition-transform duration-200`}>{t.icon}</span>
            <span className="text-[10px] font-medium leading-none">{t.label}</span>
            {t.badge && (
              <span className="absolute top-1 right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ locale }: { locale: string }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "进行中" : "Active Work", value: "3", icon: "🔧", color: "bg-blue-50 text-blue-600" },
          { label: locale === "th" ? "เสร็จสิ้น" : locale === "zh" ? "已完成" : "Completed", value: "47", icon: "✅", color: "bg-green-50 text-green-600" },
          { label: locale === "th" ? "รายได้เดือนนี้" : locale === "zh" ? "本月收入" : "Monthly Revenue", value: "฿18,500", icon: "💰", color: "bg-purple-50 text-purple-600" },
          { label: locale === "th" ? "คะแนน" : locale === "zh" ? "评分" : "Rating", value: "4.8 ⭐", icon: "🏆", color: "bg-amber-50 text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center hover:shadow-md transition cursor-pointer group">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3 ${s.color} group-hover:scale-110 transition-transform`}>
              {s.icon}
            </div>
            <p className="text-gray-500 text-xs font-medium mb-1">{s.label}</p>
            <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">💰 {locale === "th" ? "รายได้รายเดือน" : locale === "zh" ? "月度收入" : "Monthly Revenue"}</h3>
          </div>
          <div className="flex justify-between items-end h-40 gap-2">
            {[
              { val: 12500, label: locale === "th" ? "ม.ค." : "Jan", height: "50%" },
              { val: 15200, label: locale === "th" ? "ก.พ." : "Feb", height: "65%" },
              { val: 18800, label: locale === "th" ? "มี.ค." : "Mar", height: "85%" },
              { val: 18500, label: locale === "th" ? "เม.ย." : "Apr", height: "80%" },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <span className="text-xs font-bold text-gray-400 group-hover:text-sky-600">฿{(bar.val/1000).toFixed(1)}k</span>
                <div className="w-full bg-gray-100 rounded-t-xl relative overflow-hidden h-full flex items-end">
                  <div className="w-full bg-gradient-to-t from-sky-400 to-sky-300 rounded-t-xl transition-all duration-1000 group-hover:opacity-80" style={{ height: bar.height }}></div>
                </div>
                <span className="text-[10px] text-gray-500 font-medium">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">📋 {locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "New Requests"}</h3>
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-lg">2 {locale === "th" ? "รอรับงาน" : "Pending"}</span>
          </div>
          <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
            {DEMO_REQUESTS.map(r => (
              <div key={r.id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-sm text-gray-900">{locale === "th" ? r.serviceTh : locale === "zh" ? r.serviceZh : r.service}</span>
                  <span className="text-sky-600 font-bold text-sm">{r.budget}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{r.customer} &middot; {r.date}</p>
                <div className="flex gap-2">
                  <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1.5 rounded font-bold text-xs">{locale === "th" ? "รับงาน" : "Accept"}</button>
                  <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1.5 rounded font-bold text-xs">{locale === "th" ? "ปฏิเสธ" : "Decline"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🔧 {locale === "th" ? "งานปัจจุบัน" : locale === "zh" ? "进行中" : "Active Work"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_ACTIVE.map((job) => (
          <div key={job.id} className="p-6 hover:bg-gray-50 transition">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🔧</span>
                  <h3 className="font-bold text-gray-900">{locale === "th" ? job.serviceTh : locale === "zh" ? job.serviceZh : job.service}</h3>
                </div>
                <p className="text-sm text-gray-500">{job.partner} &middot; {job.date}</p>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 bg-sky-100 text-sky-700 text-[10px] font-bold rounded-md block mb-1">{job.tier}</span>
                <span className="font-bold text-gray-900 text-sm">{job.fee}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-amber-600">{locale === "th" ? "กำลังดำเนินการ" : "In Progress"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestsTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">📋 {locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "New Requests"}</h2>
      </div>
      <div className="p-4 grid gap-4">
        {DEMO_REQUESTS.map(r => (
          <div key={r.id} className="border border-gray-200 rounded-xl p-5 hover:border-sky-300 transition">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{locale === "th" ? r.serviceTh : locale === "zh" ? r.serviceZh : r.service}</h3>
                <p className="text-sm text-gray-500">{r.customer} &middot; {r.date}</p>
                {r.urgent && <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md">{locale === "th" ? "เร่งด่วน" : "Urgent"}</span>}
              </div>
              <div className="text-right">
                <span className="block text-lg font-bold text-sky-600">{r.budget}</span>
                <span className="text-xs text-gray-400">{r.tier}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold text-sm">{locale === "th" ? "รับ" : "Accept"}</button>
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-bold text-sm">{locale === "th" ? "ปฏิเสธ" : "Decline"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

INNER_EOF2

# Replace component implementation
sed -i -e '/export default function CustomerDashboard() {/,$d' apps/web/app/[locale]/partner/dashboard/page.tsx
cat /tmp/partner2.txt >> apps/web/app/[locale]/partner/dashboard/page.tsx

cat << 'INNER_EOF3' >> apps/web/app/[locale]/partner/dashboard/page.tsx
function ChatTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">💬 {locale === "th" ? "แชททั้งหมด" : "All Chats"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_CHATS.map((c) => (
          <div key={c.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition cursor-pointer">
            <div className="relative">
              <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center font-bold text-lg">
                {c.name.charAt(0)}
              </div>
              {c.online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-1">
                <h3 className="font-bold text-gray-900 truncate pr-2">{c.name}</h3>
                <span className="text-xs text-gray-400">{locale === "th" ? c.timeTh : c.time}</span>
              </div>
              <p className="text-sm text-gray-500 truncate">{locale === "th" ? c.lastMsgTh : c.lastMsg}</p>
            </div>
            {c.unread > 0 && (
              <span className="w-5 h-5 flex items-center justify-center bg-sky-600 text-white text-[10px] font-bold rounded-full">
                {c.unread}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsTab({ locale }: { locale: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">🔔 {locale === "th" ? "การแจ้งเตือน" : "Notifications"}</h2>
      </div>
      <div className="divide-y divide-gray-50">
        {DEMO_NOTIFICATIONS.map((n) => (
          <div key={n.id} className={`flex gap-4 p-4 hover:bg-gray-50 transition ${n.unread ? "bg-sky-50/30" : ""}`}>
            <span className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${n.dot}`}></span>
            <div>
              <p className="text-sm text-gray-800">{locale === "th" ? n.msgTh : n.msg}</p>
              <p className="text-xs text-gray-400 mt-1">{locale === "th" ? n.timeTh : n.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileTab({ locale, prefix, subscriber }: { locale: string; prefix: string; subscriber: SubscriberInfo | null }) {
  const router = useRouter();
  if (!subscriber) return <div>{locale === "th" ? "กรุณาเข้าสู่ระบบ" : "Please log in"}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
              {subscriber.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{subscriber.name}</h2>
              <p className="text-sm text-gray-500">{subscriber.email}</p>
              <p className="text-sm text-gray-500">{subscriber.phone}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md mb-2">KYC ✓ {locale === "th" ? "ยืนยันแล้ว" : "Verified"}</span>
            <span className="block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-md">Corporate</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-xl text-center">
            <p className="text-xs text-gray-500 mb-1">{locale === "th" ? "อัตราตอบรับ" : "Acceptance Rate"}</p>
            <p className="text-xl font-bold text-gray-900">96%</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl text-center">
            <p className="text-xs text-gray-500 mb-1">{locale === "th" ? "ลูกค้าประจำ" : "Repeat Clients"}</p>
            <p className="text-xl font-bold text-gray-900">12</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <button
          onClick={() => { localStorage.removeItem("subscriber"); localStorage.removeItem("subscriber_token"); router.push(prefix); }}
          className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm rounded-xl transition"
        >
          🚪 {locale === "th" ? "ออกจากระบบ" : "Logout"}
        </button>
      </div>
    </div>
  );
}
INNER_EOF3

