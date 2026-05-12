import re

with open('apps/web/app/[locale]/fixers/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add ASSIGNED and ACCEPTED to STATUS_LABEL just in case
status_injection = '''  ASSIGNED: { en: "Waiting for customer to proceed", th: "รอให้ลูกค้าดำเนินการ", zh: "等待客户处理" },
  ACCEPTED: { en: "Waiting for customer to proceed", th: "รอให้ลูกค้าดำเนินการ", zh: "等待客户处理" },
  MATCHING: { en: "Action at incoming request needed", th: "โปรดดำเนินการในคำขอใหม่", zh: "需要处理新请求" },'''

if 'ASSIGNED:' not in text:
    text = text.replace('COMPLETED: { en: "Completed", th: "เสร็จสิ้น", zh: "已完成" },', f'COMPLETED: {{ en: "Completed", th: "เสร็จสิ้น", zh: "已完成" }},\n{status_injection}')

with open('apps/web/app/[locale]/fixers/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

