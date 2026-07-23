(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WorkflowPreflight = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FREE_CHECKS = new Set([
    'valid-structure',
    'disabled-nodes',
    'continue-on-fail',
    'retry-policy',
    'error-workflow'
  ]);

  const definitions = [
    ['valid-structure', 'Workflow structure', 'high'],
    ['disabled-nodes', 'Disabled nodes', 'medium'],
    ['continue-on-fail', 'Silent failure paths', 'high'],
    ['retry-policy', 'Retry coverage', 'medium'],
    ['error-workflow', 'Error workflow', 'high'],
    ['webhook-auth', 'Webhook authentication', 'high'],
    ['duplicate-webhooks', 'Duplicate webhook paths', 'high'],
    ['hardcoded-secrets', 'Possible embedded secrets', 'high'],
    ['unbounded-http', 'HTTP timeout coverage', 'medium'],
    ['execution-retention', 'Execution retention settings', 'low'],
    ['node-versions', 'Node version metadata', 'low'],
    ['workflow-state', 'Workflow activation state', 'medium']
  ];

  function result(id, status, summary, count) {
    const definition = definitions.find((item) => item[0] === id);
    return {
      id,
      title: definition[1],
      severity: definition[2],
      status,
      summary,
      count: Number.isFinite(count) ? count : 0,
      free: FREE_CHECKS.has(id)
    };
  }

  function nodeType(node) {
    return String(node && node.type || '').toLowerCase();
  }

  function containsSecretLikeValue(value, key) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'object') {
      return Object.entries(value).some(([childKey, child]) => containsSecretLikeValue(child, childKey));
    }
    if (typeof value !== 'string') return false;
    const label = String(key || '').toLowerCase();
    const sensitiveLabel = /(api.?key|secret|password|private.?key|access.?token|auth.?token)/i.test(label);
    const expressionOrPlaceholder = /^={{|^\$\{|credential|redacted|example|placeholder/i.test(value);
    return sensitiveLabel && value.length >= 8 && !expressionOrPlaceholder;
  }

  function analyzeWorkflow(workflow) {
    if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) {
      throw new Error('The selected file must contain one JSON object.');
    }

    const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
    const settings = workflow.settings && typeof workflow.settings === 'object' ? workflow.settings : {};
    const valid = nodes.length > 0 && workflow.connections && typeof workflow.connections === 'object';
    const disabled = nodes.filter((node) => node && node.disabled === true);
    const silent = nodes.filter((node) => node && (node.continueOnFail === true || node.onError === 'continueRegularOutput' || node.onError === 'continueErrorOutput'));
    const retryCandidates = nodes.filter((node) => /http|request|webhook|email|slack|postgres|mysql|redis|api/.test(nodeType(node)));
    const retried = retryCandidates.filter((node) => node.retryOnFail === true || Number(node.maxTries) > 1);
    const webhooks = nodes.filter((node) => nodeType(node).includes('webhook'));
    const unauthenticated = webhooks.filter((node) => {
      const auth = String(node.parameters && (node.parameters.authentication || node.parameters.auth) || '').toLowerCase();
      return !auth || auth === 'none';
    });
    const webhookPaths = webhooks.map((node) => String(node.parameters && node.parameters.path || '')).filter(Boolean);
    const duplicatePaths = webhookPaths.filter((path, index) => webhookPaths.indexOf(path) !== index);
    const possibleSecrets = nodes.filter((node) => containsSecretLikeValue(node.parameters || {}, 'parameters'));
    const httpNodes = nodes.filter((node) => /httprequest|http request/.test(nodeType(node)));
    const noTimeout = httpNodes.filter((node) => {
      const p = node.parameters || {};
      const options = p.options || {};
      return !(Number(p.timeout) > 0 || Number(options.timeout) > 0);
    });
    const missingVersions = nodes.filter((node) => !(Number(node.typeVersion) > 0));
    const hasErrorWorkflow = Boolean(settings.errorWorkflow || settings.errorWorkflowId);
    const hasRetentionPolicy = Boolean(settings.saveDataErrorExecution || settings.saveDataSuccessExecution || settings.executionTimeout || settings.saveManualExecutions !== undefined);

    const checks = [
      result('valid-structure', valid ? 'pass' : 'fail', valid ? `Recognized an automation export with ${nodes.length} nodes.` : 'Expected a non-empty nodes array and a connections object.', valid ? 0 : 1),
      result('disabled-nodes', disabled.length ? 'warn' : 'pass', disabled.length ? `${disabled.length} disabled node${disabled.length === 1 ? '' : 's'} may change the intended path.` : 'No disabled nodes detected.', disabled.length),
      result('continue-on-fail', silent.length ? 'warn' : 'pass', silent.length ? `${silent.length} node${silent.length === 1 ? '' : 's'} can continue after an error; verify downstream handling.` : 'No continue-after-error settings detected.', silent.length),
      result('retry-policy', retryCandidates.length && retried.length < retryCandidates.length ? 'warn' : 'pass', retryCandidates.length ? `${retried.length} of ${retryCandidates.length} external-operation nodes declare retries.` : 'No obvious external-operation nodes detected.', retryCandidates.length - retried.length),
      result('error-workflow', hasErrorWorkflow ? 'pass' : 'warn', hasErrorWorkflow ? 'An error workflow is configured.' : 'No workflow-level error workflow was detected.', hasErrorWorkflow ? 0 : 1),
      result('webhook-auth', unauthenticated.length ? 'fail' : 'pass', unauthenticated.length ? `${unauthenticated.length} webhook node${unauthenticated.length === 1 ? '' : 's'} appear to have no authentication mode.` : 'No unauthenticated webhook configuration detected.', unauthenticated.length),
      result('duplicate-webhooks', duplicatePaths.length ? 'fail' : 'pass', duplicatePaths.length ? `${new Set(duplicatePaths).size} repeated webhook path${new Set(duplicatePaths).size === 1 ? '' : 's'} detected.` : 'No duplicate webhook paths detected.', new Set(duplicatePaths).size),
      result('hardcoded-secrets', possibleSecrets.length ? 'fail' : 'pass', possibleSecrets.length ? `${possibleSecrets.length} node${possibleSecrets.length === 1 ? '' : 's'} contain values under secret-like parameter names. Review locally.` : 'No obvious literal values under secret-like parameter names detected.', possibleSecrets.length),
      result('unbounded-http', noTimeout.length ? 'warn' : 'pass', noTimeout.length ? `${noTimeout.length} HTTP request node${noTimeout.length === 1 ? '' : 's'} do not declare a timeout.` : 'HTTP request nodes declare timeouts, or none were detected.', noTimeout.length),
      result('execution-retention', hasRetentionPolicy ? 'pass' : 'warn', hasRetentionPolicy ? 'Execution behavior or retention settings are present.' : 'No explicit execution retention/timeout settings were detected.', hasRetentionPolicy ? 0 : 1),
      result('node-versions', missingVersions.length ? 'warn' : 'pass', missingVersions.length ? `${missingVersions.length} node${missingVersions.length === 1 ? '' : 's'} lack type-version metadata.` : 'All nodes include type-version metadata.', missingVersions.length),
      result('workflow-state', workflow.active === true ? 'pass' : 'warn', workflow.active === true ? 'The export is marked active.' : 'The export is not marked active; verify intended deployment state.', workflow.active === true ? 0 : 1)
    ];

    const weights = { high: 18, medium: 10, low: 5 };
    const deductions = checks.reduce((sum, check) => {
      if (check.status === 'pass') return sum;
      return sum + weights[check.severity] * (check.status === 'fail' ? 1 : 0.55);
    }, 0);

    return {
      version: 1,
      score: Math.max(0, Math.round(100 - deductions)),
      nodeCount: nodes.length,
      checkCount: checks.length,
      freeCheckCount: checks.filter((check) => check.free).length,
      counts: {
        pass: checks.filter((check) => check.status === 'pass').length,
        warn: checks.filter((check) => check.status === 'warn').length,
        fail: checks.filter((check) => check.status === 'fail').length
      },
      checks
    };
  }

  function createDerivedManifest(analysis) {
    return {
      report: 'Workflow Reliability Preflight',
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      privacy: 'Derived findings only. No workflow JSON, names, URLs, parameters, expressions, credentials, or node content included.',
      score: analysis.score,
      nodeCount: analysis.nodeCount,
      checkCount: analysis.checkCount,
      counts: { ...analysis.counts },
      findings: analysis.checks.map(({ id, title, severity, status, count }) => ({ id, title, severity, status, count }))
    };
  }

  function createDiagnosticEmailHref(analysis) {
    const knownCheckIds = new Set(definitions.map(([id]) => id));
    const safeStatuses = new Set(['warn', 'fail']);
    const flaggedChecks = Array.isArray(analysis && analysis.checks)
      ? analysis.checks
        .filter((check) => knownCheckIds.has(check.id) && safeStatuses.has(check.status))
        .map((check) => `${check.id}: ${check.status} (${Number.isFinite(check.count) ? check.count : 0})`)
      : [];
    const count = (key) => Number.isFinite(analysis && analysis.counts && analysis.counts[key])
      ? analysis.counts[key]
      : 0;
    const body = [
      'I would like a free fit check for the USD 125 Automation Failure Diagnostic.',
      '',
      'Derived browser-local preflight summary:',
      `Score: ${Number.isFinite(analysis && analysis.score) ? analysis.score : 0}/100`,
      `Node count: ${Number.isFinite(analysis && analysis.nodeCount) ? analysis.nodeCount : 0}`,
      `Checks: ${count('pass')} pass, ${count('warn')} warn, ${count('fail')} fail`,
      `Flagged check IDs: ${flaggedChecks.length ? flaggedChecks.join(', ') : 'none'}`,
      '',
      'What I need help with (optional; do not include credentials or customer data):',
      '',
      'Please do not attach an unredacted workflow. This email contains only derived summary fields from the scan.'
    ].join('\n');

    return `mailto:workflowrepairdesk@gmail.com?subject=${encodeURIComponent('USD 125 Automation Failure Diagnostic fit check')}&body=${encodeURIComponent(body)}`;
  }

  return { analyzeWorkflow, createDerivedManifest, createDiagnosticEmailHref, FREE_CHECKS: Array.from(FREE_CHECKS) };
});
