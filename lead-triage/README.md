# Demo: Lead Intake Triage

This is a proof asset for the Automation Rescue Sprint. It demonstrates a bounded, testable workflow without pretending to be client work.

Input: a JSON lead submitted to a webhook.  
Output: normalized fields, a deterministic qualification score, a route, and a human-readable reason.

The implementation intentionally avoids automatic outbound messaging. In a client build, approved destinations such as a CRM, Slack channel, or email draft would be connected using credentials stored in the client's automation environment.

`n8n-lead-triage.workflow.json` is a structurally prepared n8n proof workflow; this repository does not claim a successful import or execution in a full n8n runtime. `lead-triage.js` contains the same core logic in a locally testable form, and `lead-triage.test.js` covers priority routing, validation failure, and standard routing. `n8n-parity.test.js` extracts the Code node's `jsCode`, runs it in a controlled Function wrapper with an injected `$json`, and verifies that its outputs match `lead-triage.js` for the same three fixtures. The parity test checks the embedded JavaScript only; it does not emulate n8n or validate node versions, connections, webhook behavior, credentials, or import compatibility.

Run both local checks with:

```bash
node --test lead-triage.test.js n8n-parity.test.js
```

## Sample input

```json
{
  "name": "Avery Stone",
  "email": "avery@example.com",
  "company": "Northstar Studio",
  "teamSize": 12,
  "monthlyLeads": 180,
  "pain": "Form leads are copied into HubSpot manually and sometimes wait until the next day"
}
```

## Expected result

The sample is routed to `priority-review` because it contains contact details, meaningful volume, and a concrete workflow problem. Malformed inputs receive a useful validation response rather than silently entering the pipeline.
