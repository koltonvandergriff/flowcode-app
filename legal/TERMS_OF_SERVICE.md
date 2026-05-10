# FlowADE Terms of Service

**Last updated:** 2026-05-10
**Effective date:** 2026-05-10
**Operator:** DutchMade Co. ("FlowADE", "we", "us"), a Texas limited liability company.

> **DRAFT — pending attorney review.** This is a working draft. Have a Texas-licensed attorney review and modify before public launch.

These Terms of Service ("Terms") govern your use of the FlowADE desktop application, related web services, mobile applications, APIs, and the Model Context Protocol server (collectively, the "Service"). By creating an account, installing, or using the Service, you agree to these Terms. If you don't agree, don't use the Service.

---

## 1. Eligibility and account

1.1 You must be at least 18 years old and able to form a binding contract.
1.2 You are responsible for the accuracy of registration information and for safeguarding your password and access tokens.
1.3 We may suspend or terminate accounts that violate these Terms, the Acceptable Use Policy, or applicable law.

## 2. What the Service is — and what it is not

2.1 **FlowADE is a developer workspace.** It hosts terminals, lets you organize tasks and memory, and provides chat interfaces to AI providers. It is a tool that runs on your computer and on cloud services we operate.

2.2 **FlowADE is not an AI provider.** AI features in FlowADE work in two ways:
   (a) **Bring-your-own-key.** You configure your own API keys for providers like Anthropic, OpenAI, or others. Your contractual relationship for that AI service is between you and the provider; their terms govern your use of their API.
   (b) **Hosted terminal.** You may run third-party command-line tools (e.g., Claude Code CLI, Aider) inside FlowADE's terminal panes. You are solely responsible for complying with the terms and licenses of any tool you choose to run. FlowADE does not authenticate to Anthropic, OpenAI, or any AI provider on your behalf.

2.3 **AI output is not advice.** Output from AI providers used in or alongside FlowADE may be incorrect, incomplete, biased, or harmful. You are responsible for reviewing and verifying any AI-generated content before relying on it, executing it, deploying it, or committing it to source control. Do not use AI output for safety-critical, medical, legal, financial, or other decisions without human review by a qualified professional.

## 3. Subscriptions, fees, and refunds

3.1 Some features require a paid subscription. Pricing tiers, included features, and usage limits are described at flowade.com/pricing and within the Service. We may change pricing with at least 30 days' notice; existing subscribers keep their then-current pricing until the next renewal.

3.2 Subscriptions auto-renew at the end of each billing period until cancelled. You can cancel at any time in Settings; cancellation takes effect at the end of the current billing period.

3.3 **Refunds.** Subscriptions are non-refundable except where required by law. If you believe you were charged in error, contact support within 14 days.

3.4 **Lifetime tier.** "Lifetime" access means access for the operational life of the FlowADE product. If we discontinue the product entirely, lifetime users will receive 90 days' notice and, where reasonably possible, a self-hosted release or refund prorated against the time they have used the Service. Lifetime is non-transferable.

3.5 **Trial.** Free trials, when offered, end automatically and convert to a paid subscription unless you cancel before the trial ends.

## 4. Your data and content

4.1 **Your content.** You retain all rights to content you create, store, or process through the Service, including memory entries, tasks, terminal session data, and any AI prompts and outputs ("Your Content").

4.2 **License to operate the Service.** You grant us a worldwide, non-exclusive, royalty-free license to host, store, transmit, display, process, and otherwise use Your Content solely as necessary to provide and improve the Service for you, including:
   - storing and syncing memory entries and workspaces;
   - generating vector embeddings via the providers configured in the Service for semantic search;
   - generating category hierarchies via the providers configured in the Service;
   - operating telemetry, abuse-prevention, and security monitoring.

4.3 **No training on Your Content.** We do not use Your Content to train our own AI models, and we will not sell Your Content. Third-party providers you choose to use (Anthropic, OpenAI, etc.) have their own data-handling terms; review them before configuring API keys.

4.4 **Embeddings and categorization.** When you enable memory features, FlowADE sends the text of your memory entries to your configured embeddings provider and AI categorization provider. Do not store API keys, personal credentials, private regulated data (PHI, payment-card data, etc.), or any other secret content in memory entries. FlowADE includes automated scrubbers for common secret patterns, but those scrubbers are best-effort and may not catch every case. You assume the risk of content you choose to store.

4.5 **Retention and deletion.** You can delete your account and Your Content at any time from Settings. Soft-deleted records may remain in backups for up to 30 days for recovery purposes, after which they are purged.

## 5. Privacy

Use of the Service is also governed by the [Privacy Policy](PRIVACY_POLICY.md), which describes what data we collect, why, where it is stored, and your rights.

## 6. Acceptable use

Use of the Service is governed by the [Acceptable Use Policy](ACCEPTABLE_USE_POLICY.md), incorporated by reference. Violations may result in suspension or termination.

## 7. Third-party services

7.1 FlowADE integrates with third-party services including Anthropic, OpenAI, Supabase, Stripe, GitHub, Expo (mobile push), and others ("Third-Party Services"). Your use of Third-Party Services is governed by their respective terms and privacy policies. We are not responsible for Third-Party Services.

