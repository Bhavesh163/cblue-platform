sed -i "s/type: 'meeting_scheduled'/type: 'meeting_pending_partner'/g" apps/web/app/\[locale\]/dashboard/page.tsx
sed -i "s/type === 'meeting_scheduled'/type === 'meeting_scheduled'/g" apps/web/app/\[locale\]/dashboard/page.tsx
