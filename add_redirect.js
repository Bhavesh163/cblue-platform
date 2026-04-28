const fs = require('fs');

function addRedirect(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('useSearchParams')) {
    code = code.replace(/import \{ useRouter \} from "next\/navigation";/, 'import { useRouter, useSearchParams } from "next/navigation";');
    code = code.replace(/const router = useRouter\(\);/, 'const router = useRouter();\n  const searchParams = useSearchParams();');
    code = code.replace(/router\.push\(`\$\{prefix\}\/dashboard`\);/, 'const redir = searchParams.get("redirect") || "/dashboard";\n      router.push(redir.startsWith("/") ? `${prefix}${redir}` : `${prefix}/dashboard`);');
    fs.writeFileSync(file, code);
  }
}

addRedirect('apps/web/app/[locale]/subscription/login/page.tsx');
addRedirect('apps/web/app/[locale]/subscription/register/page.tsx');
