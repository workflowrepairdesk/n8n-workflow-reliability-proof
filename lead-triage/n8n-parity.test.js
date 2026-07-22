"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { triageLead } = require("./lead-triage");

const workflowPath = path.join(__dirname, "n8n-lead-triage.workflow.json");
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
const codeNodes = workflow.nodes.filter(
  (node) => node.type === "n8n-nodes-base.code" && node.name === "Validate and Triage",
);

assert.equal(codeNodes.length, 1, "expected exactly one Validate and Triage Code node");
assert.equal(typeof codeNodes[0].parameters.jsCode, "string");

// The workflow is a local, reviewed proof artifact. This wrapper supplies the
// single n8n input global used by its Code node; it does not emulate n8n itself.
const runCodeNode = new Function("$json", codeNodes[0].parameters.jsCode);

const fixtures = [
  {
    name: "priority routing",
    input: {
      name: "Avery Stone",
      email: "AVERY@example.com",
      company: "Northstar Studio",
      teamSize: 12,
      monthlyLeads: 180,
      pain: "Form leads are copied into HubSpot manually and sometimes wait until the next day",
    },
  },
  {
    name: "invalid email rejection",
    input: { name: "No Email" },
  },
  {
    name: "standard routing",
    input: {
      name: "Taylor",
      email: "taylor@example.com",
      company: "Solo Shop",
      teamSize: 1,
      monthlyLeads: 8,
      pain: "Curious about automation",
    },
  },
];

for (const fixture of fixtures) {
  test(`n8n Code node matches companion implementation: ${fixture.name}`, () => {
    const codeNodeItems = runCodeNode({ body: fixture.input });
    assert.equal(Array.isArray(codeNodeItems), true);
    assert.equal(codeNodeItems.length, 1);
    assert.deepEqual(codeNodeItems[0].json, triageLead(fixture.input));
  });
}
