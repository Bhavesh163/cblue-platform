const fs = require('fs');
let code = fs.readFileSync('backend/src/modules/subscription/subscription.service.spec.ts', 'utf8');

// Make sure `bcrypt` is not unused or used correctly
if (code.includes('import * as bcrypt from \'bcrypt\';')) {
  // It's used in `jest.mock('bcrypt')`, so it should be fine.
}

fs.writeFileSync('backend/src/modules/subscription/subscription.service.spec.ts', code);
