# Resend Default Email Provider

**Date:** 2026-04-11  
**Status:** Approved

---

## Overview

Make Resend the default outbound email provider across the backend configuration surface. The system already has a working Resend transport; this change aligns runtime defaults, setup examples, and debug output so the default behavior matches the intended provider.

---

## Goals

- Default to `resend` when `EMAIL_PROVIDER` is unset.
- Keep explicit provider selection working for `sendgrid`, `sendgrid-smtp`, and `smtp`.
- Update setup guidance so new environments start from Resend-first configuration.
- Expose Resend status clearly in the email debug endpoint.

---

## Non-Goals

- No new email provider features such as batch sending, webhooks, or templating changes.
- No automatic provider detection based on which API keys exist.
- No changes to SMTP fallback behavior beyond documentation and default-selection wording.

---

## Current State

- [`backend/src/config/env.ts`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/src/config/env.ts) falls back to `sendgrid` when `EMAIL_PROVIDER` is missing.
- [`backend/src/utils/email.ts`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/src/utils/email.ts) also falls back to `sendgrid` before dispatching to the provider-specific senders.
- [`backend/.env.example`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/.env.example) is SMTP-first and only mentions SendGrid explicitly.
- [`README.md`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/README.md) documents provider-specific settings at a high level but does not state Resend as the default.
- [`backend/src/app.ts`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/src/app.ts) has `/api/debug/email-config`, but it only understands `sendgrid`, `sendgrid-smtp`, and `smtp`.

---

## Proposed Approach

Use an explicit Resend-first default everywhere that currently assumes SendGrid.

### Runtime Defaults

- Change the default `EMAIL_PROVIDER` fallback from `sendgrid` to `resend` in:
  - [`backend/src/config/env.ts`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/src/config/env.ts)
  - [`backend/src/utils/email.ts`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/src/utils/email.ts)
- Keep explicit values unchanged:
  - `resend` routes to the existing Resend sender
  - `sendgrid` routes to the existing SendGrid API sender
  - `sendgrid-smtp` and `smtp` continue to use Nodemailer/SMTP

### Debug Endpoint

- Extend `/api/debug/email-config` in [`backend/src/app.ts`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/src/app.ts) to:
  - report whether Resend is configured
  - show a masked Resend API key preview similar to other providers
  - return a `configured` or `not_configured` status when `currentProvider === 'resend'`
  - include `resend` in the invalid-provider message
- Keep existing SendGrid and SMTP reporting intact.

### Developer Setup Docs

- Update [`backend/.env.example`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/.env.example) so Resend is the primary example:
  - `EMAIL_PROVIDER=resend`
  - `RESEND_API_KEY=""`
  - `EMAIL_FROM`, `EMAIL_FROM_NAME`, and `EMAIL_REPLY_TO` shown as required sender settings
- Retain SendGrid and SMTP examples as alternate options rather than primary defaults.
- Update [`README.md`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/README.md) to describe Resend as the default provider and note the main required environment variables.

### Local Environment

- Update the local ignored file [`backend/.env`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/.env) in the working copy to `EMAIL_PROVIDER=resend`.
- This is an operator convenience change for the current environment, not a committed source-of-truth change.

---

## Alternatives Considered

### 1. Change Only `backend/.env`

Fastest option, but it leaves runtime fallback behavior, docs, and debug output inconsistent with the intended default.

### 2. Auto-Select Provider by Available Keys

This would reduce env setup friction, but it hides system behavior, increases ambiguity, and makes the debug endpoint harder to reason about.

### 3. Resend-First Default Everywhere

Recommended. It keeps behavior explicit, changes very little code, and makes runtime behavior match the documented setup path.

---

## Data Flow

1. Process environment loads in [`backend/src/config/env.ts`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/src/config/env.ts).
2. If `EMAIL_PROVIDER` is absent, the backend now resolves it to `resend`.
3. [`backend/src/utils/email.ts`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/src/utils/email.ts) dispatches `sendEmail()` through `sendEmailWithResend()`.
4. If `EMAIL_PROVIDER` is explicitly set to another supported value, the existing provider routing still applies.
5. `/api/debug/email-config` reflects the active provider and whether the corresponding credentials are present.

---

## Error Handling

- If Resend is selected but `RESEND_API_KEY` is missing, the current sender error path remains the source of truth.
- If Resend is selected but the sender email is invalid or unverified, existing Resend-specific errors remain unchanged.
- The debug endpoint should point directly to missing `RESEND_API_KEY` when `EMAIL_PROVIDER=resend`.
- No silent fallback to SendGrid or SMTP will be introduced.

---

## Testing

### Code-Level Checks

- Verify the default provider resolves to `resend` when `EMAIL_PROVIDER` is unset.
- Verify explicit values `sendgrid`, `sendgrid-smtp`, and `smtp` still route correctly.
- Verify the debug endpoint returns a valid response for `currentProvider === 'resend'`.
- Verify the invalid-provider message includes `resend` in the supported list.

### Manual Verification

- Start the backend with `RESEND_API_KEY` set and `EMAIL_PROVIDER` omitted or set to `resend`.
- Confirm `/api/debug/email-config` reports `currentProvider: resend` and `status: configured`.
- Trigger a known email flow and confirm it uses the Resend sender path.

---

## Implementation Scope

Expected implementation touches:

- [`backend/src/config/env.ts`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/src/config/env.ts)
- [`backend/src/utils/email.ts`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/src/utils/email.ts)
- [`backend/src/app.ts`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/src/app.ts)
- [`backend/.env.example`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/.env.example)
- [`README.md`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/README.md)
- Local only: [`backend/.env`](s:/SDE/Projects/all/Core%20Softwares/BrainScale%20CRM/backend/.env)

---

## Acceptance Criteria

- An unset `EMAIL_PROVIDER` behaves exactly as if `EMAIL_PROVIDER=resend`.
- Resend appears as a first-class provider in the debug endpoint response and validation messaging.
- Repo documentation and example env files describe Resend as the default provider.
- Explicit provider overrides for SendGrid and SMTP remain supported.
