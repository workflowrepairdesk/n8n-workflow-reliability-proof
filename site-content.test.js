const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const page = (name) => readFileSync(join(__dirname, 'docs', name), 'utf8');

test('diagnostic offer states price, repair credit, scope, and contact path', () => {
  const html = page('diagnostic.html');
  assert.match(html, /USD 125/);
  assert.match(html, /credited in full/i);
  assert.match(html, /USD 250 or more/);
  assert.match(html, /one bounded automation path/i);
  assert.match(html, /Before you pay/i);
  assert.match(html, /Good fit/i);
  assert.match(html, /Not a fit/i);
  assert.match(html, /say so before accepting the diagnostic/i);
  assert.match(html, /mailto:workflowrepairdesk@gmail\.com/);
  assert.match(html, /href="diagnostic-sample\.html"/);
});

test('sample prominently preserves synthetic evidence boundaries', () => {
  const html = page('diagnostic-sample.html');
  assert.match(html, /Sample &middot; self-directed &middot; non-production &middot; synthetic data only/i);
  assert.match(html, /not client work/i);
  assert.match(html, /does not emulate n8n/i);
  assert.match(html, /No production action is performed/i);
});
