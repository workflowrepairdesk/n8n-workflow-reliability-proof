#!/usr/bin/env bash
set -u

# Read-only evidence collector for an Ubuntu 24.04 OpenClaw host.
# It prints configuration posture, never secret values.

section() { printf '\n## %s\n' "$1"; }

section "Host"
cat /etc/os-release 2>/dev/null || true
uname -a
uptime

section "Identity"
id
getent passwd openclaw 2>/dev/null || true

section "Network listeners"
ss -ltnup 2>/dev/null || ss -ltnp 2>/dev/null || true

section "Firewall"
sudo -n ufw status verbose 2>/dev/null || ufw status verbose 2>/dev/null || true

section "SSH effective posture"
if command -v sshd >/dev/null 2>&1; then
  sudo -n sshd -T 2>/dev/null | grep -E '^(passwordauthentication|pubkeyauthentication|permitrootlogin|maxauthtries|allowusers|allowgroups) ' || true
fi

section "Protection and updates"
systemctl is-enabled fail2ban 2>/dev/null || true
systemctl is-active fail2ban 2>/dev/null || true
systemctl is-enabled crowdsec 2>/dev/null || true
systemctl is-active crowdsec 2>/dev/null || true
systemctl is-enabled unattended-upgrades 2>/dev/null || true
systemctl is-active unattended-upgrades 2>/dev/null || true

section "OpenClaw runtime"
if command -v openclaw >/dev/null 2>&1; then
  openclaw --version 2>&1 || true
  openclaw status 2>&1 || true
  openclaw doctor --non-interactive 2>&1 || true
  openclaw security audit --deep 2>&1 || true
fi

section "Gateway service"
systemctl --user is-enabled openclaw-gateway.service 2>/dev/null || true
systemctl --user is-active openclaw-gateway.service 2>/dev/null || true
systemctl --user status openclaw-gateway.service --no-pager 2>/dev/null || true

section "Secret-file permissions without contents"
find "$HOME/.openclaw" -maxdepth 3 -type f \
  \( -name '*.env' -o -name 'auth-profiles.json' -o -name 'openclaw.json' \) \
  -printf '%m %u:%g %p\n' 2>/dev/null || true

section "Recent service logs"
journalctl --user -u openclaw-gateway.service -n 50 --no-pager 2>/dev/null || true
