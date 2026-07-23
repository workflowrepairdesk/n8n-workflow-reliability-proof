const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const page = (name) => readFileSync(join(__dirname, 'docs', name), 'utf8');

test('diagnostic offer states price, repair credit, scope, and contact path', () => {
  const html = page('diagnostic.html');
  assert.match(html, /<title>n8n, Webhook &amp; API Failure Diagnostic/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/workflowrepairdesk\.github\.io\/n8n-workflow-reliability-proof\/diagnostic\.html">/i);
  assert.match(html, /property="og:title" content="n8n, Webhook &amp; API Failure Diagnostic"/i);
  assert.match(html, /name="twitter:title" content="n8n, Webhook &amp; API Failure Diagnostic"/i);
  assert.match(html, /duplicate actions, silent stops, bad routing, mapping errors, retries, or timeouts/i);
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
  assert.match(html, /Copy complete four-line intake/i);
  assert.match(html, /Common automation failure patterns/i);
  assert.match(html, /Duplicate actions after a retry/i);
  assert.match(html, /stops without a usable downstream result/i);
  assert.match(html, /wrong field or destination/i);
  assert.match(html, /What the diagnostic would inspect/i);
  assert.match(html, /idempotency boundary/i);
  assert.match(html, /error-handling settings/i);
  assert.match(html, /sanitized input\/output example/i);
  assert.match(html, /planned inspection boundary, not a finding or guarantee/i);
  assert.match(html, /inspectionPreview\.innerHTML/i);
  assert.match(html, /Failure pattern and evidence plan added/i);
  assert.match(html, /Browser-local diagnostic intake builder/i);
  assert.match(html, /0 of 4 intake fields complete/i);
  assert.match(html, /4 of 4 intake fields complete/i);
  assert.match(html, /Nothing is uploaded or submitted/i);
  assert.match(html, /copyButton\.disabled = !ready/i);
  assert.match(html, /intakeInputs\.failure\.value = preset\.dataset\.failure/i);
  assert.match(html, /Your draft survives a refresh in this tab/i);
  assert.match(html, /sessionStorage\.setItem\(intakeDraftKey/i);
  assert.match(html, /restoreIntakeDraft\(\)/i);
  assert.match(html, /Draft restored after refresh/i);
  assert.match(html, /Clear this draft/i);
  assert.match(html, /sessionStorage\.removeItem\(intakeDraftKey\)/i);
  assert.match(html, /navigator\.clipboard\.writeText/);
  assert.match(html, /Sanitized evidence available:/i);
  assert.match(html, /Keep names, customer data, credentials, and production logs out/i);
  assert.match(html, /60-second scope-fit check/i);
  assert.match(html, /I can isolate one trigger-to-result path/i);
  assert.match(html, /expected result and what happens instead/i);
  assert.match(html, /sanitized evidence or concrete observations/i);
  assert.match(html, /not an emergency incident/i);
  assert.match(html, /Likely fit: use the four-line intake below/i);
  assert.match(html, /Not ready yet:/i);
  assert.match(html, /data-state="ready"/i);
  assert.match(html, /Payment is requested only after you approve/i);
  assert.match(html, /What happens after the fit check/i);
  assert.match(html, /Two-business-day diagnostic/i);
  assert.match(html, /agreed sanitized evidence and funded order are in place/i);
  assert.match(html, /repair now, instrument first, or stop without buying a repair/i);
  assert.match(html, /repair is a separate, written scope that you can accept or decline/i);
  assert.match(html, /Public synthetic sample/i);
  assert.match(html, /4 tests passed/i);
  assert.match(html, /5 ranked findings/i);
  assert.match(html, /mailto:workflowrepairdesk@gmail\.com/);
  assert.match(html, /href="diagnostic-sample\.html"/);
  assert.ok(html.indexOf('href="diagnostic-sample.html"') < html.indexOf('<section class="grid"'));
});

test('diagnostic publishes valid service offer structured data', () => {
  const html = page('diagnostic.html');
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'structured data block is present');
  const data = JSON.parse(match[1]);
  assert.equal(data['@type'], 'Service');
  assert.equal(data.name, 'n8n, Webhook and API Failure Diagnostic');
  assert.equal(data.offers['@type'], 'Offer');
  assert.equal(data.offers.price, '125');
  assert.equal(data.offers.priceCurrency, 'USD');
  assert.match(data.description, /n8n, webhook, or API path/i);
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
