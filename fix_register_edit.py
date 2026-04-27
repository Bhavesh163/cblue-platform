with open('apps/web/app/[locale]/fixers/register/page.tsx', 'r') as f:
    content = f.read()

# Make isAlreadyFixer dismissable or use a URL param like ?edit=1
old_pause_ui = """  if (isAlreadyFixer) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mt-10">
          <div className="bg-white rounded-2xl shadow-xl p-10 border border-gray-100">
            <div className="text-6xl mb-6">👷‍♂️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {locale === "th" ? "คุณเป็นพาร์ทเนอร์ของเราแล้ว!" : locale === "zh" ? "您已经是我们的合作伙伴！" : "You are already a registered partner!"}
            </h1>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
              {locale === "th"
                ? "บัญชีนี้ได้ลงทะเบียนเป็นพาร์ทเนอร์ CBLUE แล้ว คุณสามารถจัดการโปรไฟล์ ดูระดับ AI ของคุณ รับงาน และจัดการตารางเวลาได้ที่หน้าแดชบอร์ดพาร์ทเนอร์"
                : locale === "zh"
                ? "此帐户已注册为CBLUE合作伙伴。您可以在合作伙伴仪表板上管理您的个人资料、查看您的AI等级、接受工作并管理您的时间表。"
                : "This account is already registered as a CBLUE Partner. You can manage your profile, view your AI Tier, receive jobs, and manage your schedule on the Partner Dashboard."}
            </p>
            <Link
              href={`${prefix}/fixers`}
              className="inline-block px-8 py-4 bg-purple-600 text-white rounded-xl font-bold text-lg hover:bg-purple-700 transition shadow-lg shadow-purple-200"
            >
              {locale === "th" ? "ไปยังหน้าแดชบอร์ดพาร์ทเนอร์" : locale === "zh" ? "转到合作伙伴仪表板" : "Go to Partner Dashboard"}
            </Link>
          </div>
        </div>
      </div>
    );
  }"""

new_pause_ui = """  if (isAlreadyFixer) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mt-10">
          <div className="bg-white rounded-2xl shadow-xl p-10 border border-gray-100">
            <div className="text-6xl mb-6">👷‍♂️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {locale === "th" ? "คุณเป็นพาร์ทเนอร์ของเราแล้ว!" : locale === "zh" ? "您已经是我们的合作伙伴！" : "You are already a registered partner!"}
            </h1>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
              {locale === "th"
                ? "บัญชีนี้ได้ลงทะเบียนเป็นพาร์ทเนอร์ CBLUE แล้ว คุณสามารถจัดการโปรไฟล์ ดูระดับ AI ของคุณ รับงาน และจัดการตารางเวลาได้ที่หน้าแดชบอร์ดพาร์ทเนอร์"
                : locale === "zh"
                ? "此帐户已注册为CBLUE合作伙伴。您可以在合作伙伴仪表板上管理您的个人资料、查看您的AI等级、接受工作并管理您的时间表。"
                : "This account is already registered as a CBLUE Partner. You can manage your profile, view your AI Tier, receive jobs, and manage your schedule on the Partner Dashboard."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`${prefix}/fixers`}
                className="px-8 py-4 bg-purple-600 text-white rounded-xl font-bold text-lg hover:bg-purple-700 transition shadow-lg shadow-purple-200"
              >
                {locale === "th" ? "ไปยังแดชบอร์ดพาร์ทเนอร์" : locale === "zh" ? "转到合作伙伴仪表板" : "Go to Partner Dashboard"}
              </Link>
              <button
                onClick={() => setIsAlreadyFixer(false)}
                className="px-8 py-4 bg-white text-purple-600 border-2 border-purple-200 rounded-xl font-bold text-lg hover:bg-purple-50 transition"
              >
                {locale === "th" ? "แก้ไขโปรไฟล์ / อัปเดตข้อมูล" : locale === "zh" ? "编辑资料 / 更新信息" : "Edit Profile / Update Info"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }"""

content = content.replace(old_pause_ui, new_pause_ui)
with open('apps/web/app/[locale]/fixers/register/page.tsx', 'w') as f:
    f.write(content)
