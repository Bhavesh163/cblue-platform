import re

with open('apps/web/app/[locale]/dashboard/page.tsx', 'r') as f:
    content = f.read()

# I want to remove:
#   if (!loading && !subscriber) {
# ...
#   }
# 
#   return (

to_remove = r'''  if \(!loading && !subscriber\) \{\n    return \(\n      <div className="min-h-screen bg-\[\#F8FAFC\] flex flex-col items-center justify-center p-6">\n        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">\n          <div className="text-6xl mb-4">👤</div>\n          <h2 className="text-2xl font-bold text-gray-900 mb-3">\{locale === "th" \? "กรุณาเข้าสู่ระบบ" : locale === "zh" \? "请登录" : "Please Log In"\}</h2>\n          <p className="text-gray-500 mb-8 leading-relaxed">\n            \{locale === "th" \? "เข้าสู่ระบบเพื่อดูแดชบอร์ด จัดการงาน นัดหมาย แชท และดูประวัติการเรียกใช้บริการของคุณ" : locale === "zh" \? "登录以查看您的控制面板、管理工作、预约、聊天和查看您的服务历史记录。" : "Log in to view your dashboard, manage jobs, appointments, chat, and view your service history."\}\n          </p>\n          <Link href={`\$\{prefix\}/subscription/login`} className="block w-full py-3\.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-sky-200">\n            \{locale === "th" \? "เข้าสู่ระบบ" : locale === "zh" \? "登录" : "Log In"\}\n          </Link>\n          <p className="text-xs text-gray-400 mt-6">\n            \{locale === "th" \? "ยังไม่มีบัญชี\?" : locale === "zh" \? "没有账户？" : "Don't have an account\?"\} <Link href={`\$\{prefix\}/subscription/register`} className="text-sky-600 font-bold">\{locale === "th" \? "สมัครสมาชิก" : locale === "zh" \? "注册" : "Register"\}</Link>\n          </p>\n        </div>\n      </div>\n    \);\n  \}

  return \('''

content = re.sub(to_remove, '  return (', content)

# Wrap tabs with subscriber check
to_replace = r'''        \{\/\* Tab Navigation \*\/\}\n        <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-200 p-1\.5 mb-6 overflow-x-auto">'''

replacement = r'''        {/* Main Content */}
        {subscriber && !loading && (
          <>
            <div className="flex gap-1 bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 mb-6 overflow-x-auto">'''

content = re.sub(to_replace, replacement, content)

# Close the wrapper before the footer or wherever it ends.
# I will find `<div className="my-10 border-t border-gray-200" />`
target_str = '<div className="my-10 border-t border-gray-200" />'
replacement_str = '          </>\n        )}\n\n        ' + target_str
content = content.replace(target_str, replacement_str)


with open('apps/web/app/[locale]/dashboard/page.tsx', 'w') as f:
    f.write(content)
