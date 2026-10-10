import { NextResponse, type NextRequest } from "next/server";
import { isValidIndianMobile, normalizePhone } from "@/lib/phone";
import fs from "fs/promises";
import path from "path";

type LeadBody = {
  name?: string;
  phone?: string;
  for_whom?: string;
  referral_code?: string;
  consent_terms_privacy?: boolean;
  consent_marketing?: boolean;
  page_url?: string;
};

const WHOM = new Set(["for_me", "for_parents", ""]);
const CSV_FILE = path.join(process.cwd(), "leads.csv");
const CSV_HEADERS = "Timestamp,Name,Phone,For Whom,Referral Code,Terms Consent,Marketing Consent,Page URL,User Agent\n";

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

async function saveLeadLocally(lead: {
  timestamp: string;
  name: string;
  phone: string;
  for_whom: string;
  referral_code: string;
  consent_terms_privacy: boolean;
  consent_marketing: boolean;
  page_url: string;
  user_agent: string;
}) {
  try {
    const exists = await fs
      .access(CSV_FILE)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      await fs.writeFile(CSV_FILE, CSV_HEADERS, "utf8");
    }
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const whomLabel =
      lead.for_whom === "for_me"
        ? "എനിക്ക് വേണ്ടി"
        : lead.for_whom === "for_parents"
        ? "Parents"
        : "";

    const row = [
      escapeCsv(lead.timestamp),
      escapeCsv(lead.name),
      escapeCsv(lead.phone),
      escapeCsv(whomLabel),
      escapeCsv(lead.referral_code),
      escapeCsv(lead.consent_terms_privacy ? "Yes" : "No"),
      escapeCsv(lead.consent_marketing ? "Yes" : "No"),
      escapeCsv(lead.page_url),
      escapeCsv(lead.user_agent),
    ].join(",") + "\n";

    await fs.appendFile(CSV_FILE, row, "utf8");
    console.info(`[Eldro+] Lead saved locally to leads.csv: ${lead.phone} (${lead.name || "No name"})`);
  } catch (err) {
    console.error("[Eldro+] Failed to save lead to leads.csv:", err);
  }
}

export async function POST(req: NextRequest) {
  const scriptUrl = process.env.APPS_SCRIPT_URL;
  const secret = process.env.APPS_SCRIPT_SECRET ?? "";

  let body: LeadBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Trim +91, 91, or leading 0 to guarantee a clean 10-digit mobile number
  const phone = normalizePhone(body.phone);
  if (!isValidIndianMobile(phone)) {
    return NextResponse.json({ ok: false, error: "invalid_phone" }, { status: 400 });
  }
  if (body.consent_terms_privacy !== true) {
    return NextResponse.json({ ok: false, error: "consent_required" }, { status: 400 });
  }

  const forWhom = str(body.for_whom, 20);
  const now = new Date().toISOString();

  const payload = {
    secret,
    timestamp: now,
    name: str(body.name, 80),
    phone, // guaranteed 10 digits without +91
    for_whom: WHOM.has(forWhom) ? forWhom : "",
    referral_code: str(body.referral_code, 64).replace(/[^\w-]/g, ""),
    consent_terms_privacy: true,
    consent_marketing: body.consent_marketing === true,
    page_url: str(body.page_url, 500),
    user_agent: str(req.headers.get("user-agent"), 300),
  };

  // 1. Always save lead locally so no submission is EVER lost
  await saveLeadLocally(payload);

  // 2. If APPS_SCRIPT_URL is not provided, return success
  if (!scriptUrl) {
    console.info("[Eldro+ Dev Mode] Lead saved locally (APPS_SCRIPT_URL not set).");
    return NextResponse.json({ ok: true, saved: "local" });
  }

  // 3. Forward to Google Apps Script
  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
      cache: "no-store",
    });

    const text = await res.text();
    let data: { ok?: boolean; error?: string } | null = null;
    try {
      data = JSON.parse(text);
    } catch {
      // If response is HTML, Apps Script likely blocked with 403 or auth page
    }

    if (res.ok && data?.ok) {
      console.info("[Eldro+] Lead successfully written to Google Sheet!");
      return NextResponse.json({ ok: true, sheet: true });
    }

    console.warn(
      `[Eldro+ Warning] Google Apps Script responded with HTTP ${res.status}. Lead is safely saved in leads.csv.\n` +
      `Check your Google Apps Script deployment: ensure 'Who has access' is set to 'Anyone'.`
    );

    // Return success to the user so the UI is not blocked by Google permission issues
    return NextResponse.json({ ok: true, sheet: false, fallback: "local_csv" });
  } catch (err) {
    console.error("[Eldro+] Google Apps Script unreachable. Lead is safely saved in leads.csv.", err);
    return NextResponse.json({ ok: true, sheet: false, fallback: "local_csv" });
  }
}
