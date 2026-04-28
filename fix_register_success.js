const fs = require('fs');

let code = fs.readFileSync('apps/web/app/[locale]/fixers/register/page.tsx', 'utf8');

const successScreen = `
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-2xl w-full">
          {/* Header */}
          <div className="p-8 text-center border-b border-gray-100 bg-white">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            <p className="text-gray-500 text-sm">The CBLUE team will review your information and KYC. Approval within 1–3 business days.</p>
          </div>

          {/* AI Assessment Card */}
          <div className="bg-gradient-to-r from-slate-50 to-white px-8 py-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">🤖 CBLUE AI Tier Assessment</h3>
            <span className="text-xs text-gray-500 px-2 py-1 bg-white rounded border border-gray-200">Overall Score: <strong className="text-gray-900">69/100</strong></span>
          </div>

          <div className="p-8 space-y-8">
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-bold text-amber-900 text-sm">Partially Verified — Complete profile to improve</h4>
                <p className="text-xs text-amber-700 mt-1">
                  Gain more experience, upload portfolio work, update certifications, and maintain good reviews — CBLUE AI will automatically re-evaluate and upgrade your tier when you edit your profile or accumulate work history.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Evaluation Breakdown */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Evaluation Breakdown</h4>
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
                <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">🔍 AI Verification Results</h4>
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
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-500 border border-gray-100 flex items-start gap-3">
              <span className="text-lg">🔒</span>
              <p>Security: Your data is encrypted and protected under PDPA. Credentials are verified to maintain platform integrity.</p>
            </div>
            
            <div className="text-center pt-4 border-t border-gray-100">
              <Link href={\`\${prefix}/fixers\`} className="inline-block px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow transition">
                {locale === "th" ? "ไปที่แดชบอร์ดของคุณ" : "Go to your Dashboard"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
`;

code = code.replace(/if \(success\) \{[\s\S]*?\}\n\n  return \(/, successScreen + '\n\n  return (');
fs.writeFileSync('apps/web/app/[locale]/fixers/register/page.tsx', code);
