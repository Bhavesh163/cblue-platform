import re

with open('apps/web/app/[locale]/fixers/register/page.tsx', 'r') as f:
    content = f.read()

# Add isAlreadyFixer state
if "const [isAlreadyFixer, setIsAlreadyFixer] = useState(false);" not in content:
    content = content.replace('const [authMode, setAuthMode] = useState<"login" | "register">("register");', 
                              'const [authMode, setAuthMode] = useState<"login" | "register">("register");\n  const [isAlreadyFixer, setIsAlreadyFixer] = useState(false);')

# Update useEffect to fetch users/me
old_use_effect = """  useEffect(() => {
    try {
      const stored = localStorage.getItem("subscriber");
      if (stored) {
        const parsed = JSON.parse(stored);
        setSubscriber(parsed);
        setForm((prev) => ({
          ...prev,
          name: parsed.name || "",
          email: parsed.email || "",
          phone: parsed.phone || "",
        }));
      }
    } catch {
      // ignore
    }
  }, []);"""

new_use_effect = """  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("subscriber_token");
        if (token) {
          const res = await fetch("/api/v1/users/me", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const user = await res.json();
            if (isMounted) {
              if (user.fixer) {
                setIsAlreadyFixer(true);
                // Also set AI Tier assessment info based on their profile to show the AI card if needed
              }
              const subscriberData = { name: user.name, email: user.email, phone: user.phone };
              setSubscriber(subscriberData);
              localStorage.setItem("subscriber", JSON.stringify(subscriberData));
              setForm((prev) => ({ ...prev, name: user.name || "", email: user.email || "", phone: user.phone || "" }));
            }
          }
        } else {
          // Fallback to local storage if no token (rare but possible)
          const stored = localStorage.getItem("subscriber");
          if (stored && isMounted) {
            const parsed = JSON.parse(stored);
            setSubscriber(parsed);
            setForm((prev) => ({
              ...prev,
              name: parsed.name || "",
              email: parsed.email || "",
              phone: parsed.phone || "",
            }));
          }
        }
      } catch {
        // ignore
      }
    };
    fetchUser();
    return () => { isMounted = false; };
  }, []);"""

content = content.replace(old_use_effect, new_use_effect)

# Add the render block for isAlreadyFixer
pause_ui = """

  if (isAlreadyFixer) {
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
  }
"""

content = content.replace('return (\n    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">', pause_ui + '\n  return (\n    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">')

with open('apps/web/app/[locale]/fixers/register/page.tsx', 'w') as f:
    f.write(content)
