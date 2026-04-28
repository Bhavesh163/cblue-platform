const fs = require('fs');

function refactorSuspense(filePath, componentName) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Undo my last change to just wrap the return
  code = code.replace(/<Suspense fallback=\{<div>Loading...<\/div>\}>/g, '');
  code = code.replace(/<\/div>\n    <\/Suspense>\n  \);/g, '</div>\n  );');
  
  // Separate into a child component
  const contentStart = code.indexOf(`export default function ${componentName}() {`);
  const beforeExport = code.substring(0, contentStart);
  let componentBody = code.substring(contentStart);
  
  componentBody = componentBody.replace(`export default function ${componentName}() {`, `function ${componentName}Content() {`);
  
  const newExport = `
export default function ${componentName}() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <${componentName}Content />
    </Suspense>
  );
}
`;

  fs.writeFileSync(filePath, beforeExport + componentBody + newExport);
}

refactorSuspense('apps/web/app/[locale]/subscription/login/page.tsx', 'SubscriptionLoginPage');
refactorSuspense('apps/web/app/[locale]/subscription/register/page.tsx', 'SubscriptionRegisterPage');
