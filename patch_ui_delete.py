import re

dashboard_path = "apps/web/app/[locale]/dashboard/page.tsx"
with open(dashboard_path, "r", encoding="utf-8") as f:
    d_content = f.read()

target = """            <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition text-sm font-semibold">
              {locale === "th" ? "แก้ไขโปรไฟล์" : locale === "zh" ? "编辑资料" : "Edit Profile"}
            </button>"""
new_target = """            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition text-sm font-semibold">
                {locale === "th" ? "แก้ไขโปรไฟล์" : locale === "zh" ? "编辑资料" : "Edit Profile"}
              </button>
              <button onClick={() => {
                if (confirm(locale === "th" ? "ยืนยันการลบบัญชีและข้อมูลทั้งหมดตามกฎหมาย PDPA?" : "Confirm deleting your account and all data per PDPA law?")) {
                  fetch('/api/v1/users/me', { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
                  .then(() => { localStorage.clear(); window.location.href = '/subscription/login'; });
                }
              }} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition text-sm font-semibold">
                {locale === "th" ? "ลบบัญชี" : locale === "zh" ? "删除账户" : "Delete Account"}
              </button>
            </div>"""

if target in d_content:
    d_content = d_content.replace(target, new_target)
    print("Dashboard patched with delete button")
else:
    print("Dashboard pattern not found")

with open(dashboard_path, "w", encoding="utf-8") as f:
    f.write(d_content)

fixers_path = "apps/web/app/[locale]/fixers/page.tsx"
with open(fixers_path, "r", encoding="utf-8") as f:
    f_content = f.read()

f_target = """              <Link href={`${prefix}/fixers/register?edit=1`} className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-semibold shadow-sm">
                {locale === "th" ? "แก้ไขโปรไฟล์" : locale === "zh" ? "编辑资料" : "Edit Profile"}
              </Link>"""
f_new_target = """              <div className="flex gap-2">
                <Link href={`${prefix}/fixers/register?edit=1`} className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm font-semibold shadow-sm">
                  {locale === "th" ? "แก้ไขโปรไฟล์" : locale === "zh" ? "编辑资料" : "Edit Profile"}
                </Link>
                <button onClick={() => {
                  if (confirm(locale === "th" ? "ยืนยันการลบบัญชีและข้อมูลทั้งหมดตามกฎหมาย PDPA?" : "Confirm deleting your account and all data per PDPA law?")) {
                    fetch('/api/v1/users/me', { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
                    .then(() => { localStorage.clear(); window.location.href = '/subscription/login'; });
                  }
                }} className="px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-semibold shadow-sm">
                  {locale === "th" ? "ลบบัญชี" : locale === "zh" ? "删除账户" : "Delete Account"}
                </button>
              </div>"""

if f_target in f_content:
    f_content = f_content.replace(f_target, f_new_target)
    print("Fixers dashboard patched with delete button")
else:
    print("Fixers dashboard pattern not found")

with open(fixers_path, "w", encoding="utf-8") as f:
    f_content = f_content.replace('href={`${prefix}/', 'href={`')
    f.write(f_content)

