# iBloomi Security Hardening Checklist

## Completed in this change set

- [x] Escape user-provided email before placing it in authentication success HTML.
- [x] Correct malformed `/auth` OAuth and confirmation callback paths.
- [x] Add a restrictive, compatibility-preserving Content Security Policy.
- [x] Add Permissions Policy and Cross-Origin Resource Policy response headers.
- [x] Contain publicly reachable duplicate/admin artifact directories at the Vercel edge.
- [x] Add a dependency-free regression check for these controls.

## Before the next production deployment

- [ ] Confirm `https://ibloomi.nl/auth` is in Supabase Auth redirect URLs and that the previous callback still behaves as intended.
- [ ] Revoke the exposed Amin credential, remove its client-side fallback, and host that app separately only after implementing real authentication and database authorization.
- [ ] Test email sign-up, email confirmation, password sign-in, sign-out, password recovery, and Google OAuth in a non-production Supabase project.
- [ ] Check browser developer tools for CSP violations; tighten `unsafe-inline` using nonces or hashes before adding more inline code.
- [ ] Confirm all Builder scripts clear tokens from the URL immediately after consuming them and never log them.

## Supabase controls (requires project-owner access)

- [ ] Enable and test RLS on every table, view, function, and Storage bucket exposed to the publishable key.
- [ ] Use least-privilege policies keyed to `auth.uid()`; deny anonymous writes unless explicitly required.
- [ ] Verify Auth redirect allowlists contain only trusted HTTPS origins.
- [ ] Enable email confirmation, breached-password protection, appropriate password requirements, and practical sign-in throttling.
- [ ] Review audit logs, Auth logs, database function privileges, and Storage object policies.
- [ ] Keep service-role keys exclusively in server-side environment variables.

## API and AI controls (required before any endpoint is introduced)

- [ ] Put model-provider keys only in Vercel/server-side environment variables; never in browser code or public config routes.
- [ ] Require authenticated users, server-side authorization, per-user and per-IP rate limits, request-size limits, and bot/WAF rules.
- [ ] Enforce an allowlisted model/task set and output limits; set cost budgets, alerts, and circuit breakers.
- [ ] Validate input schemas server-side and log security events without prompts, tokens, or personal data.
- [ ] Use idempotency keys for any action that can create an order, charge, or costly AI job.

## Ongoing maintenance

- [ ] Remove or isolate stale duplicate source trees from the deploy output.
- [ ] Introduce a package manifest, lockfile, pinned third-party SDK version, and dependency scanning before adding server code.
- [ ] Add automated linting, HTML validation, header checks, and authenticated integration tests in CI.
- [ ] Re-run this audit after changes to Builder, Supabase, AI, analytics, or payment flows.
