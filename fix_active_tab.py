import re

with open('apps/web/app/[locale]/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the active tab rendering logic to match the overview
old_active_tab = r'''      {activeTab === "active" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6 pb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col">
            <h2 className="font-bold text-gray-900">Active Jobs</h2>
            <span className="text-gray-500 text-sm font-bold">{combinedActive.length}</span>
          </div>
          <div className="px-6 pt-4">
            {combinedActive.map((m, i) => renderActiveCard(m, i))}
          </div>
        </div>
      )}'''

new_active_tab = r'''      {activeTab === "active" && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-gray-800">Active Jobs</h2>
              <span className="text-gray-500 font-bold text-sm">{combinedActive.length}</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {combinedActive.map((m, i) => renderActiveCard(m, i))}
          </div>
        </div>
      )}'''

text = text.replace(old_active_tab, new_active_tab)

with open('apps/web/app/[locale]/dashboard/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

