const fs = require('fs');
const path = require('path');
function walk(dir) {
  let files = [];
  try {
    const list = fs.readdirSync(dir);
    for (let f of list) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) files = files.concat(walk(p));
      else files.push(p);
    }
  } catch (e) {}
  return files;
}
const allFiles = [...walk('apps/web/app'), ...walk('apps/web/messages'), ...walk('apps/web/lib')];
for (let f of allFiles) {
  if (['.ts', '.tsx', '.json', '.js', '.mjs', '.md'].some(ext => f.endsWith(ext))) {
    const orig = fs.readFileSync(f, 'utf8');
    let updated = orig.replace(/฿200/g, '฿100');
    updated = updated.replace(/200 Baht/g, '100 Baht');
    updated = updated.replace(/Economy\s*\(\s*200\s*\)/g, 'Economy (100)');
    if (orig !== updated) {
      fs.writeFileSync(f, updated);
      console.log('Updated', f);
    }
  }
}
