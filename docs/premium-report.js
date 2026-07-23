(function (root, factory) {
  const preflight = typeof module === 'object' && module.exports
    ? require('./preflight.js')
    : root.WorkflowPreflight;
  const api = factory(preflight);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WorkflowPremiumReport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (preflight) {
  'use strict';

  const PRODUCT = 'private-workflow-reliability-report-v1';
  const PRICE_USD = 29;
  const MAX_JSON_BYTES = 10 * 1024 * 1024;
  const SCANNER_VERSION = '1.0.0';

  const guidance = {
    'valid-structure': ['confirmed', 'Validate the export format before relying on any other result.'],
    'disabled-nodes': ['confirmed', 'Confirm every disabled node is intentionally excluded from the deployed path.'],
    'continue-on-fail': ['confirmed', 'Trace each continue-after-error branch and add an observable failure outcome.'],
    'retry-policy': ['heuristic', 'Add bounded retries only where the operation is safe to repeat, then test exhaustion behavior.'],
    'error-workflow': ['confirmed', 'Configure and test a workflow-level error path with a visible owner.'],
    'webhook-auth': ['heuristic', 'Confirm an appropriate authentication control before exposing the webhook.'],
    'duplicate-webhooks': ['confirmed', 'Give each inbound path an unambiguous route and regression-test collisions.'],
    'hardcoded-secrets': ['heuristic', 'Replace literal secret-like values with platform-managed credentials and rotate exposed values.'],
    'unbounded-http': ['heuristic', 'Set a bounded timeout and define what happens after timeout or retry exhaustion.'],
    'execution-retention': ['heuristic', 'Set explicit execution retention and timeout behavior appropriate to the data handled.'],
    'node-versions': ['confirmed', 'Pin and review node-version metadata before migration or deployment.'],
    'workflow-state': ['confirmed', 'Confirm the exported activation state matches the intended deployment state.']
  };

  class PremiumReportError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'PremiumReportError';
      this.code = code;
    }
  }

  function parseWorkflowJson(text, maxBytes = MAX_JSON_BYTES) {
    if (typeof text !== 'string') {
      throw new PremiumReportError('INVALID_INPUT', 'The workflow export must be JSON text.');
    }
    const bytes = typeof TextEncoder === 'function'
      ? new TextEncoder().encode(text).byteLength
      : Buffer.byteLength(text, 'utf8');
    if (bytes > maxBytes) {
      throw new PremiumReportError('FILE_TOO_LARGE', `The local report accepts JSON files up to ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
    }
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new PremiumReportError('INVALID_WORKFLOW', 'The selected file must contain one JSON object.');
      }
      return parsed;
    } catch (error) {
      if (error instanceof PremiumReportError) throw error;
      throw new PremiumReportError('INVALID_JSON', 'The selected file is not valid JSON.');
    }
  }

  function validateEntitlement(record, now = new Date()) {
    if (!record || typeof record !== 'object') {
      throw new PremiumReportError('ENTITLEMENT_REQUIRED', 'A verified paid entitlement is required.');
    }
    if (record.verifiedByServer !== true) {
      throw new PremiumReportError('UNVERIFIED_ENTITLEMENT', 'The entitlement was not verified by the fulfillment server.');
    }
    if (record.paymentStatus !== 'paid') {
      throw new PremiumReportError('PAYMENT_NOT_PAID', 'The payment is not marked paid.');
    }
    if (record.product !== PRODUCT) {
      throw new PremiumReportError('WRONG_PRODUCT', 'This entitlement does not unlock the Private Workflow Reliability Report.');
    }
    if (typeof record.id !== 'string' || !record.id.trim()) {
      throw new PremiumReportError('INVALID_ENTITLEMENT', 'The entitlement is missing its server-issued identifier.');
    }
    const expiresAt = Date.parse(record.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
      throw new PremiumReportError('ENTITLEMENT_EXPIRED', 'The paid-report entitlement has expired.');
    }
    return {
      id: record.id,
      product: record.product,
      paymentStatus: record.paymentStatus,
      expiresAt: new Date(expiresAt).toISOString()
    };
  }

  function createInactiveEntitlementAdapter() {
    return Object.freeze({
      async verify() {
        throw new PremiumReportError(
          'CHECKOUT_INACTIVE',
          'Paid checkout is not active. Stripe activation and a human-approved live product are still required.'
        );
      }
    });
  }

  function safeAnalysisShape(analysis) {
    return {
      version: Number(analysis.version) || 1,
      score: Number(analysis.score) || 0,
      nodeCount: Number(analysis.nodeCount) || 0,
      checkCount: Number(analysis.checkCount) || 0,
      counts: {
        pass: Number(analysis.counts && analysis.counts.pass) || 0,
        warn: Number(analysis.counts && analysis.counts.warn) || 0,
        fail: Number(analysis.counts && analysis.counts.fail) || 0
      },
      findings: analysis.checks.map((check) => ({
        id: check.id,
        status: check.status,
        severity: check.severity,
        count: Number(check.count) || 0
      }))
    };
  }

  function fingerprint(value) {
    const text = JSON.stringify(value);
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return `derived-${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function buildDerivedReport(analysis, generatedAt) {
    const safe = safeAnalysisShape(analysis);
    const findings = analysis.checks.map((check) => {
      const rule = guidance[check.id];
      if (!rule) throw new PremiumReportError('UNKNOWN_RULE', 'The scanner returned an unsupported rule.');
      return {
        id: check.id,
        title: check.title,
        severity: check.severity,
        status: check.status,
        count: Number(check.count) || 0,
        evidenceClass: rule[0],
        recommendation: rule[1]
      };
    });
    const priority = { fail: 0, warn: 1, pass: 2 };
    const severity = { high: 0, medium: 1, low: 2 };
    const prioritized = findings
      .filter((finding) => finding.status !== 'pass')
      .sort((left, right) => priority[left.status] - priority[right.status] || severity[left.severity] - severity[right.severity])
      .map((finding) => finding.id);

    return {
      report: 'Private Workflow Reliability Report',
      schemaVersion: 1,
      product: { code: PRODUCT, priceUsd: PRICE_USD },
      generatedAt,
      scannerVersion: SCANNER_VERSION,
      analysisFingerprint: fingerprint(safe),
      privacy: 'Generated locally from derived findings only. No workflow JSON, names, URLs, paths, parameters, expressions, credentials, filenames, node content, or raw finding text is included.',
      overview: {
        score: safe.score,
        nodeCount: safe.nodeCount,
        checkCount: safe.checkCount,
        counts: safe.counts,
        prioritizedFindingIds: prioritized
      },
      findings,
      limitations: [
        'Static review only; runtime behavior and external systems are not observed.',
        'Not penetration testing, legal advice, compliance certification, production monitoring, or a guarantee against outages.',
        'Heuristic findings require human confirmation before changes are made.'
      ],
      nextSteps: [
        { offer: 'Automation Failure Diagnostic', priceUsd: 125, scope: 'One bounded failing path with written evidence and acceptance checks.' },
        { offer: 'Bounded Repair Trial', priceUsdFrom: 250, scope: 'One agreed repair only after fit, scope, access boundaries, and acceptance criteria are confirmed.' }
      ]
    };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function renderDerivedHtml(report) {
    const findings = report.findings.map((finding) => `
      <article class="finding ${escapeHtml(finding.status)}">
        <h3>${escapeHtml(finding.title)}</h3>
        <p><strong>${escapeHtml(finding.status.toUpperCase())}</strong> · ${escapeHtml(finding.severity)} · ${finding.count} flagged</p>
        <p>${escapeHtml(finding.recommendation)}</p>
        <small>${escapeHtml(finding.evidenceClass)} static signal · rule ${escapeHtml(finding.id)}</small>
      </article>`).join('');
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Private Workflow Reliability Report</title>
<style>body{font:16px/1.5 system-ui;max-width:900px;margin:40px auto;padding:0 20px;color:#17211d}header,.finding,.notice{border:1px solid #ccd8d2;border-radius:10px;padding:18px;margin:14px 0}.fail{border-left:6px solid #bd2631}.warn{border-left:6px solid #b47700}.pass{border-left:6px solid #16834b}small{color:#51625a}</style>
</head><body><header><h1>${escapeHtml(report.report)}</h1><p>Score: <strong>${report.overview.score}/100</strong> · ${report.overview.nodeCount} nodes · ${report.overview.checkCount} checks</p><p>${escapeHtml(report.privacy)}</p></header>
<section><h2>Evidence-linked findings</h2>${findings}</section>
<section class="notice"><h2>Limits</h2><ul>${report.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
<section class="notice"><h2>Need a human diagnosis or repair?</h2><p><strong>USD 125:</strong> one bounded Automation Failure Diagnostic. <strong>USD 250+:</strong> one bounded repair trial after fit confirmation.</p><p>Contact workflowrepairdesk@gmail.com without attaching an unredacted workflow.</p></section>
<footer><small>Generated ${escapeHtml(report.generatedAt)} · scanner ${escapeHtml(report.scannerVersion)} · ${escapeHtml(report.analysisFingerprint)}</small></footer></body></html>`;
  }

  class PremiumReportService {
    constructor({ entitlementAdapter, now = () => new Date() } = {}) {
      if (!entitlementAdapter || typeof entitlementAdapter.verify !== 'function') {
        throw new PremiumReportError('ADAPTER_REQUIRED', 'An entitlement adapter with a verify method is required.');
      }
      this.entitlementAdapter = entitlementAdapter;
      this.now = now;
      this.fulfilled = new Map();
    }

    async generate(workflow, opaqueToken) {
      if (typeof opaqueToken !== 'string' || !opaqueToken.trim()) {
        throw new PremiumReportError('TOKEN_REQUIRED', 'A server-issued entitlement token is required.');
      }
      const entitlement = validateEntitlement(await this.entitlementAdapter.verify(opaqueToken), this.now());
      const analysis = preflight.analyzeWorkflow(workflow);
      const safeKey = fingerprint(safeAnalysisShape(analysis));
      const previous = this.fulfilled.get(entitlement.id);
      if (previous) {
        if (previous.safeKey !== safeKey) {
          throw new PremiumReportError('ENTITLEMENT_ALREADY_USED', 'This entitlement has already generated a report for another local analysis.');
        }
        return previous.output;
      }
      const report = buildDerivedReport(analysis, this.now().toISOString());
      const output = Object.freeze({
        report,
        json: JSON.stringify(report, null, 2),
        html: renderDerivedHtml(report)
      });
      this.fulfilled.set(entitlement.id, { safeKey, output });
      return output;
    }
  }

  return {
    PRODUCT,
    PRICE_USD,
    MAX_JSON_BYTES,
    SCANNER_VERSION,
    PremiumReportError,
    PremiumReportService,
    parseWorkflowJson,
    validateEntitlement,
    createInactiveEntitlementAdapter,
    buildDerivedReport,
    renderDerivedHtml
  };
});
