import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix project details line to remove duplicate PO
content = re.sub(
    r'\{waitModalOrder\.description \|\| waitModalOrder\.service\}',
    r'{(waitModalOrder.description || waitModalOrder.service || "").replace(/^PO-[\\w-]+\\s*\\|\\s*(TIER:[a-zA-Z]+\\s*\\|\\s*)?/, "")}',
    content
)

# 2. Fix accept PO local storage update
accept_po_code = """
                    const res = await fetch(`/api/v1/orders/${waitModalOrder.id}/status`, {
"""

new_accept_po_code = """
                    try {
                      let wf = JSON.parse(localStorage.getItem("cblue_workflow") || "{}");
                      if(wf) {
                        wf.step = 6;
                        localStorage.setItem("cblue_workflow", JSON.stringify(wf));
                      }
                    } catch(e) {}
                    const res = await fetch(`/api/v1/orders/${waitModalOrder.id}/status`, {
"""

content = content.replace(accept_po_code, new_accept_po_code)

# 3. Add Upcoming meetings
content = content.replace('      <h3 className="text-xl font-bold mb-4">Recent Alerts</h3>', '''      <div className="flex gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-4">Recent Alerts</h3>''')

content = content.replace('      <div className="space-y-4">', '')
content = re.sub(r'(<div className="bg-sky-50 p-4 rounded-xl shadow-sm text-sky-800 text-sm">[\s\S]*?</div>)', r'<div className="space-y-4">\n        \1', content, count=1)

with open('apps/web/app/[locale]/fixers/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
