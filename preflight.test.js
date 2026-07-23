const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { analyzeWorkflow, createDerivedManifest, createDiagnosticEmailHref } = require('./docs/preflight.js');

const fixture = () => ({
  name: 'Sensitive workflow name',
  active: false,
  nodes: [
    { name: 'Inbound', type: 'n8n-nodes-base.webhook', typeVersion: 2, parameters: { path: 'private-path', authentication: 'none' } },
    { name: 'API', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, continueOnFail: true, parameters: { url: 'https://private.example.test', apiKey: 'super-secret-value', options: {} } },
    { name: 'Off', type: 'n8n-nodes-base.set', typeVersion: 3, disabled: true, parameters: {} }
  ],
  connections: {},
  settings: {}
});

test('analyzes an n8n-shaped export and exposes exactly five free checks', () => {
  const analysis = analyzeWorkflow(fixture());
  assert.equal(analysis.nodeCount, 3);
  assert.equal(analysis.checkCount, 12);
  assert.equal(analysis.freeCheckCount, 5);
  assert.equal(analysis.checks.filter((check) => check.free).length, 5);
  assert.equal(analysis.checks.find((check) => check.id === 'webhook-auth').status, 'fail');
  assert.equal(analysis.checks.find((check) => check.id === 'hardcoded-secrets').status, 'fail');
});

test('does not treat webhook response plumbing as an inbound webhook or retry candidate', () => {
  const analysis = analyzeWorkflow({
    active: true,
    nodes: [
      { name: 'Inbound', type: 'n8n-nodes-base.webhook', typeVersion: 2, parameters: { path: 'synthetic-hook', authentication: 'headerAuth' } },
      { name: 'Reply', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1, parameters: {} }
    ],
    connections: {},
    settings: { errorWorkflow: 'synthetic-error-handler' }
  });

  const authentication = analysis.checks.find((check) => check.id === 'webhook-auth');
  const retry = analysis.checks.find((check) => check.id === 'retry-policy');
  assert.equal(authentication.status, 'pass');
  assert.equal(authentication.count, 0);
  assert.equal(retry.status, 'pass');
  assert.equal(retry.count, 0);
  assert.match(retry.summary, /No obvious external-operation nodes detected/i);
});

test('counts only outbound operations when measuring declared retry coverage', () => {
  const analysis = analyzeWorkflow({
    active: true,
    nodes: [
      { name: 'Inbound', type: 'n8n-nodes-base.webhook', typeVersion: 2, parameters: { path: 'synthetic-hook', authentication: 'headerAuth' } },
      { name: 'API call', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, retryOnFail: true, maxTries: 3, parameters: { url: 'https://example.test', options: { timeout: 5000 } } },
      { name: 'Reply', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1, parameters: {} }
    ],
    connections: {},
    settings: { errorWorkflow: 'synthetic-error-handler' }
  });

  const retry = analysis.checks.find((check) => check.id === 'retry-policy');
  assert.equal(retry.status, 'pass');
  assert.equal(retry.count, 0);
  assert.match(retry.summary, /1 of 1 external-operation nodes declare retries/i);
});

test('rejects arrays and objects without a useful workflow structure', () => {
  assert.throws(() => analyzeWorkflow([]), /one JSON object/i);
  const analysis = analyzeWorkflow({ nodes: [], connections: {} });
  assert.equal(analysis.checks.find((check) => check.id === 'valid-structure').status, 'fail');
});

test('derived manifest contains no source workflow values', () => {
  const manifest = createDerivedManifest(analyzeWorkflow(fixture()));
  const serialized = JSON.stringify(manifest);
  for (const sensitive of ['Sensitive workflow name', 'Inbound', 'API', 'Off', 'private-path', 'private.example.test', 'super-secret-value']) {
    assert.doesNotMatch(serialized, new RegExp(sensitive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.equal(manifest.findings.length, 12);
  assert.match(manifest.privacy, /Derived findings only/i);
});

test('diagnostic email contains only whitelisted derived summary fields', () => {
  const analysis = analyzeWorkflow(fixture());
  analysis.checks[0].summary = 'leaked private.example.test super-secret-value';
  analysis.checks[0].title = 'Sensitive workflow name';
  analysis.checks.push({ id: 'private-path', status: 'fail', count: 99, summary: 'Inbound API Off' });
  const href = createDiagnosticEmailHref(analysis);
  const decoded = decodeURIComponent(href);

  assert.match(decoded, /^mailto:workflowrepairdesk@gmail\.com\?/);
  assert.match(decoded, /USD 125 Automation Failure Diagnostic fit check/);
  assert.match(decoded, /Score: \d+\/100/);
  assert.match(decoded, /Node count: 3/);
  assert.match(decoded, /webhook-auth: fail \(1\)/);
  assert.match(decoded, /do not attach an unredacted workflow/i);
  for (const sensitive of ['Sensitive workflow name', 'Inbound', 'API', 'Off', 'private-path', 'private.example.test', 'super-secret-value']) {
    assert.doesNotMatch(decoded, new RegExp(sensitive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('page states local-only privacy and does not claim checkout is active', () => {
  const html = readFileSync(join(__dirname, 'docs', 'preflight.html'), 'utf8');
  assert.match(html, /entirely in your browser/i);
  assert.match(html, /no upload endpoint/i);
  assert.match(html, /USD 29/);
  assert.match(html, /Checkout is not active yet/i);
  assert.match(html, /it does not charge you/i);
  assert.match(html, /excludes the source JSON/i);
  assert.match(html, /One failing path[^<]*USD 125/i);
  assert.match(html, /Buy when:/i);
  assert.match(html, /Start a private fit-check email/i);
  assert.match(html, /only the score, node\/check counts, and flagged check IDs/i);
  assert.match(html, /There is no checkout on this page/i);
  assert.match(html, /createDiagnosticEmailHref\(analysis\)/);
  assert.doesNotMatch(html, /stripe\.com|buy\.stripe/);
});
