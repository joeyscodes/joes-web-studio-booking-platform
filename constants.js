// Joe's Web Studio Booking Platform
//
// File:
// constants.js
//
// Responsibility:
// Centralized routes, HTTP methods, messages, and error codes.
//
// Author:
// Joe's Web Studio
//
// Version:
// 1.0.0

// constants.js
// -----------------------------------------------------------------------------
// Centralized configuration values. Keeping these in one place makes it easy
// to update routes, methods, or shared settings without hunting through the
// codebase later (e.g. when more routes/tenants are added).
// -----------------------------------------------------------------------------

/**
 * Supported API routes.
 * NOTE: Versioned under /api/v1/ so future breaking changes (e.g. /api/v2/)
 * can be introduced later without disrupting existing integrations.
 */
export const ROUTES = {
  BOOKING: "/api/v1/booking",
};

/** HTTP methods used across the API. */
export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
};

/** Standard response messages, kept consistent across the app. */
export const MESSAGES = {
  BOOKING_SUCCESS: "Booking received successfully.",
  BOOKING_INVALID: "Invalid booking request.",
  NOT_FOUND: "Not found.",
  SERVER_ERROR: "Something went wrong. Please try again later.",
};

/**
 * Centralized error codes used across the application.
 *
 * These are stable, machine-readable identifiers meant to be compared
 * directly (e.g. `if (errorCode === ERROR_CODES.EMAIL_DELIVERY_FAILED)`)
 * instead of matching against raw error text or provider-specific messages.
 * Keeping them here — rather than each service inventing its own strings —
 * means every layer of the app (routes, services, and eventually a future
 * admin/logging surface) shares one vocabulary for what went wrong.
 *
 * Not every code is used yet. Some (e.g. CLIENT_NOT_FOUND, BOOKINGS_DISABLED)
 * are reserved for the client registry / booking-status enforcement work
 * that hasn't been wired into the request flow yet, so the vocabulary is
 * already in place when that milestone arrives.
 */
export const ERROR_CODES = {
  // Raised when an incoming request fails validation (e.g. empty body).
  VALIDATION_ERROR: "VALIDATION_ERROR",

  // Reserved: raised once client lookup (clientRegistry.js) is wired into
  // the request flow, if no matching client is found for a request.
  CLIENT_NOT_FOUND: "CLIENT_NOT_FOUND",

  // Reserved: raised once a client's `bookingStatus` (see clientRegistry.js)
  // is enforced, if bookings are SUSPENDED, CLOSED, or under MAINTENANCE.
  BOOKINGS_DISABLED: "BOOKINGS_DISABLED",

  // Raised by emailService.js when a notification could not be delivered —
  // covers network failures and unexpected/unrecognized provider responses.
  EMAIL_DELIVERY_FAILED: "EMAIL_DELIVERY_FAILED",

  // Raised by emailService.js when the configured provider API key is
  // missing or rejected as invalid by the provider.
  INVALID_API_KEY: "INVALID_API_KEY",

  // Catch-all for unexpected failures that don't fit a more specific code.
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
};
