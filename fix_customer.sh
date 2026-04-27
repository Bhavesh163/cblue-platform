sed -i 's/badge: DEMO_ACTIVE.length/badge: 0/' apps/web/app/[locale]/dashboard/page.tsx
sed -i 's/badge: DEMO_REQUESTS.length/badge: 0/' apps/web/app/[locale]/dashboard/page.tsx
sed -i 's/badge: DEMO_PROPERTY_INQUIRIES.length/badge: 0/' apps/web/app/[locale]/dashboard/page.tsx
sed -i 's/badge: DEMO_CHATS.reduce((a, c) => a + c.unread, 0)/badge: 0/' apps/web/app/[locale]/dashboard/page.tsx
sed -i 's/badge: DEMO_NOTIFICATIONS.filter(n => n.unread).length/badge: 0/' apps/web/app/[locale]/dashboard/page.tsx

cat << 'INNER_EOF' > /tmp/cust_auth.txt
  if (!loading && !subscriber) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{locale === "th" ? "กรุณาเข้าสู่ระบบ" : locale === "zh" ? "请登录" : "Please Log In"}</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            {locale === "th" ? "เข้าสู่ระบบเพื่อดูแดชบอร์ด จัดการงาน นัดหมาย แชท และดูประวัติการเรียกใช้บริการของคุณ" : locale === "zh" ? "登录以查看您的控制面板、管理工作、预约、聊天和查看您的服务历史记录。" : "Log in to view your dashboard, manage jobs, appointments, chat, and view your service history."}
          </p>
          <Link href={`${prefix}/subscription/login`} className="block w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-sky-200">
            {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In"}
          </Link>
          <p className="text-xs text-gray-400 mt-6">
            {locale === "th" ? "ยังไม่มีบัญชี?" : locale === "zh" ? "没有账户？" : "Don't have an account?"} <Link href={`${prefix}/subscription/register`} className="text-sky-600 font-bold">{locale === "th" ? "สมัครสมาชิก" : locale === "zh" ? "注册" : "Register"}</Link>
          </p>
        </div>
      </div>
    );
  }
INNER_EOF

# Insert auth block right before `return (`
sed -i -e '/  return (/r /tmp/cust_auth.txt' apps/web/app/[locale]/dashboard/page.tsx

