const fs = require('fs');

let code = fs.readFileSync('apps/web/app/api/v1/[...path]/route.ts', 'utf8');

// Replace the getBackendUrl function to default to the production URL, 
// and only use localhost if we are explicitly in local dev.
code = code.replace(/function getBackendUrl\(\) \{[\s\S]*?\}/, `
function getBackendUrl() {
  if (process.env.API_BACKEND_URL) return process.env.API_BACKEND_URL;
  if (process.env.NODE_ENV === "development") return "http://localhost:3002";
  return "http://api-backend.cblue.co.th";
}
`);

fs.writeFileSync('apps/web/app/api/v1/[...path]/route.ts', code);
