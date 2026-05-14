import re

file_path = "app/[locale]/dashboard/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace renderActiveCard
import re

new_render = """  const renderActiveCard = (item: any, idx: number) => (
    <div key={idx} className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-gray-100 transition cursor-pointer gap-4" onClick={() => handleOrderClick ? handleOrderClick(item) : null}>
      <div className="flex items-center gap-4">
         <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center font-bold">{(item.title || item.service || "C").charAt(0)}</div>
         <div>
           <h3 className="font-bold text-gray-900">{item.title || item.service} <span className="text-sm font-normal text-gray-500">· {item.po || `PO-${item.id.slice(0,8)}`}</span></h3>
           <p className="text-sm text-gray-600 mt-0.5">{item.customer || "Customer"} · {item.date || new Date().toLocaleDateString()}</p>
         </div>
      </div>
      <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
        <div className="flex flex-col gap-1 w-full sm:w-64">
           <Progress12Steps currentStep={item.step || 4} />
        </div>
        <div className="text-right">
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${item.actionNeeded ? 'bg-red-50 text-red-700' : 'bg-blue-100 text-blue-700 whitespace-nowrap'}`}>{item.actionNeeded ? 'Action Needed' : 'In Progress'}</span>
        </div>
      </div>
    </div>
  );
"""

content = re.sub(r'const renderActiveCard = \(item: any, idx: number\) => \((.*?)\n  \);', new_render.strip(), content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

