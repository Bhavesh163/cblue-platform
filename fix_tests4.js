const fs = require('fs');

let spec = fs.readFileSync('backend/src/modules/subscription/subscription.service.spec.ts', 'utf8');

spec = spec.replace(/sign: jest.fn\(\)\.mockReturnValue\('test_token'\),/, 
`sign: jest.fn().mockReturnValue('test_token'),
      signAsync: jest.fn().mockResolvedValue('test_token'),`);

spec = spec.replace(/toBe\('Invalid credentials'\)/, "toBe('Invalid email or password')");

fs.writeFileSync('backend/src/modules/subscription/subscription.service.spec.ts', spec);
