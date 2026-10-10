"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { isValidIndianMobile, normalizePhone } from "@/lib/phone";

const REF_PARAMS = ["ref", "referral", "referral_code", "affiliate", "aff", "partner", "code", "table"];
const REF_STORAGE_KEY = "eldro_referral_code";
const WA_PHONE = "919495983439";
const SITE = "https://www.eldroplus.com";

const sanitizeRef = (v: string | null) => String(v ?? "").trim().replace(/[^\w-]/g, "").slice(0, 64);

export default function AffiliateForm() {
  const [referral, setReferral] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "redirecting">("idle");

  const phoneRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Referral code from query param → hidden field (persisted for the session)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let code = "";
    for (const key of REF_PARAMS) {
      code = sanitizeRef(params.get(key));
      if (code) break;
    }
    try {
      if (code) sessionStorage.setItem(REF_STORAGE_KEY, code);
      else code = sessionStorage.getItem(REF_STORAGE_KEY) ?? "";
    } catch {
      /* storage unavailable */
    }
    if (code) {
      queueMicrotask(() => setReferral(code));
    }
  }, []);

  const validatePhone = (v = phone) => {
    const p = normalizePhone(v);
    if (!p) return setPhoneError("Please enter your phone number."), false;
    if (!isValidIndianMobile(p)) return setPhoneError("Please enter a valid 10-digit mobile number."), false;
    setPhoneError("");
    return true;
  };

  const onPhoneChange = (raw: string) => {
    // Trim +91/91/0 and keep up to 10 digits
    const digits = normalizePhone(raw).slice(0, 10);
    setPhone(digits);
    if (phoneError) validatePhone(digits);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const okPhone = validatePhone();
    if (!okPhone) return phoneRef.current?.focus();

    setStatus("loading");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizePhone(phone),
          referral_code: referral,
          consent_terms_privacy: true,
          page_url: window.location.href,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      // Successful submission -> construct WhatsApp URL and redirect immediately
      setStatus("redirecting");
      const text = referral
        ? `I'm interested, please share the details. (${referral})`
        : `I'm interested, please share the details.`;
      const waUrl = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(text)}`;

      window.location.href = waUrl;
    } catch (err) {
      console.error(err);
      setStatus("idle");
      setPhoneError(
        err instanceof Error && err.message === "invalid_phone"
          ? "Please enter a valid 10-digit mobile number."
          : "Something went wrong. Please try again."
      );
    }
  };

  const loading = status === "loading" || status === "redirecting";

  return (
    <div className="form-card reveal" id="join" ref={cardRef}>
      <div className="form-head">
        <p className="form-notice" lang="ml">
          കൂടുതൽ വിവരങ്ങൾക്കായി ഫോൺ നമ്പർ നൽകി ഫോം സബ്മിറ്റ് ചെയ്യൂ.
        </p>
      </div>

      <form id="affiliate-form" noValidate onSubmit={onSubmit}>
        {/* Hidden referral code (populated from ?ref= query param) */}
        <input type="hidden" name="referral_code" id="referral_code" value={referral} readOnly />

        {/* Phone number field (only visible input) */}
        <div className={`field${phoneError ? " has-error" : ""}`}>
          <label htmlFor="phone">
            Phone number <span className="req" aria-hidden="true">*</span>
          </label>
          <div className="phone-wrap">
            <span className="prefix">🇮🇳 +91</span>
            <input
              ref={phoneRef}
              type="tel"
              id="phone"
              name="phone"
              placeholder="10-digit mobile number"
              inputMode="numeric"
              autoComplete="tel-national"
              required
              aria-invalid={!!phoneError}
              aria-describedby="phone-error"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
            />
          </div>
          <p className="error-msg" id="phone-error" role="alert">
            {phoneError}
          </p>
        </div>

        {/* Connect on WhatsApp submit button */}
        <button
          type="submit"
          className={`btn btn-whatsapp btn-block${loading ? " is-loading" : ""}`}
          id="submit-btn"
          disabled={loading}
        >
          <svg className="wa-icon" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.196 8.196 0 012.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.45 0-2.87-.38-4.12-1.11l-.3-.17-3.12.82.83-3.04-.19-.31a8.214 8.214 0 01-1.25-4.43c0-4.54 3.7-8.24 8.24-8.24zm-3.53 4.29c-.19 0-.42.07-.63.3-.22.23-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.39 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.47-.28-.25-.13-1.48-.73-1.71-.81-.23-.09-.4-.13-.57.13-.17.25-.65.81-.8 1-.15.18-.3.2-.55.08-.25-.13-1.07-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.43.12-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.57-1.38-.79-1.9-.21-.5-.42-.43-.58-.44l-.49-.01z" />
          </svg>
          <span className="btn-label">
            {status === "redirecting" ? "Opening WhatsApp…" : loading ? "Connecting…" : "Chat on WhatsApp"}
          </span>
          <span className="spinner" aria-hidden="true" />
        </button>

        {/* Legal notice and safe badge */}
        <p className="form-disclaimer">
          By clicking Chat on WhatsApp, you agree to the{" "}
          <a href={`${SITE}/terms-conditions`} target="_blank" rel="noopener">
            Terms &amp; Conditions
          </a>{" "}
          and{" "}
          <a href={`${SITE}/privacy-policy`} target="_blank" rel="noopener">
            Privacy Policy
          </a>
          .
        </p>

        <p className="secure-note">🔒 Your details are safe with us and never sold.</p>
      </form>
    </div>
  );
}
