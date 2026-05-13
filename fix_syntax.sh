#!/bin/bash
sed -i '/const EARNINGS_MOCK = \[/,/\];/d' apps/web/app/\[locale\]/fixers/page.tsx

sed -i '/const chats: any\[\] = \[\];/ i \
  const EARNINGS_MOCK = [\
    { month: "Feb 25", monthTh: "ก.พ. 25", monthZh: "2月 25", amount: 12000 },\
    { month: "Mar 25", monthTh: "มี.ค. 25", monthZh: "3月 25", amount: 15400 },\
    { month: "Apr 25", monthTh: "เม.ย. 25", monthZh: "4月 25", amount: 11000 },\
    { month: "May 25", monthTh: "พ.ค. 25", monthZh: "5月 25", amount: 18500 },\
    { month: "Jun 25", monthTh: "มิ.ย. 25", monthZh: "6月 25", amount: 16000 },\
    { month: "Jul 25", monthTh: "ก.ค. 25", monthZh: "7月 25", amount: 20000 },\
    { month: "Aug 25", monthTh: "ส.ค. 25", monthZh: "8月 25", amount: 22000 },\
    { month: "Sep 25", monthTh: "ก.ย. 25", monthZh: "9月 25", amount: 19500 },\
    { month: "Oct 25", monthTh: "ต.ค. 25", monthZh: "10月 25", amount: 23000 },\
    { month: "Nov 25", monthTh: "พ.ย. 25", monthZh: "11月 25", amount: 21000 },\
    { month: "Dec 25", monthTh: "ธ.ค. 25", monthZh: "12月 25", amount: 18000 },\
    { month: "Jan 26", monthTh: "ม.ค. 26", monthZh: "1月 26", amount: 25000 },\
    { month: "Feb 26", monthTh: "ก.พ. 26", monthZh: "2月 26", amount: 24000 },\
    { month: "Mar 26", monthTh: "มี.ค. 26", monthZh: "3月 26", amount: 26500 },\
  ];\
' apps/web/app/\[locale\]/fixers/page.tsx

