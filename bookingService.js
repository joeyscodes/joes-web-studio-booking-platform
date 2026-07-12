// Joe's Web Studio Booking Platform
//
// File:
// bookingService.js
//
// Responsibility:
// Coordinates booking validation and workflow orchestration.
//
// Author:
// Joe's Web Studio
//
// Version:
// 1.0.0

// bookingService.js
// -----------------------------------------------------------------------------
// Business logic for handling bookings. This layer is intentionally kept free
// of HTTP concerns (no Request/Response objects, no status codes) so it can
// be tested in isolation and reused if new routes are added later.
//
// RECONNECTION NOTE
// This file previously stopped after a basic "is this a non-empty object"
// check and returned success immediately — it never looked up a client,
// never built a notification, and never sent an email. This version
// reconnects the full workflow using the existing, already-working modules
// exactly as they exist:
//   1. Validate the shape of the incoming request        → (this file, using
//                                                            validator.js's
//                                                            isNonEmptyObject)
//   2. Identify which client submitted the booking        → clientRegistry.js
//   3. Confirm that client is currently accepting bookings → clientRegistry.js
//   4. Build a notification for the booking                → notificationService.js
//   5. Deliver that notification                            → emailService.js
//   6. Return one standardized result — success is only reported once the
//      email has actually been sent.
//
// SCOPE NOTE (why some logic lives here instead of in validator.js /
// clientRegistry.js)
// The deployed clientRegistry.js exports only the raw `clientRegistry` array
// (no lookup helper), and the deployed validator.js exports only
// `isNonEmptyObject` / `safeParseJSON` (no shape validator for the
// client/booking envelope). Rather than adding new exports to those files —
// which this fix is intentionally scoped to leave untouched — the client
// lookup and envelope-shape check are written here, built entirely out of
// what those files already export.
//
// This file never touches provider secrets. It calls emailService.js's
// `sendEmail(notification, env)` and passes `env` straight through — only
// emailService.js is allowed to read env.RESEND_API_KEY. This file never
// sets an HTTP status code or builds a Response; that mapping is
// booking.js's job.
// -----------------------------------------------------------------------------

import { isNonEmptyObject } from "./validator.js";
import { clientRegistry, BOOKING_STATUS } from "./clientRegistry.js";
import { buildBookingNotification } from "./notificationService.js";
import { sendEmail } from "./emailService.js";
import { ERROR_CODES } from "./constants.js";

/**
 * Validates that the request body matches the expected envelope:
 *   { "client": { "apiKey": "..." }, "booking": { ...booking fields... } }
 *
 * Built from the existing `isNonEmptyObject` helper rather than added to
 * validator.js as a new export, to keep this fix scoped to booking.js /
 * bookingService.js only.
 *
 * @param {*} body - Parsed JSON request body.
 * @returns {boolean}
 */
function isValidBookingEnvelope(body) {
  if (!isNonEmptyObject(body)) {
    return false;
  }
  if (!isNonEmptyObject(body.client)) {
    return false;
  }
  if (typeof body.client.apiKey !== "string" || body.client.apiKey.trim().length === 0) {
    return false;
  }
  if (!isNonEmptyObject(body.booking)) {
    return false;
  }
  return true;
}

/**
 * Finds a client record by API key.
 *
 * clientRegistry.js exports only the raw `clientRegistry` array in this
 * version (no lookup helper) — this lookup is written here rather than
 * added to clientRegistry.js, to keep this fix scoped to booking.js /
 * bookingService.js only, per instructions.
 *
 * @param {string} apiKey
 * @returns {object|null} The matching client record, or null.
 */
function findClientByApiKey(apiKey) {
  const match = clientRegistry.find((client) => client.apiKey === apiKey);
  return match || null;
}

/**
 * Validates, processes, and delivers notification for an incoming booking
 * request.
 *
 * @param {object|null} requestBody - Parsed JSON body from the request.
 * @param {object} [env] - Cloudflare environment bindings. Passed straight
 *   through to emailService.js's `sendEmail` — this file never reads
 *   provider secrets (e.g. env.RESEND_API_KEY) itself.
 * @returns {Promise<{ valid: boolean, delivered: boolean, errorCode?: string, client?: object, bookingData?: object }>}
 *   On failure (at any step): `{ valid: false, delivered: false, errorCode }`.
 *   On success (email actually sent): `{ valid: true, delivered: true, client, bookingData }`.
 */
export async function processBooking(requestBody, env) {
  // Step 1: Confirm the request matches the expected client/booking shape.
  if (!isValidBookingEnvelope(requestBody)) {
    return { valid: false, delivered: false, errorCode: ERROR_CODES.VALIDATION_ERROR };
  }

  const { client: clientCredentials, booking: bookingData } = requestBody;

  // Step 2: Identify which client this booking belongs to.
  const client = findClientByApiKey(clientCredentials.apiKey);

  if (!client) {
    return { valid: false, delivered: false, errorCode: ERROR_CODES.CLIENT_NOT_FOUND };
  }

  // Step 3: Confirm the client is currently accepting bookings. Any status
  // other than ACTIVE stops processing here — no notification is built or
  // sent for a client that isn't open for business.
  if (client.bookingStatus !== BOOKING_STATUS.ACTIVE) {
    return { valid: false, delivered: false, errorCode: ERROR_CODES.BOOKINGS_DISABLED };
  }

  // Step 4: Build the notification for this booking.
  const notification = buildBookingNotification(client, bookingData);

  // Step 5: Deliver the notification. Success is not reported unless this
  // actually succeeds.
  const emailResult = await sendEmail(notification, env);

  if (!emailResult.success) {
    return { valid: false, delivered: false, errorCode: ERROR_CODES.EMAIL_DELIVERY_FAILED };
  }

  // Step 6: Only now — after the email has actually been sent — report success.
  return { valid: true, delivered: true, client, bookingData };
}
