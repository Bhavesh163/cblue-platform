#!/bin/bash

# Fix STATUS_LABEL in fixers/page.tsx
sed -i 's/en: "Waiting for customer to proceed", th: "รอให้ลูกค้าดำเนินการ", zh: "等待客户处理"/en: "", th: "", zh: ""/g' apps/web/app/\[locale\]/fixers/page.tsx
sed -i 's/MATCHING: { en: "Action needed", th: "โปรดดำเนินการในคำขอใหม่", zh: "需要处理新请求" }/MATCHING: { en: "Action needed", th: "Action needed", zh: "Action needed" }/g' apps/web/app/\[locale\]/fixers/page.tsx
