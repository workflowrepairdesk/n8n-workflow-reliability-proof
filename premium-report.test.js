const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const {
  PRODUCT,
  PremiumReportService,
  PremiumReportError,
  parseWorkflowJson,
  validateEntitlement,
  createInactiveEntitlementAdapter
} = require('./docs/premium-report.js');
const { createDemoEntitlementAdapter } = require('./test-support/demo-entitlement-adapter.js');

const now = new Date('2026-07-23T03:00:00.000Z');
const paid = (id = 'ent_test_1') => ({
  id,
  verifiedByServer: true,
  paymentStatus: 'paid',
  product: PRODUCT,
  expiresAt: '2026-07-23T04:00:00.000Z'
});
const sensitiveWorkflow = () => ({
  name: '<script>private workflow</script>',
  active: false,
  nodes: [
    {
      id: 'node-private-1',
      name: 'Customer API',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      parameters: { path: 'customer/secret/path', authentication: 'none' }
    },
    {
      id: 'node-private-2',
      name: 'Send private data',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4,
      continueOnFail: true,
      parameters: {
        url: 'https://private.example.test/customer/123',
        apiKey: 'super-secret-token',
        options: {}
      }
    }
  ],
  connections: {},
  settings: {}
});
const serviceFor = (records) => new PremiumReportService({
  entitlementAdapter: createDemoEntitlementAdapter(records),
  now: () => new Date(now)
});

test('a server-verified paid entitlement generates derived JSON and HTML', async () => {
  const output = await serviceFor({ paid_token: paid() }).generate(sensitiveWorkflow(), 'paid_token');
  assert.equal(output.report.product.priceUsd, 29);
  assert.equal(output.report.findings.length, 12);
  assert.match(output.json, /Private Workflow Reliability Report/);
  assert.match(output.html, /Evidence-linked findings/);
  assert.match(output.html, /USD 125/);
  assert.match(output.html, /USD 250\+/);
});

test('unpaid, unverified, wrong-product, expired, and unknown entitlements remain locked', async (t) => {
  const cases = {
    unpaid: { ...paid('unpaid'), paymentStatus: 'unpaid' },
    unverified: { ...paid('unverified'), verifiedByServer: false },
    wrong: { ...paid('wrong'), product: 'another-product' },
    expired: { ...paid('expired'), expiresAt: '2026-07-23T02:59:59.000Z' }
  };
  for (const [token, record] of Object.entries(cases)) {
    await t.test(token, async () => {
      await assert.rejects(serviceFor({ [token]: record }).generate(sensitiveWorkflow(), token), PremiumReportError);
    });
  }
  await assert.rejects(serviceFor({}).generate(sensitiveWorkflow(), 'unknown'), /verified paid entitlement/i);
  await assert.rejects(serviceFor({ paid_token: paid() }).generate(sensitiveWorkflow(), ''), /token/i);
});

test('fulfillment is idempotent for the same entitlement and local analysis', async () => {
  const service = serviceFor({ paid_token: paid() });
  const first = await service.generate(sensitiveWorkflow(), 'paid_token');
  const duplicate = await service.generate(sensitiveWorkflow(), 'paid_token');
  assert.strictEqual(duplicate, first);
  assert.equal(service.fulfilled.size, 1);
});

test('one entitlement cannot be reused for a different local analysis', async () => {
  const service = serviceFor({ paid_token: paid() });
  await service.generate(sensitiveWorkflow(), 'paid_token');
  const changed = sensitiveWorkflow();
  changed.nodes.push({ name: 'another', type: 'n8n-nodes-base.set', parameters: {} });
  await assert.rejects(service.generate(changed, 'paid_token'), /already generated/i);
  assert.equal(service.fulfilled.size, 1);
});

test('download artifacts exclude source values and entitlement credentials', async () => {
  const secretToken = 'opaque-paid-token-that-must-never-leak';
  const output = await serviceFor({ [secretToken]: paid('private-order-id') }).generate(sensitiveWorkflow(), secretToken);
  const artifacts = `${output.json}\n${output.html}`;
  for (const privateValue of [
    '<script>private workflow</script>',
    'Customer API',
    'Send private data',
    'node-private-1',
    'customer/secret/path',
    'private.example.test',
    'customer/123',
    'super-secret-token',
    secretToken,
    'private-order-id'
  ]) assert.equal(artifacts.includes(privateValue), false, `artifact leaked ${privateValue}`);
});

