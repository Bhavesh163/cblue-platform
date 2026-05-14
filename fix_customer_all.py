import re

with open("apps/web/app/[locale]/dashboard/page.tsx", "r", encoding="utf-8") as f:
    t = f.read()

# Make Customer active jobs and incoming requests use the Partner's card style.
# The partner card looks like this:
# <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
# Wait, let's just make it read-only and no hover effect for Customer active jobs.

# 1. Remove "Paying fee & Notification to Proceed"
t = re.sub(
    r'<h3 className="text-xl font-bold text-gray-900 mb-2">Paying fee & Notification to Proceed</h3>',
    '',
    t
)

# 2. Fix Step progress dots to remove filled color and checkmarks globally in this file.
t = re.sub(
    r'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold\s+\$\{\s*step\.completed\s*\?\s*"bg-green-500 text-white"\s*:\s*step\.active\s*\?\s*"bg-blue-600 text-white ring-4 ring-blue-100"\s*:\s*"bg-gray-100 text-gray-400"\s*\}',
    r'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step.active ? "border-2 border-blue-600 text-blue-600 font-extrabold" : "border border-gray-300 text-gray-500"}',
    t
)

# And remove the checkmark replacing the number.
# Find: {step.completed ? <svg className="w-5 h-5" ... /> : index + 5}
t = re.sub(
    r'\{step\.completed \? <svg[^>]+>.*?</svg> : index \+ 5\}',
    r'{index + 5}',
    t,
    flags=re.DOTALL
)

# 3. Handle moving Alerts and Chats ABOVE Incoming requests.
# Find the headers
overview_start = t.find('<h2 className="text-xl font-bold mb-4">{t(\'incomingRequests\')}</h2>')
chats_start = t.find(' {/* Recent Incoming Chats */}')
alerts_start = t.find(' {/* Recent Alerts */}')
history_start = t.find('<div className="flex justify-between items-center mb-4">') # Wait, this might be history.

# Let's do string replacement for the pills

with open("apps/web/fix_customer_all.py", "w") as f:
    f.write("print('ready')")
