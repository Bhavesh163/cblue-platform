import re

file_path = "apps/web/app/[locale]/fixers/register/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the dependency of checkFixer to include isEditMode
old_dep = "    }, [populateFixerForm]);"
new_dep = "    }, [populateFixerForm, isEditMode]);"
content = content.replace(old_dep, new_dep)

# Fix checkFixer missing populate when isEditMode
# The original code looks like:
'''
        if (data.isFixer) {
          setIsEditMode(true);
        }
'''
# We need to change that to populate
old_logic = """        if (data.isFixer) {
          setIsEditMode(true);
        }"""
new_logic = """        if (data.isFixer) {
          setIsEditMode(true);
          const fixerProfile = await fixerRes.json();
          populateFixerForm(data, fixerProfile);
        }"""
content = content.replace(old_logic, new_logic)

# Replace headings
old_h1 = """          <h1 className="text-3xl font-bold text-gray-900">
            {locale === "th"
              ? "สมัครเป็นช่าง CBLUE และมืออาชีพ"
              : locale === "zh"
                ? "注册为 CBLUE 技工与专业人士"
                : "Register as CBLUE Fixer & Pro"}
          </h1>"""
new_h1 = """          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode 
              ? (locale === "th" ? "แก้ไขโปรไฟล์ช่าง" : locale === "zh" ? "编辑技工个人资料" : "Edit Fixer Profile")
              : (locale === "th"
              ? "สมัครเป็นช่าง CBLUE และมืออาชีพ"
              : locale === "zh"
                ? "注册为 CBLUE 技工与专业人士"
                : "Register as CBLUE Fixer & Pro")}
          </h1>"""
content = content.replace(old_h1, new_h1)

old_p = """          <p className="mt-3 text-lg text-gray-500">
            {locale === "th"
              ? "สมัครเพื่อเข้าถึงบริการมืออาชีพและจัดการคำขอของคุณ"
              : locale === "zh"
                ? "注册以访问专业服务并管理您的请求"
                : "Sign up to access professional services and manage your requests"}
          </p>"""
new_p = """          <p className="mt-3 text-lg text-gray-500">
            {isEditMode 
              ? (locale === "th" ? "อัปเดตข้อมูลและข้อมูลประจำตัวของคุณ" : locale === "zh" ? "更新您的信息和身份信息" : "Update your information and credentials")
              : (locale === "th"
              ? "สมัครเพื่อเข้าถึงบริการมืออาชีพและจัดการคำขอของคุณ"
              : locale === "zh"
                ? "注册以访问专业服务并管理您的请求"
                : "Sign up to access professional services and manage your requests")}
          </p>"""
content = content.replace(old_p, new_p)

# Replace buttons
old_btn = """              <button
                type="submit"
                disabled={submitting || !form.consent || !recaptchaToken}
                className={`w-full py-3 px-6 text-base font-semibold rounded-xl transition-colors ${
                  form.consent && recaptchaToken
                    ? "text-white bg-blue-700 hover:bg-blue-800"
                    : "text-gray-400 bg-gray-200 cursor-not-allowed"
                }`}
              >
                {submitting
                  ? locale === "th"
                    ? "กำลังส่ง..."
                    : locale === "zh"
                      ? "提交中..."
                      : "Submitting..."
                  : locale === "th"
                    ? "สมัครเป็นช่าง CBLUE"
                    : locale === "zh"
                      ? "注册成为 CBLUE 技工"
                      : "Register as CBLUE Fixer"}
              </button>"""
new_btn = """              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="flex-1 py-3 px-6 text-base font-semibold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {locale === "th" ? "ยกเลิก" : locale === "zh" ? "取消" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.consent || !recaptchaToken}
                  className={`flex-1 py-3 px-6 text-base font-semibold rounded-xl transition-colors ${
                    form.consent && recaptchaToken
                      ? "text-white bg-blue-700 hover:bg-blue-800"
                      : "text-gray-400 bg-gray-200 cursor-not-allowed"
                  }`}
                >
                  {submitting
                    ? locale === "th"
                      ? "กำลังส่ง..."
                      : locale === "zh"
                        ? "提交中..."
                        : "Submitting..."
                    : isEditMode
                      ? (locale === "th" ? "บันทึกการแก้ไข" : locale === "zh" ? "保存更改" : "Save Changes")
                      : locale === "th"
                        ? "สมัครเป็นช่าง CBLUE"
                        : locale === "zh"
                          ? "注册成为 CBLUE 技工"
                          : "Register as CBLUE Fixer"}
                </button>
              </div>"""
content = content.replace(old_btn, new_btn)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched!")
