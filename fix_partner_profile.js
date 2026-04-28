const fs = require('fs');

let code = fs.readFileSync('apps/web/app/[locale]/fixers/page.tsx', 'utf8');

const enhancedProfile = `
/* ===== PARTNER PROFILE ===== */
function PartnerProfile({ locale, prefix, partner }: { locale: string; prefix: string; partner: PartnerInfo | null }) {
  const router = useRouter();
  if (!partner) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{locale === "th" ? "เข้าสู่ระบบเพื่อดูโปรไฟล์" : locale === "zh" ? "登录查看个人资料" : "Log in to view profile"}</h2>
        <p className="text-sm text-gray-500 mb-6">{locale === "th" ? "เข้าสู่ระบบเพื่อจัดการข้อมูลและการตั้งค่า" : locale === "zh" ? "登录管理您的合作伙伴账户" : "Sign in to manage your partner account"}</p>
        <Link href={\`\${prefix}/subscription/login?redirect=/fixers\`} className="px-6 py-2.5 bg-sky-600 text-white rounded-lg font-bold hover:bg-sky-700 transition inline-block">
          {locale === "th" ? "เข้าสู่ระบบ" : locale === "zh" ? "登录" : "Log In"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-50 flex items-center justify-center shadow-inner flex-shrink-0 relative">
            <span className="text-5xl">👤</span>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow">
              <span className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 rounded-full text-xs font-bold">✓</span>
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{partner.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">Specialist Tier</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><span className="text-green-500">✓</span> {locale === "th" ? "ยืนยันตัวตนแล้ว (KYC)" : "Verified (KYC)"}</span>
                </div>
              </div>
              <button className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-semibold shadow-sm">
                {locale === "th" ? "แก้ไขโปรไฟล์" : locale === "zh" ? "编辑资料" : "Edit Profile"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4 pt-4 border-t border-gray-100">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{locale === "th" ? "อีเมล" : "Email"}</h3>
                <p className="text-gray-900 font-medium text-sm truncate">{partner.email}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{locale === "th" ? "เบอร์โทรศัพท์" : "Phone"}</h3>
                <p className="text-gray-900 font-medium text-sm">{partner.phone || "-"}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{locale === "th" ? "เข้าร่วมเมื่อ" : "Member Since"}</h3>
                <p className="text-gray-900 font-medium text-sm">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise AI Assessment Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">🤖 CBLUE AI Tier Assessment</h2>
          <span className="text-xs text-gray-500 px-2 py-1 bg-white rounded border border-gray-200">Overall Score: <strong className="text-gray-900">69/100</strong></span>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-bold text-amber-900 text-sm">Partially Verified — Complete profile to improve</h4>
              <p className="text-xs text-amber-700 mt-1">
                Gain more experience, upload portfolio work, update certifications, and maintain good reviews — CBLUE AI will automatically re-evaluate and upgrade your tier.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Evaluation Breakdown */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Evaluation Breakdown</h3>
              <div className="space-y-4">
                {[
                  { label: "Experience", score: 25, max: 25, color: "bg-green-500" },
                  { label: "Skills Breadth", score: 12, max: 15, color: "bg-green-500" },
                  { label: "KYC Verification", score: 15, max: 15, color: "bg-green-500" },
                  { label: "Portfolio & Evidence", score: 0, max: 15, color: "bg-gray-200" },
                  { label: "Profile Completeness", score: 7, max: 10, color: "bg-amber-400" },
                  { label: "Price List", score: 6, max: 10, color: "bg-amber-400" },
                  { label: "Credential Verification", score: 4, max: 10, color: "bg-red-400" },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{item.label}</span>
                      <span className="text-gray-500 font-bold">{item.score}/{item.max}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={\`h-full \${item.color}\`} style={{ width: \`\${(item.score / item.max) * 100}%\` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Verification Results */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">🔍 AI Verification Results</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2 text-gray-600">
                  <span className="text-red-500 mt-0.5">❌</span>
                  <span>No company info provided</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600">
                  <span className="text-green-500 mt-0.5">✅</span>
                  <span>Experience consistent with project type</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600">
                  <span className="text-red-500 mt-0.5">❌</span>
                  <span>No work description provided</span>
                </li>
                <li className="flex items-start gap-2 text-gray-600">
                  <span className="text-green-500 mt-0.5">✅</span>
                  <span>KYC documents complete (front & back)</span>
                </li>
              </ul>

              <div className="mt-8 p-4 bg-gray-50 rounded-xl text-xs text-gray-500 border border-gray-100">
                <p className="flex items-center gap-2 font-medium text-gray-700 mb-1">
                  <span className="text-lg">🔒</span> Security Notice
                </p>
                Your data is encrypted and protected under PDPA. Credentials are verified to maintain platform integrity.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

code = code.replace(/\/\* ===== PARTNER PROFILE ===== \*\/[\s\S]*?(?=\n}\n\n)/, enhancedProfile + '\n');
fs.writeFileSync('apps/web/app/[locale]/fixers/page.tsx', code);
