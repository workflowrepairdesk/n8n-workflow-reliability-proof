# Workflow Reliability Proof Pack

[![Node tests](https://github.com/workflowrepairdesk/n8n-workflow-reliability-proof/actions/workflows/test.yml/badge.svg)](https://github.com/workflowrepairdesk/n8n-workflow-reliability-proof/actions/workflows/test.yml)

**Outcome demonstrated:** a lead-intake workflow that validates, normalizes, scores, and routes webhook submissions while making rejected inputs visible.

> **Evidence boundary:** this is a self-directed technical demonstration using synthetic data. It is not represented as client work, a production deployment, a testimonial, or evidence of financial results.

[View the buyer-facing offer](https://workflowrepairdesk.github.io/n8n-workflow-reliability-proof/) · [Inspect the n8n workflow JSON](lead-triage/n8n-lead-triage.workflow.json) · [Read the acceptance tests](lead-triage/lead-triage.test.js)

## Verify it in 60 seconds

Considering a repair but not ready to authorize implementation? Review the [USD 125 Automation Failure Diagnostic](https://workflowrepairdesk.github.io/n8n-workflow-reliability-proof/diagnostic.html) and its prominently labeled, self-directed synthetic sample. The diagnostic fee is credited in full toward an agreed USD 250+ repair on the same path.

Prerequisite: Node.js 20 or newer. There are no package dependencies or credentials to install.

```bash
git clone https://github.com/workflowrepairdesk/n8n-workflow-reliability-proof.git
cd n8n-workflow-reliability-proof
npm test
```

Expected result: all 13 current test entries pass. The suite includes one behavioral entry covering three routing scenarios, three parity entries proving that the JavaScript embedded in the n8n Code node produces the same outputs as the companion Node implementation, five browser-local preflight checks, and four buyer-page/privacy evidence checks. The total may grow as regression cases are added; the CI badge is the authoritative current result.

| Inspectable evidence | What it proves | What it does not claim |
| --- | --- | --- |
| [Lead-triage workflow](lead-triage/n8n-lead-triage.workflow.json) | The workflow structure and embedded routing logic are available for review. | Live CRM connectivity or production execution. |
| [Behavior tests](lead-triage/lead-triage.test.js) | Priority routing, standard routing, normalization, and visible validation failure. | Performance at production traffic volumes. |
| [n8n parity tests](lead-triage/n8n-parity.test.js) | The workflow's Code-node logic matches the locally testable implementation on the same fixtures. | Full emulation of an n8n runtime. |
| [OpenClaw VPS package](openclaw-vps/README.md) | Acceptance-test-first planning, security boundaries, rollback, and handoff discipline. | A completed client deployment. |
| [Passing CI](https://github.com/workflowrepairdesk/n8n-workflow-reliability-proof/actions/workflows/test.yml) | The published test suite is run independently on every push and pull request. | Results outside this repository's test scope. |

## Failure behavior shown

- Email addresses are trimmed, normalized, and validated before routing.
- Malformed submissions return `needs-correction` with a human-readable error rather than entering the pipeline silently.
- Qualified and standard submissions take deterministic, test-covered routes.
- The proof stops before outbound messaging or production writes; consequential integrations would use client-controlled credentials and agreed approval boundaries.

## How a paid pilot works

1. Agree on one business outcome and a written acceptance test.
2. Confirm access boundaries, dependencies, failure behavior, and rollback.
3. Build or repair the smallest reliable workflow that meets the test.
4. Deliver test evidence, exportable artifacts, known gaps, and handoff notes.

A bounded pilot starts at **USD 250** after scope and acceptance criteria are agreed. If the agreed acceptance test cannot be met within the fixed scope, there is no charge.

**Have one unreliable n8n or API workflow?** Email Cameron at [workflowrepairdesk@gmail.com](mailto:workflowrepairdesk@gmail.com?subject=Automation%20Rescue%20scope) with the trigger, the expected outcome, and what currently goes wrong.

## Additional detail

- [`CAPABILITY.md`](CAPABILITY.md) — scope, delivery method, and commercial starting point
- [`lead-triage/README.md`](lead-triage/README.md) — implementation details and limitations
- [`openclaw-vps/RUNBOOK.md`](openclaw-vps/RUNBOOK.md) — staged hardening and verification design

Licensed under the [MIT License](LICENSE).
