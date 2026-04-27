console.log(require('fs').readFileSync('backend/src/modules/fixer/fixer.controller.ts', 'utf8').match(/const ALLOWED_MIMES[^\]]*]/g)[0])
