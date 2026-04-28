const fs = require('fs');

let code = fs.readFileSync('apps/web/app/[locale]/fixers/register/page.tsx', 'utf8');

// Ensure that once the "Success" condition is met, the system correctly pauses.
// Actually, earlier we added alreadyRegistered check:

code = code.replace(/alreadyRegistered/g, 'alreadyRegistered');

fs.writeFileSync('apps/web/app/[locale]/fixers/register/page.tsx', code);