test('ten labeled synthetic workflows produce exact expected premium rule status and count', async () => {
  const base = () => ({
    active: true,
    nodes: [{ name: 'Synthetic', type: 'n8n-nodes-base.set', typeVersion: 3, parameters: {} }],
    connections: {},
    settings: { errorWorkflow: 'synthetic-error', saveManualExecutions: false }
  });
  const cases = [
    ['clean', base(), 'valid-structure', 'pass', 0],
    ['disabled', { ...base(), nodes: [{ ...base().nodes[0], disabled: true }] }, 'disabled-nodes', 'warn', 1],
    ['continue', { ...base(), nodes: [{ ...base().nodes[0], continueOnFail: true }] }, 'continue-on-fail', 'warn', 1],
    ['retry', { ...base(), nodes: [{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, parameters: { options: { timeout: 5000 } } }] }, 'retry-policy', 'warn', 1],
    ['error-path', { ...base(), settings: { saveManualExecutions: false } }, 'error-workflow', 'warn', 1],
    ['webhook-auth', { ...base(), nodes: [{ name: 'Hook', type: 'n8n-nodes-base.webhook', typeVersion: 2, parameters: { path: 'synthetic', authentication: 'none' } }] }, 'webhook-auth', 'fail', 1],
    ['duplicate-hook', { ...base(), nodes: [
      { name: 'Hook A', type: 'n8n-nodes-base.webhook', typeVersion: 2, parameters: { path: 'same', authentication: 'headerAuth' } },
      { name: 'Hook B', type: 'n8n-nodes-base.webhook', typeVersion: 2, parameters: { path: 'same', authentication: 'headerAuth' } }
    ] }, 'duplicate-webhooks', 'fail', 1],
    ['literal-secret', { ...base(), nodes: [{ ...base().nodes[0], parameters: { apiKey: 'synthetic-secret-value' } }] }, 'hardcoded-secrets', 'fail', 1],
    ['http-timeout', { ...base(), nodes: [{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, retryOnFail: true, parameters: { options: {} } }] }, 'unbounded-http', 'warn', 1],
    ['version-state', { ...base(), active: false, nodes: [{ name: 'Synthetic', type: 'n8n-nodes-base.set', parameters: {} }] }, 'node-versions', 'warn', 1]
  ];
  const records = Object.fromEntries(cases.map(([label], index) => [`token-${label}`, paid(`ent-corpus-${index}`)]));
  const service = serviceFor(records);
  for (const [label, workflow, ruleId, status, count] of cases) {
    const output = await service.generate(workflow, `token-${label}`);
    const finding = output.report.findings.find((item) => item.id === ruleId);
    assert.equal(finding.status, status, `${label}: ${ruleId} status`);
    assert.equal(finding.count, count, `${label}: ${ruleId} count`);
  }
});

test('report HTML escapes all report-facing strings', async () => {
  const output = await serviceFor({ paid_token: paid() }).generate(sensitiveWorkflow(), 'paid_token');
  assert.doesNotMatch(output.html, /<script>private workflow<\/script>/);
  assert.doesNotMatch(output.html, /private\.example\.test/);
});

test('parser rejects malformed, oversized, non-object, and non-text input', () => {
  assert.throws(() => parseWorkflowJson('{broken'), (error) => error.code === 'INVALID_JSON');
  assert.throws(() => parseWorkflowJson('[]'), (error) => error.code === 'INVALID_WORKFLOW');
  assert.throws(() => parseWorkflowJson('"text"'), (error) => error.code === 'INVALID_WORKFLOW');
  assert.throws(() => parseWorkflowJson('{"nodes":[]}', 3), (error) => error.code === 'FILE_TOO_LARGE');
  assert.throws(() => parseWorkflowJson(null), (error) => error.code === 'INVALID_INPUT');
});

test('inactive adapter fails closed without simulating payment', async () => {
  const service = new PremiumReportService({
    entitlementAdapter: createInactiveEntitlementAdapter(),
    now: () => new Date(now)
  });
  await assert.rejects(service.generate(sensitiveWorkflow(), 'anything'), (error) => error.code === 'CHECKOUT_INACTIVE');
});

test('entitlement validation does not trust a redirect-shaped object', () => {
  assert.throws(
    () => validateEntitlement({ id: 'cs_test_redirect', payment_status: 'paid', product: PRODUCT }, now),
    (error) => error.code === 'UNVERIFIED_ENTITLEMENT'
  );
});

test('public paid page is locked, inactive, and contains no demo or checkout bypass', () => {
  const html = readFileSync(join(__dirname, 'docs', 'premium-report.html'), 'utf8');
  assert.match(html, /Checkout is inactive/i);
  assert.match(html, /server-verified paid entitlement/i);
  assert.match(html, /never leaves this browser/i);
  assert.match(html, /USD 125/);
  assert.match(html, /USD 250/);
  assert.match(html, /createInactiveEntitlementAdapter/);
  assert.doesNotMatch(html, /demo-entitlement|paid_token|buy\.stripe|checkout\.stripe/);
});

test('demo adapter is not present in the public docs directory', () => {
  assert.throws(() => readFileSync(join(__dirname, 'docs', 'demo-entitlement-adapter.js'), 'utf8'));
});
