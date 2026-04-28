const fs = require('fs');

let spec = fs.readFileSync('backend/src/modules/subscription/subscription.service.spec.ts', 'utf8');

spec = spec.replace(/\{ provide: ConfigService, useValue: \{ get: jest.fn\(\).mockReturnValue\('dummy'\) \} \}/, 
"{ provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('dummy'), getOrThrow: jest.fn().mockReturnValue('dummy') } }");

spec = spec.replace(/toThrow\('Email already exists'\)/, "toThrow('Email already registered')");

// add jest.mock('bcrypt') right after imports
spec = spec.replace(/import \{ ConfigService \} from '@nestjs\/config';/, 
`import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('mock_hash'),
  compare: jest.fn().mockResolvedValue(false),
}));
`);

fs.writeFileSync('backend/src/modules/subscription/subscription.service.spec.ts', spec);
