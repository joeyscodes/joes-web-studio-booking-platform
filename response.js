// Joe's Web Studio Booking Platform
//
// File:
// response.js
//
// Responsibility:
// Shared helper for building consistent JSON responses.
//
// Author:
// Joe's Web Studio
//
// Version:
// 1.0.0

// response.js
// -----------------------------------------------------------------------------
// Shared helper for building consistent JSON responses across all routes.
// Every endpoint should return through this helper so the response shape
// (headers, content-type, status codes) stays uniform as the API grows.
// -----------------------------------------------------------------------------

/**
 * Build a structured JSON Response object.
 * @param {object} body - The JSON-serializable payload to send back.
 * @param {number} [status=200] - HTTP status code.
 * @returns {Response}
 */
export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Required for cross-origin callers (e.g. a client's website on a
      // different domain) to read this response at all. Without this header,
      // the browser blocks the response even when the request itself
      // succeeded server-side. "*" matches this API's multi-tenant design
      // (many client sites, not one fixed origin).
      "Access-Control-Allow-Origin": "*",
    },
  });
}
