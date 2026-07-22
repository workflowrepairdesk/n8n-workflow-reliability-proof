# Hardened OpenClaw Host Runbook

Target: fresh Hetzner VPS, Ubuntu 24.04. This document is a staged plan. Commands that change SSH, firewall, packages, or services are executed only after the client confirms the administrative access path and approves the stage.

## 0. Record context before changing anything

Confirm:

- throwaway host and public IP;
- current login path and sudo access;
- SSH public key fingerprint;
- desired remote Gateway path: SSH tunnel or Tailscale Serve;
- backup/restore expectation;
- monitoring destination and alert receiver;
- whether public SSH must remain on port 22.

Collect read-only baseline evidence:

```bash
cat /etc/os-release
id
ss -ltnup || ss -ltnp
sudo ufw status verbose
sudo sshd -T | grep -E '^(passwordauthentication|pubkeyauthentication|permitrootlogin|maxauthtries) '
lsblk -f
systemctl status ssh --no-pager
```

## 1. Patch and create the runtime identity

```bash
sudo apt update
sudo apt full-upgrade
sudo adduser --disabled-password --gecos '' openclaw
sudo loginctl enable-linger openclaw
sudo install -d -o openclaw -g openclaw -m 0700 /home/openclaw/.openclaw
```

Do not grant ongoing unrestricted sudo unless the agreed operating model requires it. Bootstrap changes are performed from the administrative account; OpenClaw itself runs as `openclaw`.

## 2. Prove key-based access before tightening SSH

Install the approved public key into the administrative account and, if required, the `openclaw` account. Open a second terminal and prove a new key-authenticated session works. Keep the original session open through firewall and SSH validation.

Create a drop-in rather than rewriting the vendor file:

```text
# /etc/ssh/sshd_config.d/60-openclaw-hardening.conf
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
MaxAuthTries 4
```

Validate before reload:

```bash
sudo sshd -t
sudo systemctl reload ssh
```

Rollback: from the still-open original session, remove the drop-in, run `sshd -t`, and reload SSH.

## 3. Firewall and host protection

Allow SSH before enabling UFW:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH administration'
sudo ufw enable
sudo ufw status verbose
```

The OpenClaw Gateway port is not opened. Install and configure fail2ban for SSH. CrowdSec and Netdata are added only from their documented repositories after repository keys and package sources are reviewed. Netdata must not expose an unauthenticated public dashboard; bind locally or place behind the agreed private access path.

Using both fail2ban and CrowdSec can duplicate SSH decisions. During the trial, assign ownership clearly: fail2ban covers local SSH brute-force response; CrowdSec adds broader detection only if its value exceeds the extra operational surface.

## 4. Install a pinned OpenClaw runtime

Install a supported Node release and a specific agreed OpenClaw version. Record exact versions and package source. Keep npm's global prefix inside the dedicated user's home rather than writing OpenClaw into a root-owned system prefix. Run onboarding as the dedicated user so state lives under `/home/openclaw/.openclaw`:

```bash
sudo -iu openclaw
node --version
npm --version
mkdir -p "$HOME/.npm-global/bin"
npm config set prefix "$HOME/.npm-global"
export NPM_CONFIG_PREFIX="$HOME/.npm-global"
export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"
npm install --global "openclaw@<PINNED_VERSION>"
command -v openclaw
openclaw --version
openclaw onboard --install-daemon
```

Persist the user-local npm `bin` path in the runtime user's login environment before future interactive maintenance. The current OpenClaw Linux service installer recognizes common user bin directories and npm-prefix environment settings, but do not assume that detection succeeded: inspect the generated unit and confirm its `ExecStart` binary exists before enabling it.

The supported installer creates a systemd user unit. Add the supplied override with `systemctl --user edit openclaw-gateway.service`, then:

```bash
systemctl --user daemon-reload
systemctl --user enable --now openclaw-gateway.service
systemctl --user cat openclaw-gateway.service
systemctl --user show openclaw-gateway.service -p ExecStart -p Environment
```

## 5. Gateway exposure and secrets

Keep `gateway.bind` at `loopback`. Reach the Control UI with either:

```bash
ssh -N -L 18789:127.0.0.1:18789 admin@HOST
```

or an approved Tailscale Serve configuration. Do not put provider keys or Gateway tokens in unit files, command arguments, or shell history. Credential files and environment files must be owned by the runtime user and mode `0600`; directories containing them should be `0700`.

## 6. Verification

Run `verify-host.sh`, then independently check from another machine that only intended public ports answer. Reboot the VPS and repeat service, listener, firewall, and SSH checks. Exercise one controlled Gateway restart and confirm useful logs exist without secret leakage.

Create a portable OpenClaw backup and document where the encrypted copy is stored:

```bash
openclaw backup create
```

The handoff includes exact versions, firewall/SSH posture, access method, monitoring URLs and owners, backup/restore procedure, update/rollback procedure, and known gaps.
