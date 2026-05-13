import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Modify Progress12Steps into Progress8Steps
# Replace STEPS = ["Match", ... "Done"];
old_steps = 'const STEPS = ["Match", "Select", "PO", "Notify", "Confirm", "Pay", "Chat", "Meet", "Variation", "Complete", "Rate", "Done"];'

new_steps = """const STEPS_FULL = ["Match", "Select", "PO", "Notify", "Confirm", "Pay", "Chat", "Meet", "Variation", "Complete", "Rate", "Done"];
  const STEPS = ["Notify", "Confirm", "Pay", "Chat", "Meet", "Variation", "Complete", "Rate", "Done"];"""

text = text.replace(old_steps, new_steps)

# Modify Progress12Steps component mapping to map STEPS correctly
old_prog = """        {STEPS.map((s, i) => {
          const stepNum = i + 1;"""

new_prog = """        {STEPS.map((s, i) => {
          const stepNum = i + 4; // Notify starts at 4"""

text = text.replace(old_prog, new_prog)

# 2. Modify renderActiveCard to not have rounded-3xl and mb-4, but rather just be a list row.
# We will change it to have `px-6 py-4 flex items-center...` but the user wants to keep the existing card layout. Let's just remove the mb-4 and border/shadow.
old_rendered = 'className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 transition mb-4 flex flex-col gap-3"'
new_rendered = 'className="block hover:bg-gray-50/50 p-6 transition flex flex-col gap-3"'
text = text.replace(old_rendered, new_rendered)

old_active_jobs1 = """            <div>
              {ACTIVE_MOCK.map((m, i) => renderActiveCard(m, i))}
            </div>"""

new_active_jobs1 = """            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {ACTIVE_MOCK.map((m, i) => renderActiveCard(m, i))}
            </div>"""
text = text.replace(old_active_jobs1, new_active_jobs1)

with open("apps/web/app/[locale]/dashboard/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)

print("Patched!")
