const fs = require('fs');

// Reviewing docker-compose.yml because the user's initial prompt said:
// `docker-compose issues (KeyError: 'ContainerConfig', port conflicts).`
// `SubscriptionService tests are failing due to TypeError: tx.user.findFirst is not a function.`
// Let's fix the tests first and review docker-compose issues in backend-ci.yml again.

const ciYmlPath = '.github/workflows/backend-ci.yml';
let ciYml = fs.readFileSync(ciYmlPath, 'utf8');

// I already added robust container cleanup logic in the `.github/workflows/backend-ci.yml` previously.
// E.g.: `docker rm -f $(docker ps -aq --filter name=backend) || true`
// Let's make sure it handles any bad container states well and uses `docker compose down --remove-orphans`

ciYml = ciYml.replace(/docker-compose down/g, 'docker-compose down --remove-orphans -v || true\n            docker system prune -f || true');
fs.writeFileSync(ciYmlPath, ciYml);

// Let's check `SubscriptionService` tests
let spec = fs.readFileSync('backend/src/modules/subscription/subscription.service.spec.ts', 'utf8');

// The error was: `TypeError: tx.user.findFirst is not a function.`
// This implies `mockPrismaService.$transaction` needs to pass a mock `tx` that has `user.findFirst` etc.
// In my previous edit I already added that: 
// `const mockTx = { user: mockPrismaService.user, ... }`
// Let's make sure it's fully mock mapped.

if (!spec.includes('tx.user.findFirst')) {
  // Good, I'll double check if `user` has `findFirst`
  console.log("Checking mockPrismaService for findFirst mock");
  if (!spec.includes('findFirst: jest.fn()')) {
    spec = spec.replace(/user: \{/g, 'user: {\n      findFirst: jest.fn(),');
    fs.writeFileSync('backend/src/modules/subscription/subscription.service.spec.ts', spec);
  }
}
