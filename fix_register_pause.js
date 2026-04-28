const fs = require('fs');

let code = fs.readFileSync('apps/web/app/[locale]/fixers/register/page.tsx', 'utf8');

const newCheck = `
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("subscriber_token");
    if (token) {
      fetch("/api/v1/users/me", { headers: { Authorization: \`Bearer \${token}\` } })
        .then(res => res.json())
        .then(data => {
          if (data && data.fixer) {
            setAlreadyRegistered(true);
          }
        }).catch(() => {});
    }
  }, []);

  if (alreadyRegistered) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden text-center p-12 border border-gray-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
            {locale === "th" ? "คุณเป็นช่างของ CBLUE แล้ว" : locale === "zh" ? "您已注册成为CBLUE技工" : "You are already a CBLUE Fixer"}
          </h1>
          <p className="text-gray-500 mb-8">
            {locale === "th" 
              ? "คุณสามารถจัดการโปรไฟล์และรับงานได้ที่หน้า Partner Dashboard ของคุณ" 
              : locale === "zh" 
              ? "您可以在合作伙伴仪表板上管理您的个人资料并接单" 
              : "You can manage your profile and accept jobs from your Partner Dashboard."}
          </p>
          <Link href={\`\${prefix}/fixers\`} className="inline-block px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold shadow-lg transition">
            {locale === "th" ? "ไปที่ Partner Dashboard" : locale === "zh" ? "前往合作伙伴仪表板" : "Go to Partner Dashboard"}
          </Link>
        </div>
      </div>
    );
  }
`;

code = code.replace(/const \[loading, setLoading\] = useState\(false\);/, 'const [loading, setLoading] = useState(false);\n' + newCheck);
fs.writeFileSync('apps/web/app/[locale]/fixers/register/page.tsx', code);
