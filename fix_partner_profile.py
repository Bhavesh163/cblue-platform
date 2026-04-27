import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r') as f:
    content = f.read()

# Locate the end of PartnerProfile function or just before the final return closing tag
# Let's insert the AI assessment section before the Settings / Logout buttons in PartnerProfile

to_insert = """
      {/* AI Assessment & Profile Completion */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">🤖 {locale === "th" ? "การประเมินระดับ CBLUE AI" : locale === "zh" ? "CBLUE AI 等级评估" : "CBLUE AI Tier Assessment"}</h3>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-sm font-bold text-indigo-600 uppercase tracking-wider">{locale === "th" ? "ระดับปัจจุบัน" : locale === "zh" ? "当前等级" : "Current Tier"}</span>
                <div className="text-3xl font-extrabold text-gray-900 mt-1">Specialist</div>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500">{locale === "th" ? "คะแนนรวม" : locale === "zh" ? "总分" : "Overall Score"}</span>
                <div className="text-2xl font-bold text-indigo-700">69<span className="text-sm text-gray-400">/100</span></div>
              </div>
            </div>
            
            <div className="w-full bg-indigo-200/50 rounded-full h-2.5 mb-2">
              <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: "69%" }}></div>
            </div>
            <p className="text-xs text-indigo-800 flex items-center gap-1.5 font-medium mt-3">
              <span>⚠️</span> {locale === "th" ? "ยืนยันบางส่วน — เติมโปรไฟล์ให้สมบูรณ์เพื่อเลื่อนระดับ" : locale === "zh" ? "部分验证 — 完善个人资料以提升等级" : "Partially Verified — Complete profile to improve"}
            </p>
          </div>

          <div className="flex-[2] grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-gray-600">{locale === "th" ? "ประสบการณ์" : locale === "zh" ? "经验" : "Experience"}</span><span className="font-medium text-green-600">25/25</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-600">{locale === "th" ? "ความหลากหลายของทักษะ" : locale === "zh" ? "技能广度" : "Skills Breadth"}</span><span className="font-medium text-green-600">12/15</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-600">{locale === "th" ? "การยืนยันตัวตน KYC" : locale === "zh" ? "KYC身份验证" : "KYC Verification"}</span><span className="font-medium text-green-600">15/15</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-600">{locale === "th" ? "ผลงานและหลักฐาน" : locale === "zh" ? "作品集与证据" : "Portfolio & Evidence"}</span><span className="font-medium text-red-500">0/15</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-600">{locale === "th" ? "ความสมบูรณ์ของโปรไฟล์" : locale === "zh" ? "个人资料完整度" : "Profile Completeness"}</span><span className="font-medium text-amber-500">7/10</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-600">{locale === "th" ? "ตารางราคา" : locale === "zh" ? "价格表" : "Price List"}</span><span className="font-medium text-amber-500">6/10</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-600">{locale === "th" ? "การตรวจสอบใบรับรอง" : locale === "zh" ? "凭证验证" : "Credential Verification"}</span><span className="font-medium text-amber-500">4/10</span></div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">🔍 {locale === "th" ? "ผลการตรวจสอบ AI" : locale === "zh" ? "AI验证结果" : "AI Verification Results"}</h4>
          <ul className="text-sm space-y-2 mb-5">
            <li className="flex items-start gap-2 text-gray-600"><span className="text-red-500 mt-0.5">❌</span> {locale === "th" ? "ไม่ได้ระบุข้อมูลบริษัท" : locale === "zh" ? "未提供公司信息" : "No company info provided"}</li>
            <li className="flex items-start gap-2 text-gray-600"><span className="text-green-500 mt-0.5">✅</span> {locale === "th" ? "ประสบการณ์สอดคล้องกับประเภทงาน" : locale === "zh" ? "经验与项目类型一致" : "Experience consistent with project type"}</li>
            <li className="flex items-start gap-2 text-gray-600"><span className="text-red-500 mt-0.5">❌</span> {locale === "th" ? "ไม่ได้ระบุรายละเอียดงาน" : locale === "zh" ? "未提供工作描述" : "No work description provided"}</li>
            <li className="flex items-start gap-2 text-gray-600"><span className="text-green-500 mt-0.5">✅</span> {locale === "th" ? "เอกสาร KYC ครบถ้วน (หน้า-หลัง)" : locale === "zh" ? "KYC文件齐全（正反面）" : "KYC documents complete (front & back)"}</li>
          </ul>

          <div className="bg-blue-50 rounded-xl p-4 mb-4">
            <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-1">💡 {locale === "th" ? "วิธีเลื่อนระดับ" : locale === "zh" ? "如何升级" : "How to upgrade"}</h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              {locale === "th" ? "รับประสบการณ์เพิ่ม อัปโหลดผลงาน อัปเดตใบรับรอง และรักษาคะแนนรีวิวที่ดี — CBLUE AI จะประเมินและเลื่อนระดับคุณอัตโนมัติเมื่อคุณแก้ไขโปรไฟล์หรือสะสมประวัติการทำงาน" : locale === "zh" ? "积累更多经验、上传作品集、更新认证并保持良好的评价 —— 当您编辑个人资料或积累工作历史时，CBLUE AI 将自动重新评估并提升您的等级。" : "Gain more experience, upload portfolio work, update certifications, and maintain good reviews — CBLUE AI will automatically re-evaluate and upgrade your tier when you edit your profile or accumulate work history."}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">🔒</span>
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-700">{locale === "th" ? "ความปลอดภัย:" : locale === "zh" ? "安全:" : "Security:"}</strong> {locale === "th" ? "ข้อมูลของคุณถูกเข้ารหัสและปกป้องภายใต้ PDPA มีการตรวจสอบใบรับรองเพื่อรักษามาตรฐานของแพลตฟอร์ม" : locale === "zh" ? "您的数据已加密并受PDPA保护。验证凭据以维护平台完整性。" : "Your data is encrypted and protected under PDPA. Credentials are verified to maintain platform integrity."}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href={`${prefix}/fixers/register`} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-center font-bold text-sm rounded-xl transition shadow">
            {locale === "th" ? "แก้ไขโปรไฟล์" : locale === "zh" ? "编辑个人资料" : "Edit Profile"}
          </Link>
        </div>
      </div>
"""

# Let's insert it before the last settings block
# search for `{/* Settings */}` in the file
content = content.replace('{/* Settings */}', to_insert + '\n      {/* Settings */}')

with open('apps/web/app/[locale]/fixers/page.tsx', 'w') as f:
    f.write(content)
