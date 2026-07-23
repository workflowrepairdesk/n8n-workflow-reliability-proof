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
  assert.match(html, /Get a free fit check/i);
  assert.match(html, /fit check is free/i);
  assert.match(html, /No call, login, credentials, or attachment required/i);
  assert.match(html, /Copy-paste intake/i);
  assert.match(html, /Upwork or Contra/i);
  assert.match(html, /keep pre-contract communication and payment on-platform/i);
  assert.match(html, /Copy four-line intake/i);
  assert.match(html, /Common automation failure patterns/i);
  assert.match(html, /Duplicate actions after a retry/i);
  assert.match(html, /stops without a usable downstream result/i);
  assert.match(html, /wrong field or destination/i);
  assert.match(html, /Failure pattern added/i);
  assert.match(html, /navigator\.clipboard\.writeText/);
  assert.match(html, /Sanitized evidence available:/i);
  assert.match(html, /Keep names, customer data, credentials, and production logs out/i);
  assert.match(html, /Payment is requested only after you approve/i);
  assert.match(html, /Public synthetic sample/i);
  assert.match(html, /4 tests passed/i);
  assert.match(html, /5 ranked findings/i);
  assert.match(html, /mailto:workflowrepairdesk@gmail\.com/);
  assert.match(html, /href="diagnostic-sample\.html"/);
  assert.ok(html.indexOf('href="diagnostic-sample.html"') < html.indexOf('<section class="grid"'));
});

test('sample prominently preserves synthetic evidence boundaries', () => {
  const html = page('diagnostic-sample.html');
  assert.match(html, /Sample &middot; self-directed &middot; non-production &middot; synthetic data only/i);
  assert.match(html, /not client work/i);
  assert.match(html, /does not emulate n8n/i);
  assert.match(html, /No production action is performed/i);
});

test('data QA sample is synthetic, bounded, priced, and connected to a buyer route', () => {
  const html = page('data-qa-sample.html');
  assert.match(html, /self-directed synthetic data/i);
  assert.match(html, /not client work/i);
  assert.match(html, /USD 150/);
  assert.match(html, /up to 10,000 records/i);
  assert.match(html, /Duplicate primary key/i);
  assert.match(html, /Invalid calendar date/i);
  assert.match(html, /Required value missing/i);
  assert.match(html, /Quantity outlier/i);
  assert.match(html, /Unexpected enum value/i);
  assert.match(html, /Do not email customer data, credentials, or the dataset itself/i);
  assert.match(html, /mailto:workflowrepairdesk@gmail\.com/);
});

test('home page exposes the data QA acquisition artifact', () => {
  const html = page('index.html');
  assert.match(html, /href="data-qa-sample\.html"/);
  assert.match(html, /USD 150 data QA sprint sample/i);
});
