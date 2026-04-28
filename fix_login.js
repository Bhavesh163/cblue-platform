const fs = require('fs');

let code = fs.readFileSync('apps/web/app/[locale]/subscription/login/page.tsx', 'utf8');

// Update router.push to use searchParams.get('redirect') properly.
code = code.replace(/import \{ useRouter \} from "next\/navigation";/, 'import { useRouter, useSearchParams } from "next/navigation";');
code = code.replace(/const router = useRouter\(\);/, 'const router = useRouter();\n  const searchParams = useSearchParams();');
code = code.replace(/router\.push\(\`\$\{prefix\}\/dashboard\`\);/, `
      const redir = searchParams.get("redirect");
      if (redir) {
        router.push(redir.startsWith("/") ? \`\${prefix}\${redir}\` : \`\${prefix}/\${redir}\`);
      } else {
        router.push(\`\${prefix}/dashboard\`);
      }
`);

fs.writeFileSync('apps/web/app/[locale]/subscription/login/page.tsx', code);
