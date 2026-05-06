sed -i 's/if (kycImages.length === 0)/if (!isEditMode \&\& kycImages.length === 0)/g' apps/web/app/\[locale\]/fixers/register/page.tsx
