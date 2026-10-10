/**
 * ============================================================================
 * Eldro+ Multi-Affiliate Leads System — Google Apps Script
 * ============================================================================
 * 
 * SPREADSHEET:
 * https://docs.google.com/spreadsheets/d/1wn9RjaRzL6HSTxSqJs7AfOlnF6mTfmL_1tGUoLTzXyw/
 * 
 * DYNAMIC TABLE ROUTING:
 * - Dynamically routes records to a specific table (sheet tab) based on Referral ID:
 *     - If ref="rahul"        -> records go to tab "rahul"
 *     - If ref="partner_101"  -> records go to tab "partner_101"
 *     - If no ref provided    -> records go to tab "Direct_Leads"
 * - If the affiliate's tab doesn't exist yet, it is CREATED AUTOMATICALLY with
 *   styled headers, green background, and auto-sized columns.
 * - Also records all leads into a central "Master_Leads" tab for full overview.
 * - Automatically trims '+91', '91', or '0' from phone numbers (10 digits only).
 * - Saves phone numbers with apostrophe (') so Google Sheets keeps exact text.
 * ============================================================================
 */

// Target Spreadsheet ID
const SPREADSHEET_ID = "1wn9RjaRzL6HSTxSqJs7AfOlnF6mTfmL_1tGUoLTzXyw";

// Configuration
const MASTER_SHEET_NAME = "Master_Leads";
const DIRECT_SHEET_NAME = "Direct_Leads";
const TIMEZONE = "Asia/Kolkata"; // Indian Standard Time (IST)

const HEADERS = [
  "Timestamp (IST)",
  "Full Name",
  "Phone Number",
  "ആർക്ക് വേണ്ടിയിട്ടാണ് (For Whom)",
  "Referral ID",
  "Terms Consent",
  "Marketing Consent",
  "Page URL",
  "User Agent"
];

/**
 * Main Web App POST handler
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Wait up to 20 seconds for any concurrent writes
    lock.waitLock(20000);

    let data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = (e && e.parameter) || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    // Clean & normalize phone number (trims +91, 91, 0)
    const rawPhone = data.phone || "";
    const cleanPhone = normalizePhone_(rawPhone);

    // Validate 10-digit Indian mobile number
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return jsonResponse_({
        ok: false,
        error: "invalid_phone",
        message: "Phone number must be a valid 10-digit Indian mobile number."
      });
    }

    const ss = getSpreadsheet_();
    const formattedDate = Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy hh:mm:ss a");
    const referralId = String(data.referral_code || data.referral || data.affiliate || "").trim();

    // Prepare row data
    const rowData = [
      formattedDate,
      sanitize_(data.name, 80),
      "'" + cleanPhone, // Leading apostrophe prevents number truncation/scientific notation
      formatWhom_(data.for_whom),
      sanitize_(referralId || "Direct", 64),
      data.consent_terms_privacy ? "Yes" : "No",
      data.consent_marketing ? "Yes" : "No",
      sanitize_(data.page_url, 500),
      sanitize_(data.user_agent, 300)
    ];

    // 1. Get or create the dynamic affiliate table
    const targetTableName = getAffiliateTableName_(referralId);
    const affiliateSheet = getOrCreateSheetTab_(ss, targetTableName);
    affiliateSheet.appendRow(rowData);

    // 2. Also record in the Master_Leads tab (if different)
    if (targetTableName !== MASTER_SHEET_NAME) {
      const masterSheet = getOrCreateSheetTab_(ss, MASTER_SHEET_NAME);
      masterSheet.appendRow(rowData);
    }

    return jsonResponse_({
      ok: true,
      table: targetTableName,
      message: "Lead successfully recorded in table: " + targetTableName
    });

  } catch (error) {
    console.error("doPost error: ", error);
    return jsonResponse_({
      ok: false,
      error: "server_error",
      message: error.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Health check GET endpoint
 */
function doGet(e) {
  return jsonResponse_({
    ok: true,
    service: "eldroplus-multi-affiliate-sheets",
    spreadsheetId: SPREADSHEET_ID,
    status: "active",
    timestamp: new Date().toISOString()
  });
}

