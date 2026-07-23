'use strict';

// Repository-owned synthetic exports with human-labeled expected findings.
// These fixtures contain no client data, credentials, or live endpoints.
module.exports = [
  {
    label: 'authenticated webhook and response plumbing',
    workflow: {
      active: true,
      nodes: [
        { type: 'n8n-nodes-base.webhook', typeVersion: 2, parameters: { path: 'synthetic-a', authentication: 'headerAuth' } },
        { type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1, parameters: {} }
      ],
      connections: {},
      settings: { errorWorkflow: 'synthetic-handler' }
    },
    expected: {
      free: { 'valid-structure': ['pass', 0], 'disabled-nodes': ['pass', 0], 'continue-on-fail': ['pass', 0], 'retry-policy': ['pass', 0], 'error-workflow': ['pass', 0] },
      extended: { 'webhook-auth': ['pass', 0], 'unbounded-http': ['pass', 0] }
    }
  },
  {
    label: 'empty malformed export',
    workflow: { active: false, nodes: [], connections: {}, settings: {} },
    expected: {
      free: { 'valid-structure': ['fail', 1], 'disabled-nodes': ['pass', 0], 'continue-on-fail': ['pass', 0], 'retry-policy': ['pass', 0], 'error-workflow': ['warn', 1] },
      extended: {}
    }
  },
  {
    label: 'disabled transform node',
    workflow: {
      active: false,
      nodes: [{ type: 'n8n-nodes-base.set', typeVersion: 3, disabled: true, parameters: {} }],
      connections: {},
      settings: { errorWorkflowId: 'synthetic-handler' }
    },
    expected: {
      free: { 'valid-structure': ['pass', 0], 'disabled-nodes': ['warn', 1], 'continue-on-fail': ['pass', 0], 'retry-policy': ['pass', 0], 'error-workflow': ['pass', 0] },
      extended: {}
    }
  },
  {
    label: 'continue-after-error transform',
    workflow: {
      active: true,
      nodes: [{ type: 'n8n-nodes-base.set', typeVersion: 3, onError: 'continueErrorOutput', parameters: {} }],
      connections: {},
      settings: { errorWorkflow: 'synthetic-handler' }
    },
    expected: {
      free: { 'valid-structure': ['pass', 0], 'disabled-nodes': ['pass', 0], 'continue-on-fail': ['warn', 1], 'retry-policy': ['pass', 0], 'error-workflow': ['pass', 0] },
      extended: {}
    }
  },
  {
    label: 'HTTP request without retry or timeout',
    workflow: {
      active: true,
      nodes: [{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4, parameters: { url: 'https://synthetic.invalid', options: {} } }],
      connections: {},
      settings: { errorWorkflow: 'synthetic-handler' }
    },
    expected: {
      free: { 'valid-structure': ['pass', 0], 'disabled-nodes': ['pass', 0], 'continue-on-fail': ['pass', 0], 'retry-policy': ['warn', 1], 'error-workflow': ['pass', 0] },
      extended: { 'unbounded-http': ['warn', 1] }
    }
  },
  {
    label: 'HTTP request with retry and timeout',
    workflow: {
      active: true,
      nodes: [{ type: 'n8n-nodes-base.httpRequest', typeVersion: 4, retryOnFail: true, maxTries: 3, parameters: { url: 'https://synthetic.invalid', options: { timeout: 5000 } } }],
      connections: {},
      settings: { errorWorkflow: 'synthetic-handler' }
    },
    expected: {
      free: { 'valid-structure': ['pass', 0], 'disabled-nodes': ['pass', 0], 'continue-on-fail': ['pass', 0], 'retry-policy': ['pass', 0], 'error-workflow': ['pass', 0] },
      extended: { 'unbounded-http': ['pass', 0] }
    }
  },
  {
    label: 'partial retry coverage across two outbound operations',
    workflow: {
      active: true,
      nodes: [
        { type: 'n8n-nodes-base.emailSend', typeVersion: 2, retryOnFail: true, parameters: {} },
        { type: 'n8n-nodes-base.postgres', typeVersion: 2, parameters: {} }
      ],
      connections: {},
      settings: { errorWorkflow: 'synthetic-handler' }
    },
    expected: {
      free: { 'valid-structure': ['pass', 0], 'disabled-nodes': ['pass', 0], 'continue-on-fail': ['pass', 0], 'retry-policy': ['warn', 1], 'error-workflow': ['pass', 0] },
      extended: {}
    }
  },
  {
    label: 'trigger node excluded from outbound retry candidates',
    workflow: {
      active: true,
      nodes: [{ type: 'n8n-nodes-base.slackTrigger', typeVersion: 1, parameters: {} }],
      connections: {},
      settings: { errorWorkflow: 'synthetic-handler' }
    },
    expected: {
      free: { 'valid-structure': ['pass', 0], 'disabled-nodes': ['pass', 0], 'continue-on-fail': ['pass', 0], 'retry-policy': ['pass', 0], 'error-workflow': ['pass', 0] },
      extended: { 'webhook-auth': ['pass', 0] }
    }
  },
  {
    label: 'unauthenticated webhook with response node',
    workflow: {
      active: true,
      nodes: [
        { type: 'n8n-nodes-base.webhook', typeVersion: 2, parameters: { path: 'synthetic-b', authentication: 'none' } },
        { type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1, parameters: {} }
      ],
      connections: {},
      settings: { errorWorkflow: 'synthetic-handler' }
    },
    expected: {
      free: { 'valid-structure': ['pass', 0], 'disabled-nodes': ['pass', 0], 'continue-on-fail': ['pass', 0], 'retry-policy': ['pass', 0], 'error-workflow': ['pass', 0] },
      extended: { 'webhook-auth': ['fail', 1] }
    }
  },
  {
    label: 'literal secret distinguished from expression placeholder',
    workflow: {
      active: true,
      nodes: [
        { type: 'n8n-nodes-base.set', typeVersion: 3, parameters: { apiKey: 'literal-synthetic-secret' } },
        { type: 'n8n-nodes-base.set', typeVersion: 3, parameters: { apiKey: '={{ $env.SYNTHETIC_API_KEY }}' } }
      ],
      connections: {},
      settings: { errorWorkflow: 'synthetic-handler' }
    },
    expected: {
      free: { 'valid-structure': ['pass', 0], 'disabled-nodes': ['pass', 0], 'continue-on-fail': ['pass', 0], 'retry-policy': ['pass', 0], 'error-workflow': ['pass', 0] },
      extended: { 'hardcoded-secrets': ['fail', 1] }
    }
  }
];
