const fs = require('fs');
let code = fs.readFileSync('backend/src/modules/subscription/subscription.service.spec.ts', 'utf8');

// I will remove `import * as bcrypt from 'bcrypt';` unused variable
// and fix async without await.

code = code.replace(/import \* as bcrypt from 'bcrypt';\n/, '');
code = code.replace(/jest\.fn\(async \(callback\)/, 'jest.fn((callback)');
code = code.replace(/return callback\(tx\);/, 'return Promise.resolve(callback(tx));');

fs.writeFileSync('backend/src/modules/subscription/subscription.service.spec.ts', code);
