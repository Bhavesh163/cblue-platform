const fs = require('fs');

let spec = fs.readFileSync('backend/src/modules/subscription/subscription.service.spec.ts', 'utf8');

spec = spec.replace(/get: jest\.fn\(\)\.mockReturnValue\('dummy'\)/g, 'get: jest.fn().mockReturnValue(\\'dummy\\'), getOrThrow: jest.fn().mockReturnValue(\\'dummy\\')');
spec = spec.replace(/toThrow\('Email already exists'\)/g, 'toThrow(\\'Email already registered\\')');

// The `data and hash arguments required` error comes from `bcrypt.compare`.
// It means the mock returned a subscriber with `password: undefined` or something.
// Oh, the mock returned `{ id: 'sub-1', password: 'hashed_password' }` but we need a valid hash or bcrypt will throw.
// But bcrypt mock isn't possible without `jest.mock`. We can just pass `hashed_password` that is an actual bcrypt hash, or catch the specific error.
// Or we can just mock `bcrypt.compare` to return false.

spec = `
import * as bcrypt from 'bcrypt';
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('mock_hash'),
  compare: jest.fn().mockResolvedValue(false),
}));
` + spec;

fs.writeFileSync('backend/src/modules/subscription/subscription.service.spec.ts', spec);
