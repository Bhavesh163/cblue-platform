const fs = require('fs');

let code = fs.readFileSync('apps/web/app/api/v1/[...path]/route.ts', 'utf8');
code = code.replace(/const BACKEND_URL: string = \(\(\) => \{[\s\S]*?\}\)\(\);/, `
function getBackendUrl() {
  if (process.env.API_BACKEND_URL) return process.env.API_BACKEND_URL;
  if (process.env.NODE_ENV === "production") return "http://api-backend.cblue.co.th";
  return "http://localhost:3002";
}
`);
code = code.replace(/BACKEND_URL\)/g, 'getBackendUrl())');
code = code.replace(/BACKEND_URL,/g, 'getBackendUrl(),');

fs.writeFileSync('apps/web/app/api/v1/[...path]/route.ts', code);
