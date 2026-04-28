const fs = require('fs');
let code = fs.readFileSync('apps/web/app/api/v1/[...path]/route.ts', 'utf8');

// Make sure OPTIONS requests don't get a body, and we don't crash on invalid duplex usage
code = code.replace(/if \(!\["GET", "HEAD"\]\.includes\(request\.method\)\) \{/, 'if (!["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) {');

fs.writeFileSync('apps/web/app/api/v1/[...path]/route.ts', code);
