import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('OAuth public route contract', () => {
  const mainSource = readFileSync(join(__dirname, '../../main.ts'), 'utf8');
  const workflowSource = readFileSync(
    join(__dirname, '../../../../.github/workflows/backend-ci.yml'),
    'utf8',
  );

  it('keeps discovery and token endpoints under the versioned backend prefix', () => {
    expect(mainSource).toContain("app.setGlobalPrefix('api/v1');");
    expect(mainSource).not.toMatch(
      /exclude:\s*\[\s*\{\s*path:\s*'\.well-known\/openid-configuration'/s,
    );
    for (const name of [
      'CBLUE_OAUTH_ISSUER',
      'CBLUE_OAUTH_PRIVATE_KEY_PEM',
      'CBLUE_OAUTH_PUBLIC_KEY_PEM',
      'BLUE_OIDC_ISSUER',
      'BLUE_OIDC_AUDIENCE',
      'BLUE_OIDC_JWKS_URL',
      'BLUE_OIDC_JWKS_JSON',
      'BLUE_OAUTH_CLIENT_ID',
      'BLUE_OAUTH_CLIENT_SECRET',
    ]) {
      expect(workflowSource).toContain(name);
    }
  });
});
