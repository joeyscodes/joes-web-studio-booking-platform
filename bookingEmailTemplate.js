// Joe's Web Studio Booking Platform
//
// File:
// bookingEmailTemplate.js
//
// Responsibility:
// Renders the subject/html/text content for a booking notification email.
//
// Author:
// Joe's Web Studio
//
// Version:
// 1.0.0

// bookingEmailTemplate.js
// -----------------------------------------------------------------------------
// BOOKING EMAIL TEMPLATE
//
// Responsibility: render the CONTENT of a booking notification email —
// nothing else. Given branding information and booking data, this file
// decides what the subject line, HTML body, and plain-text body say.
//
// NAMING NOTE (flat repository structure)
// This platform will eventually send several kinds of email — booking
// confirmations, reminders, cancellations, invoices, welcome emails,
// password resets, and more. Ordinarily, each of those renderers would live
// in its own file under a `templates/` directory to keep that growth
// organized. This repository is deployed via GitHub's mobile "Upload file"
// flow, which cannot create subfolders — every file lives at the repo root.
// To preserve the same organizing idea without a folder, each template file
// is named with its email type as a prefix (e.g. `bookingEmailTemplate.js`,
// and later `reminderEmailTemplate.js`, `cancellationEmailTemplate.js`,
// etc.), so they group together alphabetically and stay easy to tell apart
// even sitting flat alongside every other file. If this project ever moves
// to a workflow that supports subfolders, these can be moved under
// `templates/` with only import-path updates required — nothing about this
// file's logic would need to change.
//
// WHAT THIS FILE DOES NOT KNOW ABOUT
// This renderer has no knowledge of:
//   - recipients / destinationEmails  → notificationService.js's job
//   - replyTo                          → notificationService.js's job
//   - metadata, notification type, createdAt → notificationService.js's job
//   - API keys, booking status, or any other client business logic
//   - how the email is delivered (Resend, SES, etc.)  → emailService.js's job
//
// It receives only two things: a small `branding` object (the subset of
// client information actually needed to render an email — today just
// `businessName`) and the booking data. This narrow input is deliberate: it
// is how a future milestone will discover exactly which fields belong in a
// future "Brand Profile" model, rather than guessing upfront.
//
// CURRENT SCOPE
// The output below is intentionally simple — the same placeholder-style
// content notificationService.js used to build inline. No visual redesign
// happens here; this is purely an architectural move so notificationService.js
// delegates rendering instead of doing it itself.
// -----------------------------------------------------------------------------

/**
 * @typedef {object} BookingEmailBranding
 * @property {string} businessName
 *   The display name of the business this booking belongs to, used in the
 *   subject line and body copy (e.g. "Belle Vie Salon & Spa"). This is the
 *   only branding field this renderer currently consumes — if a future
 *   milestone adds more (logo URL, brand color, etc.), they'd be added to
 *   this object, not to a full client record.
 */

/**
 * @typedef {object} RenderedEmail
 * @property {string} subject - The email subject line.
 * @property {string} html - The HTML body content.
 * @property {string} text - The plain-text body content.
 */

/**
 * Builds the subject line for a booking notification email.
 * Kept as its own small function so subject formatting can be adjusted or
 * localized later without touching the rest of the renderer.
 *
 * @param {BookingEmailBranding} branding
 * @returns {string} e.g. "New Appointment Booking - Belle Vie Salon & Spa"
 */
function renderSubject(branding) {
  return `New Appointment Booking - ${branding.businessName}`;
}

/**
 * Builds the HTML body for a booking notification email.
 *
 * Intentionally simple placeholder-style markup for this milestone — no
 * visual design pass yet. A future milestone will replace the body of this
 * function with the premium branded template, once the Brand Profile model
 * (Milestone 10B) defines what branding values are available to use.
 *
 * @param {BookingEmailBranding} branding
 * @param {object} bookingData - Validated booking payload.
 * @returns {string} HTML string.
 */
function renderHtml(branding, bookingData) {
  return `
    <!-- PLACEHOLDER CONTENT: premium branded template arrives in a future milestone -->
    <div>
      <p>New booking request for <strong>${branding.businessName}</strong>.</p>
      <p>[PLACEHOLDER] Booking details will be formatted here once the
      premium branded email template is implemented.</p>
      <pre>${JSON.stringify(bookingData, null, 2)}</pre>
    </div>
  `.trim();
}

/**
 * Builds the plain-text body for a booking notification email. Mirrors
 * `renderHtml` for email clients that render text-only. Same "not final"
 * status — see that function's comments.
 *
 * @param {BookingEmailBranding} branding
 * @param {object} bookingData - Validated booking payload.
 * @returns {string} Plain-text string.
 */
function renderText(branding, bookingData) {
  return [
    "[PLACEHOLDER CONTENT — premium branded template arrives in a future milestone]",
    `New booking request for ${branding.businessName}.`,
    "Booking details:",
    JSON.stringify(bookingData, null, 2),
  ].join("\n");
}

/**
 * Renders the subject/html/text content for a booking notification email.
 *
 * This is the ONLY export of this file, and the ONLY thing this file does.
 * It has no knowledge of recipients, reply-to addresses, metadata, delivery,
 * or any client business logic — it receives a narrow `branding` object and
 * the booking data, and returns rendered content. Nothing else.
 *
 * @param {BookingEmailBranding} branding - The branding information this
 *   renderer needs. Currently just `{ businessName }` — deliberately narrow
 *   so Milestone 10B can design the Brand Profile model around exactly what
 *   this function (and future templates) actually consume.
 * @param {object} bookingData - The validated booking payload.
 * @returns {RenderedEmail} `{ subject, html, text }` — nothing more.
 */
export function renderBookingEmail(branding, bookingData) {
  return {
    subject: renderSubject(branding),
    html: renderHtml(branding, bookingData),
    text: renderText(branding, bookingData),
  };
}
