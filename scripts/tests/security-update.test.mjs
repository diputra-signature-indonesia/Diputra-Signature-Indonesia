import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { brotliCompressSync, brotliDecompressSync } from 'node:zlib';
import { isSupportedNodeVersion, MINIMUM_NODE_VERSION } from '../check-node-version.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
function compile(path, mocks = {}, globals = {}) {
  const output = ts.transpileModule(source(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', ...Object.keys(globals), output)((name) => (name in mocks ? mocks[name] : require(name)), exports, ...Object.values(globals));
  return exports;
}

test('Runtime guard rejects vulnerable, unsupported-major and prerelease versions', () => {
  for (const version of ['20.19.0', '22.22.2', '22.23.3', '22.23.4-rc.1', '24.22.1', '26.12.1', 'invalid']) {
    assert.equal(isSupportedNodeVersion(version), false, version);
  }
  for (const version of ['22.23.4', 'v22.23.4', '22.23.5', '22.24.0']) assert.equal(isSupportedNodeVersion(version), true, version);
  assert.equal(isSupportedNodeVersion(process.version), true, 'Run tests on the patched project runtime');
});

test('Runtime configuration and npm lifecycle guards agree on the patched minimum', () => {
  const pkg = JSON.parse(source('package.json'));
  assert.equal(source('.nvmrc').trim(), MINIMUM_NODE_VERSION);
  assert.equal(pkg.engines.node, '^' + MINIMUM_NODE_VERSION);
  for (const key of ['predev', 'prebuild', 'prestart']) assert.equal(pkg.scripts[key], 'npm run check:runtime');
  const result = spawnSync(process.execPath, ['scripts/check-node-version.mjs'], { encoding: 'utf8', cwd: new URL('../../', import.meta.url) });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /supported patched 22\.x runtime/);
});

test('Patched Node runtime preserves ordinary Brotli decoding without malicious inputs', () => {
  const original = Buffer.from('Diputra Signature Indonesia: legal, business and immigration services.');
  assert.deepEqual(brotliDecompressSync(brotliCompressSync(original)), original);
});

test('Updated article sanitizer keeps existing article content, SEO headings and safe links', () => {
  const { sanitizeArticleHtml, articlePlainText, articleWordCount } = compile('src/lib/blog-content.ts');
  const html = sanitizeArticleHtml(
    '<h1>DSI services</h1><p style="text-align:center;color:#800020">Legal and visa advice.</p><a href="https://example.test">Read more</a><figure data-article-image="true"><img src="https://example.test/photo.jpg" alt="Office"><figcaption>DSI office</figcaption></figure><table><tr><td colspan="2">Fee</td></tr></table>'
  );
  assert.match(html, /<h2>DSI services<\/h2>/);
  assert.match(html, /text-align:center/);
  assert.match(html, /color:#800020/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /alt="Office"/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /data-article-image="true"/);
  assert.match(html, /colspan="2"/);
  assert.equal(articlePlainText('<p>Legal&nbsp; and <b>Visa</b></p>'), 'Legal and Visa');
  assert.equal(articleWordCount('<p>Legal and Visa</p>'), 3);
});

test('Updated article sanitizer rejects executable markup, unsafe URLs and iframe hosts', () => {
  const { sanitizeArticleHtml } = compile('src/lib/blog-content.ts');
  const html = sanitizeArticleHtml(
    '<script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(1)"><a href="javascript:alert(1)">unsafe</a><svg><animate attributeName="href" values="javascript:alert(1)"></animate></svg><iframe src="https://evil.example/embed/1"></iframe><p style="background-image:url(javascript:alert(1));position:fixed">Text</p>'
  );
  assert.doesNotMatch(html, /<script|<svg|<animate|onerror|javascript:|evil\.example|background-image|position:fixed/);
  assert.match(sanitizeArticleHtml('<iframe src="https://www.youtube.com/embed/test"></iframe>'), /title="Embedded YouTube video"/);
  assert.match(sanitizeArticleHtml('<iframe src="https://www.youtube-nocookie.com/embed/test"></iframe>'), /youtube-nocookie\.com/);
});

test('Patched transitive Zod remains compatible with the existing Vercel OIDC configuration schemas', () => {
  const oidcPath = require.resolve('@vercel/oidc');
  const configPath = require.resolve('@vercel/cli-config', { paths: [dirname(oidcPath)] });
  const { authConfigSchema, globalConfigSchema } = require(configPath);
  assert.equal(authConfigSchema.safeParse({ token: 'test-only-token' }).success, true);
  assert.equal(globalConfigSchema.safeParse({}).success, true);
  assert.equal(typeof require('@vercel/oidc').getVercelOidcToken, 'function');
  const zodPackage = require(require.resolve('zod/package.json', { paths: [dirname(configPath)] }));
  assert.ok(require('semver').gte(zodPackage.version, '4.6.6'));
});

for (const audience of ['', 'https://test-only-audience.example']) {
  test(`Drive token exchange, permissions and cache are unchanged (${audience ? 'custom' : 'default'} audience)`, async () => {
    const calls = [],
      oidcOptions = [];
    const env = {
      GCP_PROJECT_ID: 'test-only-project',
      GCP_PROJECT_NUMBER: '123456789',
      GCP_SERVICE_ACCOUNT_EMAIL: 'test@example.test',
      GCP_WORKLOAD_IDENTITY_POOL_ID: 'test-pool',
      GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: 'test-provider',
      GOOGLE_DRIVE_SHARED_DRIVE_ID: 'test-drive',
      GOOGLE_DRIVE_ROOT_FOLDER_ID: 'test-root',
      GCP_AUDIENCE: audience,
    };
    const { getGoogleDriveAccessToken } = compile(
      'src/lib/google-drive/auth.ts',
      {
        'server-only': {},
        '@vercel/oidc': {
          getVercelOidcToken: async (options) => {
            oidcOptions.push(options);
            return 'mock-oidc';
          },
        },
      },
      {
        process: { env },
        fetch: async (url, init) => {
          calls.push({ url, init });
          return Response.json(calls.length === 1 ? { access_token: 'mock-federated' } : { accessToken: 'mock-drive', expireTime: new Date(Date.now() + 3600000).toISOString() });
        },
      }
    );
    assert.equal(await getGoogleDriveAccessToken(), 'mock-drive');
    assert.equal(await getGoogleDriveAccessToken(), 'mock-drive');
    assert.equal(calls.length, 2, 'Second read uses the existing token cache');
    assert.deepEqual(oidcOptions, [audience ? { audience } : undefined]);
    assert.equal(calls[0].url, 'https://sts.googleapis.com/v1/token');
    assert.equal(calls[0].init.body.get('subject_token'), 'mock-oidc');
    assert.equal(calls[0].init.body.get('audience'), '//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/test-pool/providers/test-provider');
    assert.match(calls[1].url, /^https:\/\/iamcredentials\.googleapis\.com\//);
    assert.deepEqual(JSON.parse(calls[1].init.body), { scope: ['https://www.googleapis.com/auth/drive'], lifetime: '3600s' });
  });
}
