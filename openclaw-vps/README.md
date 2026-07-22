# OpenClaw VPS Reliability Proof

Status: sanitized implementation proof; not represented as a client deployment.

This package shows how Workflow Repair Desk would turn a fresh Ubuntu 24.04 VPS into a repeatable OpenClaw host without locking out the operator or exposing the Gateway publicly.

## Design choices

- OpenClaw runs as a dedicated non-root user.
- The supported OpenClaw installer creates a user-level systemd service; a small override adds explicit restart and startup behavior.
- The Gateway remains bound to loopback. Remote access uses an SSH tunnel or Tailscale Serve rather than opening the Gateway port publicly.
- SSH and firewall changes occur only after a second verified administrative session exists.
- Secrets live in root/user-readable environment or OpenClaw credential stores with restrictive permissions; they never appear in unit files, command-line arguments, or shell history.
- Verification is evidence-driven: listeners, firewall state, SSH configuration, service status, OpenClaw audit/doctor output, and backup restoration notes.

## Contents

- `RUNBOOK.md` — staged installation, hardening, verification, and rollback plan
- `verify-host.sh` — read-only evidence collector that deliberately avoids printing secret values
- `openclaw-gateway-override.conf` — minimal systemd user-service override
- `TELEGRAM_PHOTO_DESIGN.md` — answer to the buyer's photo-to-job-record design question

## Acceptance test

The trial passes when:

1. key-only SSH works in a fresh second session;
2. only intended ports are externally reachable;
3. the OpenClaw Gateway starts after reboot under the dedicated user;
4. the Gateway listens only on loopback;
5. `openclaw doctor` and the deep security audit have no unexplained critical finding;
6. service recovery, logs, backup creation, and restore steps are documented;
7. no secret is present in unit files, shell history, or collected evidence.

## Source basis

The approach follows the installed OpenClaw documentation for Linux servers, Linux systemd services, and VPS deployment. Host firewall, SSH, updates, CrowdSec, and Netdata remain operating-system responsibilities rather than OpenClaw features.

