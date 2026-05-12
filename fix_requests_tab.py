import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add requests UI rendering logic
requests_tab_ui = """
        {activeTab === "requests" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-amber-500">📋</span>
                  {locale === "th" ? "คำขอใหม่" : locale === "zh" ? "新请求" : "Incoming Requests"}
                </h2>
                <div className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-bold">
                  4 {locale === "th" ? "รายการ" : locale === "zh" ? "项" : "New"}
                </div>
              </div>
              <div className="p-0">
                {/* Simulated list representing requests */}
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="p-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-amber-50/30 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded font-semibold whitespace-nowrap">
                          {locale === "th" ? "รอการตอบรับ" : locale === "zh" ? "等待接受" : "Pending Accept"}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">REQ-8A{item}B9</span>
                      </div>
                      <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                        {locale === "th" ? "ซ่อมแอร์ไม่เย็น" : locale === "zh" ? "空调不制冷" : "AC not cooling"}
                      </h3>
                      <div className="text-xs text-gray-500 mt-1">Budget: ฿1,200 | Bangkok CBD</div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition">
                        {locale === "th" ? "ปฏิเสธ" : locale === "zh" ? "拒绝" : "Decline"}
                      </button>
                      <button className="flex-1 sm:flex-none px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 shadow-sm transition">
                        {locale === "th" ? "รับงาน" : locale === "zh" ? "接受" : "Accept"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
"""

# Insert before active tab
text = re.sub(
    r'(\s*\{activeTab === "active" && \()',
    requests_tab_ui + r'\1',
    text
)

with open('apps/web/app/[locale]/fixers/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

