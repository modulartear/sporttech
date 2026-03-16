Sporttech2

## Payments with MercadoPago

This project includes a secure payment integration using **MercadoPago** via **Supabase Edge Functions** and the existing `purchases`, `payment_webhooks` and `access_tokens` tables.

### Environment variables (Supabase project)

Configure these variables in your Supabase project (Functions settings):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`

### Edge functions

- `mercadopago-create-preference`
  - **Input** (POST, authenticated): `{ eventId: string }`
  - Creates/ensures a `purchases` row for the current user + event with `payment_status = 'pending'`.
  - Uses MercadoPago SDK to create a **payment preference** with metadata linking `purchase_id`, `event_id`, and `user_id`.
  - Returns `{ preferenceId, initPoint, purchaseId }`.

- `mercadopago-webhook`
  - **Input** (POST, public endpoint called by MercadoPago).
  - Stores the raw webhook in `payment_webhooks`.
  - Fetches the payment from MercadoPago using the SDK and reads the `metadata.purchase_id`.
  - Updates the corresponding `purchases.payment_status` (`pending`/`approved`/`rejected`/`refunded`).
  - On `approved`, creates an `access_tokens` row linking the user and event.

### Frontend usage

- The `createMercadoPagoPreference(eventId)` helper in `src/lib/supabase.ts` calls the `mercadopago-create-preference` function using the logged-in user’s session.
- `HomePage` adds a **“Comprar entrada”** action for upcoming events which:
  - Ensures the user is authenticated (redirects to `/login` otherwise).
  - Requests a MercadoPago preference and redirects the browser to `initPoint` to complete the payment.


Deploy version: 1.0.1 - 2026-03-16 11:51:25
