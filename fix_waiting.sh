sed -i 's/Waiting for Partner Confirmation/Pending Payment/g' apps/web/app/\[locale\]/dashboard/page.tsx
sed -i "s/We've notified the partner about your booking. They will review and confirm shortly./Partner has accepted your PO. Please proceed to payment to confirm the appointment./g" apps/web/app/\[locale\]/dashboard/page.tsx
