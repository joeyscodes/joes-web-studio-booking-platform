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
// WHAT THIS FILE OWNS (as of Milestone 10A)
//   - recipients   → who the notification goes to (from client.destinationEmails)
//   - replyTo       → resolved from booking data
//   - metadata      → contextual info about which client/what triggered this
//   - type          → what kind of notification this is ("BOOKING" today)
//   - createdAt     → when this notification object was built
//
// WHAT THIS FILE DELEGATES
// Deciding what the email actually SAYS — subject, HTML body, text body —
// is now the job of bookingEmailTemplate.js. This file calls that
// renderer with a narrow "branding" object (just the fields the renderer
// needs, not the full client record) plus the booking data, and drops the
// result straight into the notification object. This split exists so that:
//   - Rendering can be unit-tested on its own, with plain objects, no
//     knowledge of clients, recipients, or delivery required.
//   - This platform's other future email types (reminders, cancellations,
//     invoices, welcome emails, password resets) each get their own renderer
//     file (e.g. reminderEmailTemplate.js), without notificationService.js
//     accumulating unrelated render logic for every email type it ever sends.
//   - The renderer never sees API keys, booking status, or destination
//     emails — those stay exactly where they already are: this file.
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
// -----------------------------------------------------------------------------

import { renderBookingEmail } from "./bookingEmailTemplate.js";

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
 *   A professional, human-readable email subject line. Rendered by
 *   bookingEmailTemplate.js — this file does not decide subject
 *   copy itself.
 *
 * @property {string} html
 *   HTML body content. Rendered by bookingEmailTemplate.js. Still
 *   placeholder-level content at this stage — a future milestone will
 *   introduce the premium branded template inside that file.
 *
 * @property {string} text
 *   Plain-text body content, mirroring `html` for email clients that render
 *   text-only. Also rendered by bookingEmailTemplate.js.
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
 * Builds the narrow "branding" object passed to the email renderer.
 *
 * Deliberately kept separate from the full client record — the renderer
 * should only ever see the specific branding fields it consumes, never API
 * keys, booking status, destination emails, or any other business logic.
 * This is also how Milestone 10B will discover exactly which fields belong
 * in the future Brand Profile model: whatever this function ends up
 * building is the answer.
 *
 * @param {object} client - Resolved client record from clientRegistry.js.
 * @returns {import('./bookingEmailTemplate.js').BookingEmailBranding}
 */
function extractBranding(client) {
  return {
    businessName: client.businessName,
  };
}

/**
 * Builds a standardized Notification object for a new booking.
 *
 * This is the primary export of the Notification Service. It performs no
 * I/O, calls no external APIs, and sends nothing — it only assembles and
 * returns a plain object describing what a future delivery layer (e.g. a
 * Resend-backed provider module) should send. Subject/html/text content is
 * delegated to bookingEmailTemplate.js; everything else
 * (recipients, replyTo, metadata, type, createdAt) is still decided here.
 *
 * @param {object} client - Resolved client record from clientRegistry.js.
 *   Expected to provide at least `businessName`, `destinationEmails`,
 *   `clientId`, and `slug`.
 * @param {object} bookingData - The validated booking payload (already
 *   confirmed non-empty by bookingService.js before this is called).
 * @returns {Notification} A complete, provider-agnostic notification object.
 */
export function buildBookingNotification(client, bookingData) {
  const branding = extractBranding(client);
  const { subject, html, text } = renderBookingEmail(branding, bookingData);

  return {
    type: "BOOKING",
    recipients: client.destinationEmails,
    subject,
    html,
    text,
    replyTo: resolveReplyTo(bookingData),
    createdAt: new Date().toISOString(),
    metadata: {
      clientId: client.clientId,
      clientSlug: client.slug,
      source: "booking",
    },
  };
}
