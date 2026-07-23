'use strict';

// Test/local-development adapter only. This file is deliberately outside
// docs/ and is never loaded by the public site. Production must replace it
// with a VPS endpoint that verifies Stripe signatures, retrieves the Checkout
// Session server-side, confirms payment_status=paid, and issues a short-lived
// opaque entitlement.
function createDemoEntitlementAdapter(records) {
  const entitlements = new Map(Object.entries(records || {}));
  return Object.freeze({
    async verify(token) {
      const record = entitlements.get(token);
      return record ? structuredClone(record) : null;
    }
  });
}

module.exports = { createDemoEntitlementAdapter };
