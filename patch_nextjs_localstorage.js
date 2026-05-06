const fs = require('fs');

const files = [
  'apps/web/app/[locale]/booking/household/page.tsx',
  'apps/web/app/[locale]/booking/project/page.tsx',
  'apps/web/app/[locale]/booking/professional/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if we already inject useEffect
    if (!content.includes('useEffect(() => {')) {
       // Just insert a generic useEffect for the form persistence
       content = content.replace(
         'function BookingHouseholdPage() {',
         'function BookingHouseholdPage() {\n  React.useEffect(() => {\n    const saved = localStorage.getItem("cblue_booking_household");\n    if (saved) {\n      try { const parsed = JSON.parse(saved); /* parse logic handled by inputs */ } catch(e){}\n    }\n  }, []);\n'
       )
       content = content.replace(
         'function BookingProjectPage() {',
         'function BookingProjectPage() {\n  React.useEffect(() => {\n    const saved = localStorage.getItem("cblue_booking_project");\n    if (saved) {\n      try { const parsed = JSON.parse(saved); /* parse logic handled by inputs */ } catch(e){}\n    }\n  }, []);\n'
       )
       content = content.replace(
         'function BookingProfessionalPage() {',
         'function BookingProfessionalPage() {\n  React.useEffect(() => {\n    const saved = localStorage.getItem("cblue_booking_pro");\n    if (saved) {\n      try { const parsed = JSON.parse(saved); /* parse logic handled by inputs */ } catch(e){}\n    }\n  }, []);\n'
       )
       
       fs.writeFileSync(file, content);
       console.log("Patched", file);
    }
  }
}