/**
 * TEST FUNCTION:
 * Run this directly in the Apps Script editor toolbar to verify dynamic tab creation!
 */
function testDynamicAffiliateRouting() {
  const ss = getSpreadsheet_();
  Logger.log("Connected to Spreadsheet: " + ss.getName());

  // Test 1: Affiliate "rahul"
  doPost({
    postData: {
      contents: JSON.stringify({
        name: "Rahul Customer",
        phone: "+91 9876543210",
        for_whom: "for_me",
        referral_code: "rahul",
        consent_terms_privacy: true,
        consent_marketing: false,
        page_url: "https://www.eldroplus.com/?ref=rahul"
      })
    }
  });

  // Test 2: Affiliate "partner_kerala"
  doPost({
    postData: {
      contents: JSON.stringify({
        name: "Anand Customer",
        phone: "+91 9847123456",
        for_whom: "for_parents",
        referral_code: "partner_kerala",
        consent_terms_privacy: true,
        consent_marketing: true,
        page_url: "https://www.eldroplus.com/?ref=partner_kerala"
      })
    }
  });

  Logger.log("Test finished! Check your Google Sheet for 'rahul', 'partner_kerala', and 'Master_Leads' tabs.");
}

/* ============================================================================
 * Internal Helpers
 * ============================================================================ */

function getSpreadsheet_() {
  if (SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch (e) {
      console.warn("Could not open by ID, falling back to active spreadsheet: " + e.message);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Computes a sanitized table (tab) name from the referral ID
 */
function getAffiliateTableName_(referralId) {
  if (!referralId) {
    return DIRECT_SHEET_NAME;
  }
  // Remove characters forbidden in Google Sheets tab names: \ / ? * [ ] :
  let cleanName = referralId
    .replace(/[\\\/\?\*\[\]\:]/g, "_")
    .replace(/\s+/g, "_")
    .trim()
    .slice(0, 50);

  return cleanName || DIRECT_SHEET_NAME;
}

/**
 * Finds an existing sheet tab (case-insensitive) or creates a new one with styled headers
 */
function getOrCreateSheetTab_(ss, tableName) {
  const existingSheets = ss.getSheets();
  const lowerName = tableName.toLowerCase();

  // Search case-insensitively so "Rahul" and "rahul" use the same tab
  for (let i = 0; i < existingSheets.length; i++) {
    if (existingSheets[i].getName().toLowerCase() === lowerName) {
      return existingSheets[i];
    }
  }

  // If no tab matches, create a new one dynamically
  const newSheet = ss.insertSheet(tableName);

  // Initialize styled header row
  newSheet.appendRow(HEADERS);
  const headerRange = newSheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight("bold");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setBackground("#587C69"); // Eldro+ Forest Green
  headerRange.setHorizontalAlignment("center");
  newSheet.setRowHeight(1, 36);
  newSheet.setFrozenRows(1);

  // Auto-fit column widths
  for (let col = 1; col <= HEADERS.length; col++) {
    newSheet.autoResizeColumn(col);
  }

  return newSheet;
}

/**
 * Trims '+91', '91', or leading '0' to output pure 10-digit mobile number
 */
function normalizePhone_(value) {
  let p = String(value || "").trim().replace(/[\s\-()]/g, "");
  if (p.indexOf("+91") === 0) {
    p = p.slice(3);
  } else if (p.length === 12 && p.indexOf("91") === 0) {
    p = p.slice(2);
  } else if (p.length === 11 && p.charAt(0) === "0") {
    p = p.slice(1);
  }
  return p.replace(/\D/g, "");
}

function formatWhom_(value) {
  const v = String(value || "").trim();
  if (v === "for_me") return "എനിക്ക് വേണ്ടി";
  if (v === "for_parents") return "Parents";
  return v || "";
}

function sanitize_(value, maxLength) {
  let s = String(value == null ? "" : value).trim().slice(0, maxLength || 200);
  if (/^[=+\-@]/.test(s)) {
    s = "'" + s; // Neutralize formula injection
  }
  return s;
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
