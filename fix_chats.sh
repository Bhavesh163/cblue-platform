#!/bin/bash
python3 << 'PYTHON_EOF'
import re
import os

file_path = "/home/ballhog/cblue-platform/apps/web/app/[locale]/dashboard/page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Cblue with "Fitout - PO-3a68-12e3 - ฿25,000,000"
# In Recent Incoming Chats
content = content.replace('> Cblue <', '> Fitout - PO-3a68-12e3 - ฿25,000,000 <')

# In the Chat tab
content = content.replace('<h3 className="font-bold text-gray-900">Cblue</h3>', '<h3 className="font-bold text-gray-900">Fitout - PO-3a68-12e3 - ฿25,000,000</h3>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
PYTHON_EOF

# Fix the ClientChatPage.tsx error by checking if order properties exist
chat_file="/home/ballhog/cblue-platform/apps/web/app/[locale]/chat/[id]/ClientChatPage.tsx"
sed -i 's/order.id.slice(0,4)/(order.id ? order.id.slice(0,4) : orderId.slice(0,4))/g' $chat_file
sed -i 's/order.status/(order.status || "Unknown")/g' $chat_file
sed -i 's/order.serviceCategory/(order.serviceCategory || "Unknown Service")/g' $chat_file
sed -i 's/order.description/(order.description || "N\/A")/g' $chat_file
