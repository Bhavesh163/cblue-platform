const fs = require('fs');

const files = [
  'apps/web/app/[locale]/properties/register/page.tsx',
  'apps/web/app/[locale]/fixers/register/page.tsx',
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(
      /const msg =\s*errData\.message\s*\|\|/,
      `const msg = Array.isArray(errData.message) ? errData.message.join(", ") : errData.message ||`
    );
    fs.writeFileSync(file, content);
  }
}
