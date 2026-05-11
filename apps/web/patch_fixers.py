import re

with open("app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. State for modal
if "const [waitModalOrder, setWaitModalOrder] = useState<any>(null);" not in text:
    text = text.replace(
        "const [orders, setOrders] = useState<any[]>([]);",
        "const [orders, setOrders] = useState<any[]>([]);\n  const [waitModalOrder, setWaitModalOrder] = useState<any>(null);"
    )

# 2. Delete Requests tab definitions
text = re.sub(
    r'\{\s*key:\s*"requests",\s*label:[^}]+icon:\s*"",\s*badge:\s*0\s*\},',
    '',
    text
)
text = re.sub(
    r'\{\s*key:\s*"requests",\s*icon:\s*"",\s*label:\s*"Requests",\s*count:\s*3\s*\},',
    '',
    text
)
text = re.sub(
    r'\{activeTab === "requests" && \([\s\S]*?(?=\{activeTab === "properties")',
    '',
    text
)

# 3. Add onClick to active jobs rows. Wait, there are `<div key={req.id} ...`
# Let's replace the <div key={req.id} className="p-4 border border-x-0 border-t-0 border-b-gray-100 flex items-center justify-between hover:bg-gray-50 transition cursor-pointer">
# Let's find exactly how the rows are defined.
with open("app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
