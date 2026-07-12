// Joe's Web Studio Booking Platform
//
// File:
// clientRegistry.js
//
// Responsibility:
// Central registry of client/tenant records for the multi-tenant system.
//
// Author:
// Joe's Web Studio
//
// Version:
// 1.0.0

// clientRegistry.js
// -----------------------------------------------------------------------------
// Central registry of tenant/client records for the multi-tenant booking
// system.
//
// STATUS: Foundation only. This file defines the data shape and holds sample
// data, but is NOT imported or called from index.js, booking.js, or
// bookingService.js yet. Wiring it into the request flow (domain/slug lookup
// during booking processing) is a separate, future milestone.
//
// WHY THIS FILE EXISTS
// Every client of Joe's Web Studio (a salon, restaurant, education center,
// etc.) needs a record describing who they are, which domain their booking
// widget lives on, and where their booking notifications should go. Rather
// than scattering that information across the codebase, it lives here in one
// place — the same way a `clients` table would in a real database.
//
// DESIGNED TO LOOK LIKE A DATABASE TABLE
// The shape below is intentionally modeled the way a row in a `clients`
// table would look (e.g. in D1, Postgres, or a KV namespace storing JSON
// blobs). The goal is that swapping this array out for a real query later
// (e.g. `await env.DB.prepare("SELECT * FROM clients WHERE slug = ?")`)
// should require touching call sites, not this file's shape. Field names,
// casing, and types were chosen to map cleanly onto typical SQL column names
// (clientId → client_id, createdAt → created_at, etc.) if/when a migration
// happens.
// -----------------------------------------------------------------------------

/**
 * Enum of possible booking statuses for a client.
 *
 * A client's `bookingStatus` controls whether their booking flow should be
 * treated as open for business once this registry is wired into the Worker.
 * Defined as constants (rather than free-text strings scattered around) so
 * every reference stays in sync and typos become import errors instead of
 * silent bugs.
 *
 *   - ACTIVE      → Client is live and accepting bookings normally.
 *   - SUSPENDED    → Client's account is paused (e.g. non-payment, dispute).
 *                    Bookings should be rejected once this is enforced.
 *   - MAINTENANCE  → Client's site/booking flow is temporarily under work
 *                    (e.g. Josey is mid-deployment). Bookings should be
 *                    held or rejected with a friendly message once enforced.
 *   - CLOSED       → Client relationship has ended or the business itself
 *                    is closed. Bookings should never be accepted.
 */
export const BOOKING_STATUS = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  MAINTENANCE: "MAINTENANCE",
  CLOSED: "CLOSED",
};

/**
 * @typedef {object} ClientRecord
 * @property {string} clientId
 *   Permanent, unique identifier for this client. Unlike `slug`, this value
 *   is never meant to change even if the business rebrands or changes its
 *   domain — it's the stable primary key a future database would use
 *   (analogous to an auto-increment ID or UUID primary key).
 *
 * @property {string} slug
 *   A short, URL/human-friendly identifier derived from the business name
 *   (e.g. "belle-vie-salon-spa"). Useful for logging, debugging, and any
 *   future admin tooling where a readable identifier is nicer to work with
 *   than a raw ID. Kept separate from `clientId` because slugs can
 *   realistically change (rebrand, typo fix) while a primary key should not.
 *
 * @property {string} businessName
 *   The human-readable display name of the business, exactly as it should
 *   appear in notifications, dashboards, or future admin UIs
 *   (e.g. "Belle Vie Salon & Spa").
 *
 * @property {string} websiteDomain
 *   The domain the client's booking widget/site is served from. Once this
 *   registry is wired in, incoming booking requests will eventually be
 *   matched to a client by comparing this field against the request's
 *   origin/host — similar to a `WHERE website_domain = ?` lookup.
 *
 * @property {string[]} destinationEmails
 *   One or more email addresses that should receive booking notifications
 *   for this client. Modeled as an array (not a single string) because a
 *   business may want bookings sent to multiple staff/owners at once
 *   (e.g. the salon owner AND a front-desk inbox). This will be consumed by
 *   notificationService.js once Resend integration begins — nothing reads
 *   it yet.
 *
 * @property {string} apiKey
 *   PLACEHOLDER ONLY. Reserved for a future per-client API key used to
 *   authenticate booking requests as belonging to this client. No auth
 *   logic exists yet — this field exists purely so the record shape won't
 *   need to change again when authentication is implemented. Real values
 *   should eventually live in a secret store (e.g. Cloudflare secrets or a
 *   hashed value in a real DB), never committed as plain text.
 *
 * @property {string} bookingStatus
 *   One of the `BOOKING_STATUS` enum values. Determines whether this
 *   client's booking flow is currently open, paused, or closed. Not yet
 *   enforced anywhere in the request flow — this is data modeling only.
 *
 * @property {string} createdAt
 *   ISO 8601 timestamp of when this client record was created. Mirrors the
 *   `created_at` column convention common in real database tables, useful
 *   for auditing and sorting once an admin view exists.
 *
 * @property {string} updatedAt
 *   ISO 8601 timestamp of the last time this record was modified. Mirrors
 *   the `updated_at` column convention. Should be bumped any time a client's
 *   record changes, once this registry is backed by real writes.
 */

/**
 * Registry of known clients/tenants.
 *
 * Currently an in-memory array acting as a stand-in for a future database
 * table. Populated with one illustrative sample record. Not yet imported by
 * any route or service — this milestone only establishes the data shape.
 *
 * @type {ClientRecord[]}
 */
export const clientRegistry = [
  {
    // Stable primary key — would map to a DB primary key / UUID column.
    clientId: "client_0001",

    // Readable identifier derived from the business name.
    slug: "belle-vie-salon-spa",

    // Display name, used in notifications and future admin UIs.
    businessName: "Belle Vie Salon & Spa",

    // Domain the client's booking site/widget is served from.
    // Placeholder value — replace with the real live domain once deployed.
    websiteDomain: "bellevie-salonspa.com",

    // Array to support one or many notification recipients.
    // Placeholder addresses — replace with the client's real inbox(es).
    destinationEmails: ["bookings@bellevie-salonspa.com"],

    // Placeholder only — no real key generated, no auth logic implemented.
    apiKey: "placeholder-api-key-client-0001",

    // Client is modeled as open for business by default.
    bookingStatus: BOOKING_STATUS.ACTIVE,

    // Placeholder timestamps — would be set by the database on insert/update
    // in a real implementation.
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-08T00:00:00.000Z",
  },
  {
    // Stable primary key — would map to a DB primary key / UUID column.
    clientId: "client_0002",

    // Readable identifier derived from the business name.
    slug: "joes-web-studio-test",

    // Display name, used in notifications and future admin UIs.
    businessName: "Joe's Web Studio Test Client",

    // Domain the client's booking site/widget is served from. `localhost`
    // is intentional here — this is a real test client used for local
    // development/testing, not a live production business.
    websiteDomain: "localhost",

    // Real destination inbox for this test client's booking notifications.
    destinationEmails: ["joeswebstudio@gmail.com"],

    // Real, unique, cryptographically random API key (not a placeholder).
    apiKey: "jws_live_7L-Y0ppL-bzwwNUyVzJa81yJ-2h56EfeShmUgW3eiBM",

    // Client is active and accepting bookings immediately.
    bookingStatus: BOOKING_STATUS.ACTIVE,

    // Real registration timestamps for this client.
    createdAt: "2026-07-11T00:00:00.000Z",
    updatedAt: "2026-07-11T00:00:00.000Z",
  },
];
