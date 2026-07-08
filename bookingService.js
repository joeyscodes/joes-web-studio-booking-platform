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
// of HTTP concerns (no Request/Response objects) so it can be tested in
// isolation and reused if new routes (e.g. GET /api/v1/booking/:id) are added
// later.
//
// NOTE: No database, email, or auth logic is implemented here by design.
// This is a foundation layer only — future persistence/notification logic
// should plug in here without changing the route layer.
// -----------------------------------------------------------------------------

import { isNonEmptyObject } from "./validator.js";

/**
 * Validates and processes a booking payload.
 * @param {object|null} bookingData - Parsed JSON body from the request.
 * @param {object} [env] - Cloudflare environment bindings. Not used yet, but
 *   accepted here so this function's signature already matches what future
 *   milestones will need:
 *     - Looking up the requesting client in the client registry
 *       (clientRegistry.js) via a domain/API key on `env`.
 *     - Reading secrets such as env.RESEND_API_KEY.
 *     - Querying a database binding (e.g. env.DB) once persistence exists.
 * @returns {{ valid: boolean, data?: object }} Result of processing.
 */
export function processBooking(bookingData, env) {
  // Foundation-level validation: confirm the body exists and isn't empty.
  // Field-level validation (name, date, service, etc.) can be added here
  // as the schema for a booking is defined in later iterations.
  if (!isNonEmptyObject(bookingData)) {
    return { valid: false };
  }

  // Placeholder for future logic: persistence, notifications, tenant routing.
  // `env` will be used here to resolve the client (via clientRegistry.js) and
  // hand off to notificationService.js once those features are implemented.
  // Currently just acknowledges receipt of a valid-shaped booking.
  return { valid: true, data: bookingData };
}
