const fs = require('fs');

let code = fs.readFileSync('apps/web/app/[locale]/properties/register/page.tsx', 'utf8');

const successScreen = `
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-lg text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{locale === "th" ? "ลงประกาศสำเร็จ" : "Listing Published"}</h2>
          <p className="text-gray-600 mb-8">{locale === "th" ? "อสังหาริมทรัพย์ของคุณได้รับการเผยแพร่ในระบบแล้ว ผู้เช่าหรือผู้ซื้อสามารถติดต่อคุณได้ทันที" : "Your property is now live and visible to potential tenants or buyers."}</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => { setSuccess(false); setForm(initialForm); window.scrollTo(0,0); }} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition shadow-sm">
              {locale === "th" ? "ลงประกาศเพิ่ม" : "List Another"}
            </button>
            <Link href={\`\${prefix}/fixers\`} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition">
              {locale === "th" ? "ไปที่หน้าแดชบอร์ด" : "Go to Dashboard"}
            </Link>
          </div>
        </div>
      </div>
    );
  }
`;

code = code.replace(/if \(success\) \{[\s\S]*?\}\n\n  return \(/, successScreen + '\n\n  return (');
fs.writeFileSync('apps/web/app/[locale]/properties/register/page.tsx', code);
