// Joe's Web Studio Booking Platform
//
// File:
// emailService.js
//
// Responsibility:
// Delivers notifications via the Resend email provider.
//
// Author:
// Joe's Web Studio
//
// Version:
// 1.0.0

// emailService.js
// -----------------------------------------------------------------------------
// EMAIL SERVICE
//
// Responsibility: DELIVER an already-built Notification object. This service
// does not decide what a notification says or who it goes to — that decision
// already happened upstream. Its only job is to hand a finished Notification
// off to a real email provider and translate the result into a standardized
// response shape the rest of the app can rely on.
//
// HOW THIS FITS INTO THE BOOKING WORKFLOW
// The booking notification pipeline is split into three deliberately
// separate responsibilities, each owned by its own file:
//
//   1. bookingService.js       → COORDINATES the workflow. Validates the
//                                 incoming booking, and (in a future
//                                 milestone) will call notificationService.js
//                                 to build a notification, then call
//                                 emailService.js to deliver it.
//
//   2. notificationService.js  → BUILDS the notification. Given a client
//                                 record and booking data, it assembles a
//                                 plain Notification object (type, recipients,
//                                 subject, html, text, replyTo, metadata).
//                                 It knows nothing about how that object will
//                                 be delivered, and has never heard of Resend.
//
//   3. emailService.js (here)  → SENDS the notification. Given a Notification
//                                 object and `env`, it talks to whatever
//                                 email provider is configured — today, that
//                                 provider is Resend. This is the ONLY file
//                                 in the entire project that knows Resend
//                                 exists.
//
// PROVIDER ISOLATION
// bookingService.js and notificationService.js remain fully provider-
// agnostic. Neither imports anything from this file's internals, neither
// references "Resend" anywhere, and neither will need to change if the
// provider is swapped later. The only contract the rest of the app depends
// on is the function signature below: `sendEmail(notification, env)` in,
// a standardized success/failure object out.
//
// SWAPPING PROVIDERS LATER (Amazon SES, Postmark, Mailgun, etc.)
// Everything Resend-specific in this file lives behind the internal
// `sendViaResend` function and the `RESEND_API_URL` constant. To replace
// Resend with another provider:
//   1. Write a new internal function (e.g. `sendViaPostmark`) that accepts
//      the same (notification, env) shape and returns the same standardized
//      success/failure object.
//   2. Point the exported `sendEmail` function at the new internal function.
//   3. Update the `provider` field in the returned object.
// No other file in the project needs to change, because none of them know
// or care which provider is behind `sendEmail`.
// -----------------------------------------------------------------------------

import { ERROR_CODES } from "./constants.js";

/** Resend's transactional email API endpoint. */
const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Default "From" address used for all outgoing booking notifications.
 *
 * PLACEHOLDER: Resend requires a verified sending domain. This should
 * eventually be configurable per-client (e.g. sourced from the client
 * registry) once each client's sending domain is verified with Resend.
 * For this foundation, a single studio-wide sender is used.
 */
const DEFAULT_FROM_ADDRESS = "Joe's Web Studio <bookings@joeswebstudio.com>";

/**
 * Friendly, user-safe messages keyed by error code. Raw provider error text
 * (from Resend or any future provider) is never surfaced to callers —
 * only one of these pre-approved messages is returned.
 */
const FRIENDLY_ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_API_KEY]:
    "Email delivery is not properly configured. Please contact support.",
  [ERROR_CODES.EMAIL_DELIVERY_FAILED]:
    "We couldn't deliver this notification right now. Please try again shortly.",
  [ERROR_CODES.INTERNAL_SERVER_ERROR]:
    "Something went wrong while sending this notification.",
};

/**
 * Builds a standardized failure object. Centralized so every failure path
 * below (missing key, invalid key, network failure, unexpected response)
 * returns an identically shaped object.
 *
 * @param {string} errorCode - One of ERROR_CODES.
 * @returns {{ success: boolean, provider: string, errorCode: string, timestamp: string, message: string }}
 */
function buildFailureResponse(errorCode) {
  return {
    success: false,
    provider: "resend",
    errorCode,
    timestamp: new Date().toISOString(),
    message:
      FRIENDLY_ERROR_MESSAGES[errorCode] ||
      FRIENDLY_ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
  };
}

/**
 * Builds a standardized success object.
 *
 * @param {string} providerMessageId - The ID Resend returned for this send.
 * @returns {{ success: boolean, provider: string, providerMessageId: string, timestamp: string, message: string }}
 */
function buildSuccessResponse(providerMessageId) {
  return {
    success: true,
    provider: "resend",
    providerMessageId,
    timestamp: new Date().toISOString(),
    message: "Email successfully delivered.",
  };
}

