"use strict";

const assert = require("node:assert/strict");
const { triageLead } = require("./lead-triage");

const priority = triageLead({
  name: "Avery Stone",
  email: "AVERY@example.com",
  company: "Northstar Studio",
  teamSize: 12,
  monthlyLeads: 180,
  pain: "Form leads are copied into HubSpot manually and sometimes wait until the next day",
});

assert.equal(priority.ok, true);
assert.equal(priority.lead.email, "avery@example.com");
assert.equal(priority.route, "priority-review");
assert.equal(priority.score, 100);

const malformed = triageLead({ name: "No Email" });
assert.equal(malformed.ok, false);
assert.equal(malformed.route, "needs-correction");
assert.deepEqual(malformed.errors, ["a valid email is required"]);

const normal = triageLead({
  name: "Taylor",
  email: "taylor@example.com",
  company: "Solo Shop",
  teamSize: 1,
  monthlyLeads: 8,
  pain: "Curious about automation",
});
assert.equal(normal.ok, true);
assert.equal(normal.route, "standard-review");

console.log("lead-triage tests passed");

