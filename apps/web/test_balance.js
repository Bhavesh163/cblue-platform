const fs = require('fs');

const data = fs.readFileSync('apps/web/app/[locale]/dashboard/page.tsx', 'utf8');
const lines = data.split('\n');

let open = 0;
let lastIndex = -1;

// Let's just find the start of the return mapping for DashboardPage
const startIndex = data.indexOf('<div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pb-12 -mt-6">');
console.log("Start index:", startIndex);
if (startIndex !== -1) {
  for (let i = startIndex; i < data.length; i++) {
    if (data.substring(i, i+4) === '<div') open++;
    else if (data.substring(i, i+5) === '</div') {
      open--;
      if (open === 0) {
        let line = data.substring(0, i).split('\n').length;
        console.log("Main wrapper closed at line:", line);
        // lastIndex = i;
      } else if (open < 0) {
        console.log("Extra closing div at line", data.substring(0, i).split('\n').length);
        open = 0; // reset to keep tracking
      }
    }
  }
}
