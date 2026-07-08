// Joe's Web Studio Booking Platform
//
// File:
// booking.js
//
// Responsibility:
// HTTP route handler for POST /api/v1/booking.
//
// Author:
// Joe's Web Studio
//
// Version:
// 1.0.0

// booking.js
// -----------------------------------------------------------------------------
// Route handler for POST /api/v1/booking.
// Responsible for: parsing the request, delegating validation/processing to
// the service layer, and returning a well-formed HTTP response. Contains no
// business logic itself — that lives in bookingService.js.
// -----------------------------------------------------------------------------

import { processBooking } from "./bookingService.js";
import { safeParseJSON } from "./validator.js";
import { jsonResponse } from "./response.js";
import { MESSAGES } from "./constants.js";

/**
 * Handles POST /api/v1/booking requests.
 * @param {Request} request - Incoming HTTP request.
 * @param {object} env - Environment bindings (Resend API key, DB, secrets —
 *   not used yet, but threaded through so future milestones don't require
 *   touching this signature again).
 * @param {object} ctx - Execution context (waitUntil, passThroughOnException).
 * @returns {Promise<Response>}
 */
export async function handleBookingRoute(request, env, ctx) {
  // Step 1: Safely parse the incoming JSON body.
  const { data: bookingData, error } = await safeParseJSON(request);

  if (error) {
    return jsonResponse(
      { success: false, message: MESSAGES.BOOKING_INVALID },
      400
    );
  }

  // Step 2: Delegate validation/processing to the service layer.
  // `env` is passed through so the service can eventually look up the
  // requesting client in the client registry, read secrets (e.g. Resend API
  // key), or query a database — none of which are implemented yet.
  const result = processBooking(bookingData, env);

  if (!result.valid) {
    return jsonResponse(
      { success: false, message: MESSAGES.BOOKING_INVALID },
      400
    );
  }

  // Step 3: Return a success response.
  return jsonResponse(
    { success: true, message: MESSAGES.BOOKING_SUCCESS },
    200
  );
}
