/**
 * Booking refresh trigger for Google Sheets.
 *
 * This file is separate from the booking web app handlers (doGet/doPost).
 * Use it in a separate Apps Script project or in a bound sheet script.
 *
 * Setup:
 * 1. Set BOOKING_REFRESH_ENDPOINT to your Next.js endpoint.
 * 2. Set SPREADSHEET_ID if you use a standalone script.
 * 3. Run setupBookingRefreshTrigger() once to create the installable onEdit trigger.
 */

const BOOKING_REFRESH_ENDPOINT = "https://your-domain.com/api/bookings?refresh=1&nocooldown=1";
const SPREADSHEET_ID = "PASTE_SPREADSHEET_ID_HERE";
const REFRESH_COOLDOWN_MS = 30 * 1000;
const LAST_PING_KEY = "last_booking_refresh_ping_at";

function setupBookingRefreshTrigger() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === "handleBookingSheetEdit")
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("handleBookingSheetEdit").forSpreadsheet(spreadsheet).onEdit().create();
}

function handleBookingSheetEdit(e) {
  if (!e || !e.range) return;

  if (shouldSkipRefresh_()) return;

  pingBookingRefresh_();
}

function shouldSkipRefresh_() {
  const props = PropertiesService.getScriptProperties();
  const lastPingAt = Number(props.getProperty(LAST_PING_KEY) || "0");
  const now = Date.now();

  if (now - lastPingAt < REFRESH_COOLDOWN_MS) {
    return true;
  }

  props.setProperty(LAST_PING_KEY, String(now));
  return false;
}

function pingBookingRefresh_() {
  UrlFetchApp.fetch(BOOKING_REFRESH_ENDPOINT, {
    method: "get",
    muteHttpExceptions: true,
    headers: {
      "Cache-Control": "no-cache",
    },
  });
}

function testPingBookingRefresh() {
  pingBookingRefresh_();
}
