# FlowADE legal documents

> **All of these documents are working drafts pending Texas-licensed-attorney review before public launch.** They are modeled on common SaaS templates and tied to FlowADE's actual product surface. Do NOT publish them or rely on them without a redline from an attorney familiar with Texas SaaS, AI-output liability, and consumer-privacy law.

| Document | Purpose | Surfaced in app |
| -------- | ------- | --------------- |
| [LICENSE](../LICENSE) | Proprietary license — no rights granted except via TOS. Lives at repo root by convention. | Bundled with installer + in About dialog. |
| [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md) | The master contract. Limits liability, requires arbitration, indemnity from user, AI-output disclaimer. | Click-wrap consent in onboarding; linked in Settings → Legal. |
| [PRIVACY_POLICY.md](PRIVACY_POLICY.md) | What data we collect, where it lives, who we share with, your rights. | Click-wrap consent in onboarding; linked in Settings → Legal. |
| [ACCEPTABLE_USE_POLICY.md](ACCEPTABLE_USE_POLICY.md) | What you may and may not do with the Service. References Anthropic's third-party-harness restriction. | Linked from TOS and Settings → Legal. |
| [AI_OUTPUT_DISCLAIMER.md](AI_OUTPUT_DISCLAIMER.md) | Standalone explanation of AI-output risk. Same content also covered in TOS §9, but kept separate so it can be linked from inside the app at relevant moments. | Linked from onboarding "Dangerous Mode" toggle and Settings → Legal. |
| [COOKIE_POLICY.md](COOKIE_POLICY.md) | Lists local-storage keys and OS keychain usage. | Linked from Privacy Policy and Settings → Legal. |
| [DMCA_POLICY.md](DMCA_POLICY.md) | DMCA takedown procedure. Requires Agent registration with U.S. Copyright Office ($6). | Linked from footer of marketing site and from Settings → Legal. |

## Where these documents live

- **In the repo:** `legal/` folder (this directory). Tracked in git so versions are auditable.
- **In the app:** linked from Settings → Legal; key passages mirrored as click-wrap consent during onboarding.
- **On the marketing site:** mirrored at flowade.com/terms, /privacy, /aup, /dmca.

## Versioning

- Filename stays stable; commit history is the version log.
- Update "Last updated" + "Effective date" headers when you publish a material change.
- For material changes, email all active users 30 days before the effective date and post an in-app banner.

## Pre-launch checklist

- [ ] Replace placeholder email addresses (`legal@`, `privacy@`, `abuse@`, `dmca@`) with real, monitored addresses.
- [ ] Replace placeholder mailing addresses with the registered agent's address.
- [ ] Confirm Texas LLC formation and update operator entity name.
- [ ] Register DMCA Agent with U.S. Copyright Office.
- [ ] Texas-licensed attorney redline of all six documents.
- [ ] Add click-wrap consent UI to onboarding (records timestamp + version hash).
- [ ] Stand up flowade.com/terms etc. mirrors.
- [ ] If serving EU/UK users, add SCC + DPA references.
- [ ] If serving California users at scale, add CCPA "Do Not Sell" / "Limit" toggles in Settings even though we don't sell — required to display "We Do Not Sell" disclosure.
- [ ] Confirm Stripe billing terms reference the TOS.
- [ ] Trademark filing for "FlowADE" with USPTO.
