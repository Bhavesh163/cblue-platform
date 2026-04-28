const fs = require('fs');

function wrapWithSuspense(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  if (code.includes('Suspense')) return;

  code = code.replace(/import \{ useState, type FormEvent \} from "react";/, 'import { useState, type FormEvent, Suspense } from "react";');
  
  const componentName = filePath.includes('login') ? 'SubscriptionLoginPage' : 'SubscriptionRegisterPage';
  
  // Wrap the entire return inside <Suspense>
  code = code.replace(/return \(/, 'return (\n    <Suspense fallback={<div>Loading...</div>}>');
  // Find the last </div>\n  ); and replace it with </div>\n    </Suspense>\n  );
  code = code.replace(/<\/div>\n  \);/, '</div>\n    </Suspense>\n  );');
  
  fs.writeFileSync(filePath, code);
}

wrapWithSuspense('apps/web/app/[locale]/subscription/login/page.tsx');
wrapWithSuspense('apps/web/app/[locale]/subscription/register/page.tsx');