7.2 If a Third-Party Service becomes unavailable, the corresponding features in FlowADE may stop working. We will use commercially reasonable efforts to communicate disruptions but make no guarantee of continuous availability.

7.3 **Anthropic compliance.** FlowADE does not facilitate, encourage, or enable use of Anthropic subscription OAuth tokens in any third-party harness. The Claude API integration uses user-supplied API keys, which are billed separately by Anthropic. If you choose to run the official Claude Code CLI inside FlowADE's terminal panes, that is your direct use of Anthropic's official product.

## 8. Intellectual property

8.1 The Service, including its software, design, content, and trademarks, is owned by DutchMade Co. and protected by intellectual property laws.

8.2 We grant you a limited, non-exclusive, non-transferable, revocable license to use the Service in accordance with these Terms.

8.3 The license does not grant you rights to copy, modify, distribute, decompile, reverse engineer, or create derivative works of the Service, nor to use the Service to develop a competing product. Such activity is a material breach of these Terms and may result in immediate termination and legal action.

8.4 **Feedback.** If you submit suggestions or feedback, you grant us a perpetual, irrevocable, royalty-free license to use that feedback without obligation to you.

## 9. AI-generated output — risks and responsibilities

9.1 AI output may be inaccurate, contain bugs, include security vulnerabilities, reproduce copyrighted material, or otherwise be unfit for your purpose.

9.2 You agree:
   (a) to review and test AI output before executing or relying on it;
   (b) to never run AI-generated commands or code in production systems without independent human review;
   (c) that FlowADE has no liability for damages arising from AI output you choose to act upon; and
   (d) that "Dangerous Mode" / "lean mode" / agent-auto-approve features increase the risk of unintended actions, and you bear sole responsibility for enabling them.

## 10. Disclaimers

10.1 THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, OR THAT THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE.

10.2 We do not warrant that the Service is secure or free of viruses or other harmful components. You are responsible for protecting your local environment and your own credentials.

## 11. Limitation of liability

11.1 To the maximum extent permitted by law, in no event will we be liable to you for any indirect, incidental, consequential, special, exemplary, or punitive damages, including loss of profits, data, business, or goodwill, even if advised of the possibility.

11.2 Our aggregate liability for any claim arising out of or relating to these Terms or the Service will not exceed the greater of (a) the fees you paid to us in the 12 months preceding the claim or (b) USD $100.

11.3 Some jurisdictions do not allow exclusion of certain warranties or limitations of liability, so the above may not fully apply to you.

## 12. Indemnification

12.1 You will defend, indemnify, and hold harmless DutchMade Co., its officers, directors, employees, and agents from any claim, demand, loss, or expense (including reasonable attorneys' fees) arising out of: (a) your use of the Service; (b) Your Content; (c) your violation of these Terms or applicable law; (d) any third-party tool, CLI, or API key you choose to use within the Service; or (e) any infringement by you of any third-party rights.

12.2 We may, at our option, control the defense of any claim subject to your indemnification, and you will cooperate as reasonably requested.

## 13. Termination

13.1 You may stop using the Service at any time and delete your account in Settings.

13.2 We may suspend or terminate your access at any time for breach of these Terms, the Acceptable Use Policy, or applicable law, or for conduct that we reasonably believe is harmful to us, other users, or third parties.

13.3 Sections 4, 8, 9, 10, 11, 12, 14, 15, and 16 survive termination.

## 14. Governing law and dispute resolution

14.1 These Terms are governed by the laws of the State of Texas, without regard to conflict-of-laws principles. The exclusive venue for any dispute not subject to arbitration is the state and federal courts in Tarrant County, Texas.

14.2 **Binding arbitration.** Except for claims for injunctive relief and small-claims matters, any dispute will be resolved by binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules, in Tarrant County, Texas. The arbitration will be conducted by a single arbitrator. Judgment may be entered on the award in any court of competent jurisdiction.

14.3 **Class-action waiver.** You and we agree that any dispute will be resolved on an individual basis only, and not as part of a class, consolidated, or representative action.

14.4 **Opt-out.** You may opt out of arbitration by sending written notice to legal@flowade.com within 30 days of first accepting these Terms.

## 15. Changes to these Terms

We may update these Terms from time to time. Material changes will be communicated by email or in-app notice at least 30 days before they take effect. Continued use after the effective date constitutes acceptance.

## 16. General

16.1 **Entire agreement.** These Terms, together with the Privacy Policy, Acceptable Use Policy, and any order forms or product-specific terms, are the entire agreement between you and us regarding the Service.

16.2 **Assignment.** You may not assign these Terms without our written consent. We may assign to an affiliate or in connection with a merger, acquisition, or sale of assets.

16.3 **Severability.** If any provision is held unenforceable, the rest remains in effect.

16.4 **No waiver.** Our failure to enforce any provision is not a waiver of our right to do so later.

16.5 **Force majeure.** Neither party is liable for failure to perform due to events beyond reasonable control (acts of war, natural disaster, government action, internet outages, etc.).

16.6 **Contact.** legal@flowade.com (replace with real address before launch).

---

> **Reminder:** These Terms are a working draft. Have a Texas-licensed SaaS attorney review before going live. Specific clauses likely to need attention: arbitration enforceability post-2026 case law, AI-output liability waiver under emerging AI-liability statutes, and consumer-protection compliance if you have users in California, New York, or the EU.
