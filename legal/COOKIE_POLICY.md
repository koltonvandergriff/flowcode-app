# FlowADE Cookie & Local Storage Policy

**Last updated:** 2026-05-10

> **DRAFT — pending attorney review.**

FlowADE is primarily a desktop application; we use the operating system's local storage and your OS keychain, not browser cookies, for the bulk of state. This policy documents what we store on your device and why.

## 1. What we store locally

### 1.1 In the OS keychain
- API keys for the AI providers you configure (Anthropic, OpenAI, GitHub PAT, etc.).
- These are managed by your operating system's secure credential store: Windows Credential Manager, macOS Keychain, or libsecret on Linux.
- We never transmit these values to our servers.

### 1.2 In application data directory
- Your settings, workspaces, terminal sessions, and local cache.
- Application logs (rotating, capped in size).
- Telemetry queue (pseudonymous; sent to our analytics endpoint when online and telemetry is enabled).

### 1.3 In `localStorage` (renderer process)
We store small UI-preference flags in the renderer's `localStorage`, including:

| Key                                  | Purpose                                                     |
| ------------------------------------ | ----------------------------------------------------------- |
| `flowade_auth_token` / `_user`       | Auth session cache for offline relaunch                     |
| `flowade.glass.page`                 | Last-selected page in the workspace                         |
| `flowade.glass.browser*`             | (legacy — no longer used)                                   |
| `flowade.glass.lastPreviewUrl`       | Last dev-server URL detected from a terminal                |
| `flowade.notify.terminalDone`        | Whether prompt-done banners are enabled                     |
| `flowade.mem.autoCategorize`         | Auto-categorize on memory create                            |
| `flowade.mem.autoEmbed`              | Auto-embed on memory create                                 |
| `flowade.mem.syncMobile`             | Mobile sync toggle                                          |
| `flowade.overview.seen`              | First-run flag for the Overview welcome screen              |
| `flowade_layout`                     | Saved pane layout per workspace                             |
| `flowade_notifications`              | Most-recent mobile push events for the Settings log         |
| `flowade_subscription`               | Subscription tier cache (subject to server verification)    |
| `flowade_onboarding_complete`        | First-run completion flag                                   |
| `flowade_plan_selected`              | Pricing-step completion flag                                |

These keys contain no AI-provider secrets and no personal content (no memory text, no terminal output).

## 2. Cookies (web touchpoints)

If we operate the `flowade.com` marketing site, we may use cookies for:
- Session management (`first_party` essential cookies).
- Analytics (e.g., Plausible — privacy-preserving, no PII).
- Stripe checkout (third-party).

We do **not** use advertising cookies, behavioral retargeting cookies, or cross-site tracking.

## 3. Your controls

- **Clear local data:** Sign out and uninstall removes most local state. To fully clear, remove the FlowADE application-data directory in your OS user folder.
- **Clear keychain entries:** open your OS keychain (Windows Credential Manager / macOS Keychain Access / GNOME Seahorse) and remove entries under the `flowade` service.
- **Disable telemetry:** Settings → Notifications → Diagnostics.

## 4. Changes

Material changes will be communicated by email or in-app notice.
