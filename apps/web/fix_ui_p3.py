import re

chat_path = "app/[locale]/chat/[id]/ClientChatPage.tsx"
with open(chat_path, "r", encoding="utf-8") as f:
    c = f.read()

# Replace back button
old_back = '''<button onClick={() => router.back()} className="mr-3 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>'''
    
new_close = '''<button onClick={() => router.replace(`/${params.locale}/dashboard`)} className="ml-auto text-gray-600 hover:text-red-600 transition-colors order-last">
              <X className="w-6 h-6" />
            </button>'''

c = c.replace(old_back, "")
if "<X className=" not in c:
    c = c.replace('''<h1 className="text-lg font-bold text-gray-900 truncate">''', new_close + '''\n<h1 className="text-lg font-bold text-gray-900 truncate flex-grow">''')

if "import { ArrowLeft" in c:
    c = c.replace("ArrowLeft", "ArrowLeft, X")
elif "import { Send" in c and "X" not in c.split("import { Send")[1].split("}")[0]:
    c = c.replace("import { Send", "import { Send, X")

# We must hide the chat page topnav from overlapping. Since it's inside `ClientChatPage.tsx`, it's rendering inside the layout.
# We can make the chat view a fixed overlay `fixed inset-0 z-[100] bg-gray-50 flex flex-col`.
wrapper_find = '''<div className="flex flex-col h-[calc(100vh-160px)] mt-4 max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">'''
wrapper_repl = '''<div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col w-full h-full max-w-4xl mx-auto md:h-screen md:rounded-none shadow-none md:border-none overflow-hidden">'''
c = c.replace(wrapper_find, wrapper_repl)

wrapper_old = '''<div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">'''
c = c.replace(wrapper_old, wrapper_repl)

with open(chat_path, "w", encoding="utf-8") as f:
    f.write(c)
