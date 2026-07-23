# Sanitized live implementation evidence

Verified 2026-07-22 against a Workflow Repair Desk-owned Ubuntu 24.04 VPS. This is an internal implementation, not a client deployment or testimonial. Hostnames, addresses, account identifiers, secrets, log contents, and private topology are intentionally omitted.

## Verified operating state

- OpenClaw `2026.7.1-2` runs as a dedicated non-root user under an enabled systemd user service.
- The Gateway is active and listens only on `127.0.0.1:18789` and `[::1]:18789`.
- Remote administration and Gateway access use the private Tailscale interface; UFW is active and permits inbound traffic on that interface rather than opening the Gateway port publicly.
- SSH password authentication is disabled through Ubuntu SSH drop-in configuration.
- An independent system watchdog checks the Gateway every five minutes and has passed a forced-stop recovery test.
- A Gmail Pub/Sub watcher runs as a restart-enabled user service. A synthetic Pub/Sub delivery test passed after hook routing was narrowed.
- Hook callers are restricted to the `main` agent and a fixed `hook:gmail:inbox` session. Request-selected session keys are disabled.
- The deep OpenClaw security audit reports **0 critical findings**. Two warnings remain documented: an unpinned plugin install record and a deep probe token missing `operator.read`; neither is treated as proof of broad external exposure.
- Daily and weekly backup jobs are enabled, with recovery behavior documented separately.

## Verification method

The evidence was collected from allowlisted status commands rather than screenshots or raw logs:

1. `systemctl --user is-active/is-enabled` for the Gateway and Gmail watcher;
2. `systemctl is-active` for the watchdog timer;
3. `ss -ltnp` for the Gateway listener boundary;
4. `ufw status` and SSH configuration drop-ins for network/authentication posture;
5. `openclaw security audit --deep` after hook hardening;
6. a synthetic Gmail Pub/Sub event followed by service/journal verification;
7. a forced Gateway stop followed by watchdog recovery verification.

## Honest boundary

This evidence proves the stated checks on one owned host at the verification time. It does not prove every future update, client environment, cloud firewall, DNS path, application workload, or incident-response outcome. A paid deployment would repeat the checks on the buyer's throwaway host and hand back redacted evidence, a concise runbook, rollback notes, and a screen recording when authorized.
