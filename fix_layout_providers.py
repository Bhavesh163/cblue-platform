import re

with open('apps/web/app/[locale]/layout.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Make sure imports are present
if "import { NextIntlClientProvider }" not in text:
    text = 'import { NextIntlClientProvider } from "next-intl";\n' + text
if "import { setRequestLocale }" not in text:
    text = 'import { setRequestLocale } from "next-intl/server";\n' + text 
if "import { ChatbotWidget }" not in text:
    text = 'import { ChatbotWidget } from "./components/ChatbotWidget";\n' + text
    
with open('apps/web/app/[locale]/layout.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
