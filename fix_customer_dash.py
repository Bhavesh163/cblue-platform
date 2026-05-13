import re

path = "apps/web/app/[locale]/dashboard/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# 3.1: Add "Request" tab back inside the navigation
if 'setActiveTab("requests")' not in text:
    nav_tabs_patch = """
          <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab("overview")} className={`${activeTab === "overview" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}>
              Overview
            </button>
            <button onClick={() => setActiveTab("requests")} className={`${activeTab === "requests" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
              Requests <span className="ml-2 bg-rose-100 text-rose-600 py-0.5 px-2 rounded-full text-xs">4</span>
            </button>
            <button onClick={() => setActiveTab("jobs")} className={`${activeTab === "jobs" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
              Active Jobs <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">7</span>
            </button>
"""
    # Find the nav block and replace
    text = re.sub(r'<nav className="-mb-px flex space-x-8">.*?<button onClick=\{\(\) => setActiveTab\("jobs"\)\}', nav_tabs_patch, text, flags=re.DOTALL)


# Let's completely rewrite the file's main logic to support tabs properly and the new un-responsive list for jobs/requests.
