import re

with open("apps/web/app/[locale]/fixers/page.tsx", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Change Recent Chats to Recent incoming chats
text = text.replace('locale === "th" ? "แชทล่าสุด" : locale === "zh" ? "最近聊天" : "Recent Chats"', 'locale === "th" ? "แชทที่เข้ามาล่าสุด" : locale === "zh" ? "最近收到的来信" : "Recent incoming chats"')
text = text.replace('"No recent chats"', '"No recent incoming chats"')
text = text.replace('<h2>Recent Chats</h2>', '<h2>Recent incoming chats</h2>')

text = text.replace('const latestAlerts = [...alerts, currentJobAlert].filter(Boolean).slice(0, 2);', 'const latestAlerts = [...alerts, currentJobAlert].filter(Boolean).slice(0, 4);')

text = text.replace('chats && chats.length > 0 ? chats.slice(0, 1).map(', 'chats && chats.length > 0 ? chats.slice(0, 4).map(')

# "Please show each of last 14 months of monthly earnings"
text = text.replace('const MOCK_EARNINGS = [5, 12, 18, 26, 32, 28, 45, 52];', 'const MOCK_EARNINGS = [15, 20, 10, 5, 12, 18, 26, 32, 28, 45, 52, 60, 55, 65]; // 14 months')
text = text.replace('const MOCK_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];', 'const MOCK_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];')

# Fix Review PO file missing problem for customer image.
# We need to map `waitModalOrder.image` properly or pass it from jobData
text = text.replace('let url = waitModalOrder.image;', 'let url = waitModalOrder.image || waitModalOrder.customerImage;')

with open("apps/web/app/[locale]/fixers/page.tsx", "w", encoding="utf-8") as f:
    f.write(text)
print("done")
