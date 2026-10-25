# iBloomi Security Audit

Audit date: 2026-10-25

## Scope and architecture

- Production site: `https://ibloomi.nl`, deployed as a static Vercel project from the repository root.
- Client stack: static HTML/CSS/JavaScript, Supabase JavaScript SDK for authentication, and Google Analytics.
- Authentication: browser-side Supabase email/password and Google OAuth, followed by a session handoff to `https://builder.ibloomi.nl`.
- Server/API code: no root `api/` function is present in the deployed source. A live read-only request to `/api/config` returned `404`.
- Payment and AI endpoints: none were found in the deployed source or public route sample.

The local VS Code tree is not a Git checkout. The connected GitHub repository was cloned to a temporary, clean worktree for this audit. No remote state, deployment, database, credential, DNS, or external account was modified.

## Verification performed

- Checked the clean GitHub worktree at commit `44132b0` before changes.
- Reviewed HTML, JavaScript, Vercel routing/headers, authentication flows, public API candidates, secret file names, and dependency manifests.
- Made three low-volume public requests: `/`, `/auth`, and `/api/config`.
- Parsed `vercel.json` and ran `tests/security-static-check.ps1` after the fixes.

## Confirmed findings and remediation

| Severity | Finding | Status |
| --- | --- | --- |
| Medium | The active signup confirmation view inserted the submitted email address into `innerHTML` without escaping. | Fixed in `js/auth.js`; same defensive fix applied to the legacy root `auth.js`. |
| Medium | Clean-URL changes left OAuth and email-confirmation callback paths as `//auth`, producing malformed callback URLs. | Fixed to `/auth` in both auth scripts. |
| Medium | Production lacked a Content Security Policy, Permissions Policy, and Cross-Origin Resource Policy. | Added additive Vercel headers. The CSP intentionally permits existing inline scripts/styles and only the current Supabase, Google Analytics, Google Fonts, and jsDelivr dependencies. |
| High | The separate Amin task application was publicly served from `/amin/app` and uses a separate client-side credential model. Duplicate source artifacts were also reachable by path. | Added temporary Vercel redirects for `/amin/*`, `/mnt/*`, and `/ibloomi-website/*` to remove them from the production route surface. |
| Informational | A Supabase publishable key is client-side by design. No service-role key, payment secret, or tracked environment file was found in the repository. | No code change; database Row Level Security still requires account-level verification. |
| Informational | No dependency manifest or lockfile exists, so automated package vulnerability scanning and a conventional build were unavailable. | Documented; add a managed dependency workflow before introducing server code. |

## Material risks not safely fixable from this repository

1. **Session handoff to the Builder**: the authentication page sends Supabase access and refresh tokens in a URL fragment to `builder.ibloomi.nl`. Fragments are not sent in HTTP requests, but tokens remain available to scripts at the destination and may persist in browser history. Replacing this safely requires coordinated changes in the Builder and Supabase authentication design (for example, a one-time, short-lived server-side exchange).
2. **Supabase authorization and privacy**: table schemas, RLS policies, Storage rules, Auth redirect allowlists, MFA/rate limits, and email confirmation settings cannot be verified without Supabase project access. The publishable key must never be treated as authorization.
3. **Third-party script supply chain**: Supabase is loaded from jsDelivr using a major-version URL without Subresource Integrity. Pin and integrity-check the SDK, or serve a reviewed local copy, during the next dependency-management update.
4. **Duplicate source trees**: `ibloomi-website/`, `mnt/`, and `amin/` contain divergent copies/apps. Only the repository root matches the audited production deployment. Duplicates increase the chance of patch drift and accidental exposure if their routes are public.
5. **Amin credentials**: the Amin source contains an insecure client-side credential fallback. The production route is contained by this change, but the credential must be revoked/rotated by the owner and the application redesigned to use real server-side authentication before it is exposed again. This audit did not print, use, or commit that credential.
5. **Contact form**: the public form only shows a success message locally; it does not transmit data. This is not a data-exposure finding, but it should not be presented as a delivered message until a protected backend exists.

## Public HTTP observations

At the time of testing, Vercel returned HTTPS, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`. The new configuration adds CSP, Permissions Policy, and Cross-Origin Resource Policy for the next deployment. The audit did not perform destructive, high-volume, authentication-bypass, database, or rate-limit tests.

## Security conclusion

The reviewed static site has had its confirmed client-side injection and malformed callback issues addressed in this worktree. It is **not** sufficient evidence to claim the whole service is secure: Builder token handling, Supabase RLS/Auth configuration, any future API/AI service, and payment implementation need separate verification.