/**
 * Maps a Notification object (from notificationService.js) onto the request
 * body shape Resend's API expects. This is the ONE place in the project
 * where "our" data shape and "Resend's" data shape meet.
 *
 * @param {object} notification - Notification object with recipients,
 *   subject, html, text, replyTo, metadata.
 * @returns {object} Request body for POST https://api.resend.com/emails
 */
function mapNotificationToResendPayload(notification) {
  const payload = {
    from: DEFAULT_FROM_ADDRESS,
    to: notification.recipients,
    subject: notification.subject,
    html: notification.html,
    text: notification.text,
  };

  // Resend accepts `reply_to` as an optional field — only include it when
  // the notification actually carries a customer email to reply to.
  if (notification.replyTo) {
    payload.reply_to = notification.replyTo;
  }

  // Best-effort mapping of metadata onto Resend's `tags` field, so
  // context like clientId/clientSlug is attached to the send for future
  // debugging in Resend's own dashboard. Wrapped defensively — malformed
  // metadata should never prevent an email from being sent.
  if (notification.metadata && typeof notification.metadata === "object") {
    try {
      const tags = Object.entries(notification.metadata)
        .filter(([, value]) => typeof value === "string")
        .map(([name, value]) => ({ name, value }));

      if (tags.length > 0) {
        payload.tags = tags;
      }
    } catch {
      // Metadata mapping is a nice-to-have, not a requirement — ignore
      // failures here rather than blocking the send.
    }
  }

  return payload;
}

/**
 * Sends a notification via the Resend API.
 *
 * This is the only function in the entire project that knows Resend exists.
 * It is intentionally kept internal (not exported) — callers everywhere else
 * only ever use the exported `sendEmail` function below.
 *
 * @param {object} notification - Notification object from notificationService.js.
 * @param {object} env - Cloudflare Worker environment bindings.
 * @returns {Promise<object>} Standardized success or failure object.
 */
async function sendViaResend(notification, env) {
  const apiKey = env?.RESEND_API_KEY;

  // --- Missing API key -------------------------------------------------
  // No key configured at all — this is a configuration problem, not a
  // transient failure, so it's treated the same as an invalid key.
  if (!apiKey) {
    return buildFailureResponse(ERROR_CODES.INVALID_API_KEY);
  }

  const payload = mapNotificationToResendPayload(notification);

  let response;
  try {
    response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        // Resend authenticates requests via a Bearer token. The key is
        // read exclusively from `env` — never hardcoded — and is only ever
        // used here, inside this one function.
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // --- Network failure -------------------------------------------------
    // fetch() itself threw (DNS failure, connection reset, etc.) rather
    // than returning a response. No raw error detail is surfaced.
    return buildFailureResponse(ERROR_CODES.EMAIL_DELIVERY_FAILED);
  }

  // --- Invalid API key ---------------------------------------------------
  // Resend returns 401/403 when the key is rejected.
  if (response.status === 401 || response.status === 403) {
    return buildFailureResponse(ERROR_CODES.INVALID_API_KEY);
  }

  // --- Any other non-success status --------------------------------------
  if (!response.ok) {
    return buildFailureResponse(ERROR_CODES.EMAIL_DELIVERY_FAILED);
  }

  let json;
  try {
    json = await response.json();
  } catch {
    // --- Unexpected provider response --------------------------------------
    // Resend responded with a 2xx status but the body wasn't valid JSON.
    return buildFailureResponse(ERROR_CODES.EMAIL_DELIVERY_FAILED);
  }

  // --- Unexpected provider response --------------------------------------
  // A 2xx response is expected to include an `id` — if it doesn't, treat
  // it as an unrecognized/unexpected shape rather than assuming success.
  if (!json || typeof json.id !== "string") {
    return buildFailureResponse(ERROR_CODES.EMAIL_DELIVERY_FAILED);
  }

  return buildSuccessResponse(json.id);
}

/**
 * Sends an already-built notification.
 *
 * This is the ONLY function the rest of the application should ever call.
 * It contains no business logic (no validation, no content building, no
 * client lookup) — it only delivers. Internally it currently delegates to
 * Resend, but no caller depends on that fact.
 *
 * @param {object} notification - A Notification object as produced by
 *   notificationService.js (see buildBookingNotification). Expected to carry
 *   `recipients`, `subject`, `html`, `text`, `replyTo`, and `metadata`.
 * @param {object} env - Cloudflare Worker environment bindings.
 * @param {string} [env.RESEND_API_KEY] - Secret used to authenticate with
 *   Resend. Read here and passed through internally — never hardcoded,
 *   never logged, never exposed outside this file.
 * @returns {Promise<object>} A standardized success or failure object (see
 *   buildSuccessResponse / buildFailureResponse above).
 */
export async function sendEmail(notification, env) {
  try {
    return await sendViaResend(notification, env);
  } catch {
    // Absolute last resort — something failed outside the specific cases
    // already handled inside sendViaResend (e.g. a mapping bug). Still
    // never throws, and still never leaks internal error detail.
    return buildFailureResponse(ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
}
