// Joe's Web Studio Booking Platform
//
// File:
// notificationService.js
//
// Responsibility:
// Builds standardized, provider-agnostic notification objects for bookings.
//
// Author:
// Joe's Web Studio
//
// Version:
// 1.0.0

// notificationService.js
// -----------------------------------------------------------------------------
// NOTIFICATION SERVICE
//
// Responsibility: prepare a standardized, provider-agnostic "Notification"
// object describing what should be sent to whom, in response to a booking.
// This service does NOT send anything — it has no knowledge of Resend, SMTP,
// or any other delivery mechanism, and it makes no network requests.
//
// WHY THIS IS SEPARATED FROM THE EMAIL PROVIDER
// A booking notification really has two distinct concerns:
//   1. WHAT to send and WHO it goes to — deciding the subject, recipients,
//      reply-to address, and content. This is business logic tied to a
//      client and a booking, and has nothing to do with any specific
//      third-party API.
//   2. HOW to actually deliver it — authenticating with a provider (e.g.
//      Resend), making the HTTP call, handling delivery errors/retries.
//      This is infrastructure/integration logic tied to a specific vendor.
//
// Keeping (1) here and deliberately keeping (2) out means:
//   - This file can be fully unit-tested with plain objects — no network,
//     no mocking of a third-party SDK required.
//   - Swapping providers later (e.g. Resend → Postmark → SES) only touches
//     a future "provider adapter" module, never this file.
//   - The eventual universal email template (Milestone 2C) has one clear
//     place to plug in: the placeholder html/text builders below.
//
// CURRENT SCOPE (this milestone only)
// This file exposes one primary function, `buildBookingNotification`, which
// takes a resolved client record and validated booking data and returns a
// plain "Notification" object. Nothing is sent. No provider is called. A
// future milestone will add a separate module (e.g.
// `emailProvider.js` or similar) that accepts a Notification
// object produced here and actually delivers it via Resend.
// -----------------------------------------------------------------------------

/**
 * @typedef {object} Notification
 * @property {string} type
 *   The kind of notification this is. Only "BOOKING" exists today, but
 *   modeling this as a field (rather than assuming every notification is a
 *   booking notification) leaves room for future types — e.g. "CANCELLATION"
 *   or "REMINDER" — without changing the shape of this object.
 *
 * @property {string[]} recipients
 *   The list of email addresses this notification should be delivered to.
 *   Sourced directly from `client.destinationEmails` (already an array on
 *   the client registry, so no reshaping is needed here).
 *
 * @property {string} subject
 *   A professional, human-readable email subject line, generated
 *   automatically from the client's business name.
 *
 * @property {string} html
 *   Placeholder HTML body content. NOT the final template — Milestone 2C
 *   will introduce a universal, branded HTML template. This is intentionally
 *   simple and clearly marked as a placeholder so it's obvious it's not
 *   production content.
 *
 * @property {string} text
 *   Placeholder plain-text body content, mirroring `html` for email clients
 *   that render text-only. Same placeholder status as `html`.
 *
 * @property {string|null} replyTo
 *   The customer's email address, if the booking payload included one, so
 *   the business can reply directly to the customer from their inbox.
 *   `null` when no customer email was provided — callers should not assume
 *   this is always present.
 *
 * @property {string} createdAt
 *   ISO 8601 timestamp of when this notification object was built. Useful
 *   later for logging, debugging delivery delays, or auditing.
 *
 * @property {object} metadata
 *   A small bag of contextual, non-content information about the
 *   notification — who it's for and what triggered it — kept separate from
 *   the display content (subject/html/text) so a future delivery layer or
 *   logging system can key off it without parsing email content.
 *   Currently includes:
 *     - clientId   → which client this notification belongs to.
 *     - clientSlug → the client's readable identifier.
 *     - source     → what triggered this notification ("booking" for now).
 */

/**
 * Builds the default, professional subject line for a booking notification.
 * Kept as its own small function so subject formatting can be adjusted or
 * localized later without touching the rest of the builder.
 *
 * @param {object} client - Resolved client record (see clientRegistry.js).
 * @returns {string} e.g. "New Appointment Booking - Belle Vie Salon & Spa"
 */
function buildDefaultSubject(client) {
  return `New Appointment Booking - ${client.businessName}`;
}

/**
 * Builds placeholder HTML content for a booking notification.
 *
 * NOT the final design. This exists only so `buildBookingNotification`
 * returns a complete, valid Notification object today. Milestone 2C will
 * replace the body of this function with a proper universal HTML template
 * (branding, styling, structured booking details, etc.).
 *
 * @param {object} client - Resolved client record.
 * @param {object} bookingData - Validated booking payload.
 * @returns {string} Placeholder HTML string.
 */
function buildPlaceholderHtml(client, bookingData) {
  return `
    <!-- PLACEHOLDER CONTENT: universal email template arrives in Milestone 2C -->
    <div>
      <p>New booking request for <strong>${client.businessName}</strong>.</p>
      <p>[PLACEHOLDER] Booking details will be formatted here once the
      universal email template is implemented.</p>
      <pre>${JSON.stringify(bookingData, null, 2)}</pre>
    </div>
  `.trim();
}

/**
 * Builds placeholder plain-text content for a booking notification.
 * Mirrors `buildPlaceholderHtml` for text-only email clients. Same
 * "not final" status — see that function's comments.
 *
 * @param {object} client - Resolved client record.
 * @param {object} bookingData - Validated booking payload.
 * @returns {string} Placeholder plain-text string.
 */
function buildPlaceholderText(client, bookingData) {
  return [
    "[PLACEHOLDER CONTENT — universal email template arrives in Milestone 2C]",
    `New booking request for ${client.businessName}.`,
    "Booking details:",
    JSON.stringify(bookingData, null, 2),
  ].join("\n");
}

/**
 * Resolves a reply-to address from booking data, if one was provided.
 * Kept as its own helper because "where does the customer's email live in
 * the payload" is a detail worth isolating — booking schemas may evolve
 * (e.g. `email` vs `customerEmail`) without touching the main builder.
 *
 * @param {object} bookingData - Validated booking payload.
 * @returns {string|null} The customer's email address, or null if absent.
 */
function resolveReplyTo(bookingData) {
  return bookingData?.email ?? bookingData?.customerEmail ?? null;
}

/**
 * Builds a standardized Notification object for a new booking.
 *
 * This is the primary export of the Notification Service. It performs no
 * I/O, calls no external APIs, and sends nothing — it only assembles and
 * returns a plain object describing what a future delivery layer (e.g. a
 * Resend-backed provider module) should send.
 *
 * @param {object} client - Resolved client record from clientRegistry.js.
 *   Expected to provide at least `businessName`, `destinationEmails`,
 *   `clientId`, and `slug`.
 * @param {object} bookingData - The validated booking payload (already
 *   confirmed non-empty by bookingService.js before this is called).
 * @returns {Notification} A complete, provider-agnostic notification object.
 */
export function buildBookingNotification(client, bookingData) {
  return {
    type: "BOOKING",
    recipients: client.destinationEmails,
    subject: buildDefaultSubject(client),
    html: buildPlaceholderHtml(client, bookingData),
    text: buildPlaceholderText(client, bookingData),
    replyTo: resolveReplyTo(bookingData),
    createdAt: new Date().toISOString(),
    metadata: {
      clientId: client.clientId,
      clientSlug: client.slug,
      source: "booking",
    },
  };
}
