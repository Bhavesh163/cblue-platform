const fs = require('fs');
let code = fs.readFileSync('apps/web/app/[locale]/dashboard/page.tsx', 'utf8');

// I saw earlier I changed the URL to `/api/v1/orders/user` but it should be `/api/v1/orders/my`.
// Let's verify and fix.
code = code.replace(/\/api\/v1\/orders\/user/g, '/api/v1/orders/my');
fs.writeFileSync('apps/web/app/[locale]/dashboard/page.tsx', code);

let codeFixers = fs.readFileSync('apps/web/app/[locale]/fixers/page.tsx', 'utf8');
codeFixers = codeFixers.replace(/\/api\/v1\/orders\/user/g, '/api/v1/orders/my');
fs.writeFileSync('apps/web/app/[locale]/fixers/page.tsx', codeFixers);
