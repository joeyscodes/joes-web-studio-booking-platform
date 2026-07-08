> **Joe's Web Studio Booking Platform**
>
> **File:**
> README.md
>
> **Responsibility:**
> Project documentation — structure, endpoint, and architecture overview.
>
> **Author:**
> Joe's Web Studio
>
> **Version:**
> 1.0.0

---

# Joe's Web Studio Booking System

A foundational, production-ready Cloudflare Worker for a multi-tenant booking API.

## Folder structure

This project uses a **flat repository structure** — all JavaScript files live
at the repository root rather than in nested folders. This is intentional:
it makes the project reliable to upload and manage from GitHub Mobile on
Android, which does not preserve nested folder structures well.

```
index.js                 → Worker entry point / router
booking.js                → HTTP route handler (parse request, call service, return response)
bookingService.js         → Booking business logic, decoupled from HTTP concerns
notificationService.js    → Builds standardized notification objects for bookings
emailService.js           → Delivers notifications via the Resend email provider
constants.js               → Centralized constants (routes, methods, messages, error codes)
clientRegistry.js          → Central registry of multi-tenant client records
response.js                → Shared JSON response helper
validator.js               → Shared request validation helpers
wrangler.toml   → Cloudflare Worker configuration
package.json    → Project manifest and scripts
```

All imports between these files use flat, same-directory paths (e.g.
`import { processBooking } from "./bookingService.js";`) since every file is
now a sibling in the same directory.

## Endpoint

### `POST /api/v1/booking`

Accepts a JSON body. The route is versioned under `/api/v1/` so future
breaking changes can ship as `/api/v2/` without disrupting existing
integrations.

**Success response — `200`**
```json
{
  "success": true,
  "message": "Booking received successfully."
}
```

**Invalid request response — `400`** (missing, empty, or malformed body)
```json
{
  "success": false,
  "message": "Invalid booking request."
}
```

## Running locally

```bash
npm install
npm run dev
```

## Deploying

```bash
npm run deploy
```

## Environment (`env`) pass-through

The Cloudflare `env` object is now threaded through every layer:
`index.js` → `booking.js` → `bookingService.js`. It is not
used for anything yet, but this means future features (Resend API key,
database bindings, client-specific secrets) can be added by reading from
`env` inside the services — no route or entry-point changes required.

## Client registry (placeholder)

`clientRegistry.js` holds the multi-tenant client records (client ID,
business name, website domain, destination emails, API key placeholder,
booking status). Not yet wired into the route or booking service — that
lookup is a future milestone.

## Notification & email services

`notificationService.js` builds a standardized notification object
(subject, html, text, recipients, replyTo, metadata) for a booking.
`emailService.js` delivers that notification via Resend. Neither is
currently called from `bookingService.js` — wiring them into the live
request flow is a future milestone.

## Explicitly out of scope (by design)

This is a foundation layer only. The following are intentionally **not**
implemented yet, and should be added in later iterations without needing to
restructure this codebase:

- Resend integration (actual email sending)
- Database / persistence
- Authentication / authorization / API keys
- Email templates
- Client dashboard
- Field-level booking validation (name, date, service, tenant, etc.)

Each of these has a clear place to slot in:
- Persistence → `bookingService.js` (via `env`)
- Notifications → `notificationService.js` / `emailService.js` (already scaffolded)
- Client/tenant data → `clientRegistry.js` (already scaffolded)
- Auth → new middleware layer wrapping `booking.js`
- Field validation → extend `validator.js`
