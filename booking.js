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
//
// RECONNECTION NOTE
// bookingService.js now runs the complete workflow (validate → find client →
// check status → build notification → send email) and returns one
// standardized result. This file only maps that result to the right HTTP
// status code and response body — it never sees provider errors,
// notification content, or email-delivery internals.
// -----------------------------------------------------------------------------

import { processBooking } from "./bookingService.js";
import { safeParseJSON } from "./validator.js";
import { jsonResponse } from "./response.js";
import { MESSAGES, ERROR_CODES } from "./constants.js";

/**
 * Handles POST /api/v1/booking requests.
 *
 * Expects a JSON body of the form:
 *   {
 *     "client": { "apiKey": "..." },
 *     "booking": { ...booking fields... }
 *   }
 *
 * @param {Request} request - Incoming HTTP request.
 * @param {object} env - Environment bindings (Resend API key, EMAIL_FROM).
 *   Passed straight through to bookingService.js, which passes it straight
 *   through to emailService.js — this file never reads env.RESEND_API_KEY
 *   or any other provider secret directly.
 * @param {object} ctx - Execution context (waitUntil, passThroughOnException).
 * @returns {Promise<Response>}
 */
export async function handleBookingRoute(request, env, ctx) {
  // Step 1: Safely parse the incoming JSON body.
  const { data: requestBody, error } = await safeParseJSON(request);

  if (error) {
    return jsonResponse(
      { success: false, message: MESSAGES.BOOKING_INVALID },
      400
    );
  }

  // Step 2: Delegate the full workflow — validation, client lookup,
  // booking-status enforcement, notification building, and email delivery —
  // to the service layer.
  const result = await processBooking(requestBody, env);

  if (!result.valid) {
    // Map each failure outcome from bookingService.js to its HTTP response.
    // Friendly messages for CLIENT_NOT_FOUND / BOOKINGS_DISABLED are written
    // inline here rather than added to constants.js's MESSAGES, to keep this
    // fix scoped to booking.js / bookingService.js only. EMAIL_DELIVERY_FAILED
    // reuses the existing MESSAGES.SERVER_ERROR friendly message as-is.
    switch (result.errorCode) {
      case ERROR_CODES.CLIENT_NOT_FOUND:
        return jsonResponse(
          {
            success: false,
            errorCode: ERROR_CODES.CLIENT_NOT_FOUND,
            message: "No client was found for the provided API key.",
          },
          404
        );

      case ERROR_CODES.BOOKINGS_DISABLED:
        return jsonResponse(
          {
            success: false,
            errorCode: ERROR_CODES.BOOKINGS_DISABLED,
            message: "Bookings are not currently being accepted for this client.",
          },
          403
        );

      case ERROR_CODES.EMAIL_DELIVERY_FAILED:
        // Friendly message only — never expose Resend's raw error text here.
        // bookingService.js already stripped that detail out before this point.
        return jsonResponse(
          {
            success: false,
            errorCode: ERROR_CODES.EMAIL_DELIVERY_FAILED,
            message: MESSAGES.SERVER_ERROR,
          },
          500
        );

      case ERROR_CODES.VALIDATION_ERROR:
      default:
        return jsonResponse(
          { success: false, message: MESSAGES.BOOKING_INVALID },
          400
        );
    }
  }

  // Step 3: Return a success response — only reached once bookingService.js
  // confirms the email was actually delivered.
  return jsonResponse(
    { success: true, message: MESSAGES.BOOKING_SUCCESS },
    200
  );
}
