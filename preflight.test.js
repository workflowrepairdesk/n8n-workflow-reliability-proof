const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { analyzeWorkflow, createDerivedManifest } = require('./docs/preflight.js');

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

test('page states local-only privacy and does not claim checkout is active', () => {
  const html = readFileSync(join(__dirname, 'docs', 'preflight.html'), 'utf8');
  assert.match(html, /entirely in your browser/i);
  assert.match(html, /no upload endpoint/i);
  assert.match(html, /USD 29/);
  assert.match(html, /Checkout is not active yet/i);
  assert.match(html, /it does not charge you/i);
  assert.match(html, /excludes the source JSON/i);
  assert.doesNotMatch(html, /stripe\.com|buy\.stripe/);
});
