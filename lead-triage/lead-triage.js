"use strict";

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLead(input) {
  const lead = {
    name: cleanText(input.name),
    email: cleanText(input.email).toLowerCase(),
    company: cleanText(input.company),
    teamSize: Number(input.teamSize) || 0,
    monthlyLeads: Number(input.monthlyLeads) || 0,
    pain: cleanText(input.pain),
  };

  const errors = [];
  if (!lead.name) errors.push("name is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    errors.push("a valid email is required");
  }

  return { lead, errors };
}

function scoreLead(lead) {
  let score = 0;
  const reasons = [];

  if (lead.company) {
    score += 15;
    reasons.push("company identified");
  }
  if (lead.teamSize >= 2 && lead.teamSize <= 30) {
    score += 20;
    reasons.push("team matches initial customer profile");
  }
  if (lead.monthlyLeads >= 50) {
    score += 25;
    reasons.push("lead volume makes response automation valuable");
  }
  if (/manual|copy|spreadsheet|delay|wait|miss|duplicate|fail|break/i.test(lead.pain)) {
    score += 30;
    reasons.push("concrete automation pain detected");
  }
  if (lead.pain.length >= 40) {
    score += 10;
    reasons.push("problem includes useful detail");
  }

  return {
    score,
    route: score >= 60 ? "priority-review" : "standard-review",
    reasons,
  };
}

function triageLead(input) {
  const { lead, errors } = normalizeLead(input || {});
  if (errors.length) {
    return { ok: false, route: "needs-correction", errors };
  }

  return { ok: true, lead, ...scoreLead(lead) };
}

if (require.main === module) {
  const input = JSON.parse(process.argv[2] || "{}");
  process.stdout.write(`${JSON.stringify(triageLead(input), null, 2)}\n`);
}

module.exports = { normalizeLead, scoreLead, triageLead };

