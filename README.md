# Workflow Reliability Proof Pack

Public, reproducible demonstration assets from **Workflow Repair Desk**.

Status: self-directed technical proof. These files are not represented as client work, production deployments, testimonials, or evidence of financial results.

## What this demonstrates

- deterministic input normalization, validation, scoring, and routing;
- failure states that are visible rather than silent;
- matching executable tests with safe synthetic data;
- acceptance-test-first infrastructure planning;
- explicit security, rollback, secrets, and human-approval boundaries;
- handoff documentation designed for another operator to use.

## Contents

- [`CAPABILITY.md`](CAPABILITY.md) — concise scope, evidence, delivery method, and commercial starting point

### `lead-triage/`

A small lead-intake routing example with an n8n workflow JSON, companion Node implementation, and automated tests. The repository tests the Node implementation and parity-checks the JavaScript embedded in the workflow JSON. It does not claim a live CRM integration or production deployment.

Run:

```bash
npm test
```

### `openclaw-vps/`

A sanitized, verification-first design for hardening one Ubuntu 24.04 OpenClaw host. It includes a staged runbook, systemd override, read-only evidence collector, acceptance checklist, and Telegram-photo-to-job-record design.

This package has not yet been executed on a client VPS. It describes the proposed implementation and the evidence required before calling a paid trial complete.

## Delivery standard

For a paid engagement, the acceptance test is agreed before implementation. Credentials remain client-controlled where possible, consequential production actions stay approval-gated, and handoff includes evidence, known gaps, recovery steps, and reproducible artifacts.

## Contact

Workflow Repair Desk  
`workflowrepairdesk@gmail.com`
