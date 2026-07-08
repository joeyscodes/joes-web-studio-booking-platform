// Joe's Web Studio Booking Platform
//
// File:
// index.js
//
// Responsibility:
// Worker entry point; routes incoming requests to the correct handler.
//
// Author:
// Joe's Web Studio
//
// Version:
// 1.0.0

// index.js
// -----------------------------------------------------------------------------
// Entry point for Joe's Web Studio Booking System (Cloudflare Worker).
// Responsible only for receiving the incoming request and delegating it to the
// appropriate route handler. No business logic lives here.
// -----------------------------------------------------------------------------

import { handleBookingRoute } from "./booking.js";
import { jsonResponse } from "./response.js";
import { ROUTES, HTTP_METHODS } from "./constants.js";

export default {
  /**
   * Main fetch handler — the required entry point for every Cloudflare Worker.
   * @param {Request} request - Incoming HTTP request.
   * @param {object} env - Environment bindings (secrets, KV, etc.). Unused for now.
   * @param {object} ctx - Execution context (waitUntil, passThroughOnException).
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route: POST /api/v1/booking
    // `env` and `ctx` are passed through so downstream layers (routes → services)
    // have access to future bindings/secrets (Resend API key, client registry
    // lookups, database connections) without needing another refactor later.
    if (url.pathname === ROUTES.BOOKING && request.method === HTTP_METHODS.POST) {
      return handleBookingRoute(request, env, ctx);
    }

    // Fallback for any unmatched route or method.
    return jsonResponse(
      { success: false, message: "Not found." },
      404
    );
  },
};
