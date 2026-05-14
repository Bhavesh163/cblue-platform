import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace empty arrays with mock data
content = content.replace("const chats: any[] = [];", "const chats: any[] = [];")
content = re.sub(
    r"const notifications: any\[\] = \[\];",
    """const notifications: any[] = [
    { id: 1, msg: "Review PO Details for GREEN CONSTRUCTION", unread: true, time: "Just now", dot: "bg-purple-500" },
    { id: 2, msg: "Review PO Details for FIT OUT", unread: true, time: "2 mins ago", dot: "bg-purple-500" },
    { id: 3, msg: "Confirm meeting at site", unread: false, time: "1 hr ago", dot: "bg-gray-300" },
    { id: 4, msg: "Request for Approval of Variation", unread: false, time: "Yesterday", dot: "bg-gray-300" },
    { id: 5, msg: "Request for job complete", unread: false, time: "Yesterday", dot: "bg-gray-300" },
  ];""",
    content
)

# Render Upcoming Meetings side-by-side
content = content.replace('      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">', '      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">')

content = content.replace(
'''      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">''',
'''      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">⏰ Upcoming Meetings</h3>
          <div className="text-gray-500 text-sm italic">
            No upcoming meetings
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">''')

# Render requests in a pill (Wait, the user says "Regarding incoming request... customer to proceed processing payment" -> that's just workflow logic)

with open('apps/web/app/[locale]/fixers/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
