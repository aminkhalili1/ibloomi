# Payment Readiness Review

Audit date: 2026-10-25

## Current status

No Stripe, Mollie, payment form, checkout endpoint, webhook handler, order API, or payment dependency was found in the deployed root project. No payment functionality was implemented or tested.

The current static-only architecture is **not payment-ready**. A payment integration must add a server-side component; client-side JavaScript must never create authoritative prices, orders, or payment confirmations.

## Required design controls

### Price and order integrity

- Calculate product prices, currency, discounts, shipping, tax, and availability on the server from trusted product records.
- Treat all browser totals, product IDs, coupon codes, and quantities as untrusted input.
- Create a pending order server-side before checkout with an immutable order snapshot and a unique idempotency key.
- Bind the payment provider reference to that pending order; prevent duplicate order creation with a database uniqueness constraint and idempotency handling.

### Stripe or Mollie checkout

- Create Checkout Sessions/payment intents or Mollie payments only from an authenticated server endpoint.
- Store provider API keys in server-side environment variables, separate test from live keys, and restrict access by environment.
- Allow only server-defined return URLs and metadata. Do not accept an amount supplied by the browser.
- Use provider-hosted checkout or tokenization so card data never reaches iBloomi servers.

### Webhook verification and fulfillment

- Receive webhooks in a dedicated server endpoint over HTTPS.
- Verify the provider signature against the raw request body before parsing or acting on it.
- Handle each event idempotently: persist provider event IDs, reject duplicates, and transition orders transactionally.
- Mark an order paid or fulfill it only after a verified webhook—not after a browser success redirect.
- Log minimal operational metadata; never log payment secrets, full customer payment data, or webhook signatures.

### Abuse and operational safeguards

- Rate-limit checkout creation per authenticated user/IP and add bot/WAF protection.
- Require a valid authenticated session and server-side authorization for order status endpoints.
- Add fraud controls appropriate to the provider, monitoring for unusual order volume, refund workflows, and alerting.
- Test cancellation, expiration, retries, out-of-order webhooks, duplicate webhooks, partial failures, and refund handling in provider sandbox mode.

## Go-live gate

Do not accept live payments until the server-side pricing, verified webhook, idempotency, database authorization, abuse protection, monitoring, and sandbox test coverage above are independently reviewed.
