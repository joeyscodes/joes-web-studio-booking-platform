// Joe's Web Studio Booking Platform
//
// File:
// validator.js
//
// Responsibility:
// Shared request validation and safe JSON parsing helpers.
//
// Author:
// Joe's Web Studio
//
// Version:
// 1.0.0

// validator.js
// -----------------------------------------------------------------------------
// Generic validation helpers. Kept separate from business logic so validation
// rules can be reused, unit-tested, or extended (e.g. per-field checks) later
// without touching the service or route layers.
// -----------------------------------------------------------------------------

/**
 * Checks that a value is a non-null, non-array object with at least one key.
 * Used as the baseline check for "does a request body exist at all".
 * @param {*} value - The parsed request body to check.
 * @returns {boolean} True if the value is a usable object payload.
 */
export function isNonEmptyObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

/**
 * Safely parses a Request's JSON body without throwing.
 * @param {Request} request - The incoming request.
 * @returns {Promise<{ data: object|null, error: boolean }>}
 */
export async function safeParseJSON(request) {
  try {
    const data = await request.json();
    return { data, error: false };
  } catch {
    // Body was missing, empty, or not valid JSON.
    return { data: null, error: true };
  }
}
