sed -i -E 's/Awaiting Partner(.*?)<\/div>/Wait for Partner\1<\/div>/g' apps/web/app/\[locale\]/dashboard/page.tsx

grep -n "Awaiting Partner" apps/web/app/\[locale\]/dashboard/page.tsx
