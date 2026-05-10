import { createClient } from "@supabase/supabase-js";

/** Trimmed at runtime so CRLF / accidental spaces in `.env` cannot break auth (common on Windows). */
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
const anonKey = typeof rawKey === "string" ? rawKey.trim() : "";

const EXPECTED_BARBARA_SUPABASE_HOST = "egyruxwhldsmxhiqcekl.supabase.co";

// TEMPORARY (Barbara login debug — safe: no full anon key)
if (import.meta.env.DEV) {
  try {
    const host = url ? new URL(url).host : "";
    const hostMatchesExpected = host === EXPECTED_BARBARA_SUPABASE_HOST;
    console.info("[Barbara Login Debug] env check", {
      viteUsesImportMetaEnv: true,
      viteSupabaseUrlLoaded: url || "(missing)",
      urlHost: host || "(invalid/missing URL)",
      urlMatchesExpectedProject: hostMatchesExpected,
      anonKeyPresent: Boolean(anonKey),
      anonKeyPrefix: anonKey ? `${anonKey.slice(0, 16)}…` : "(none)",
      anonKeyLooksJwt: anonKey.startsWith("eyJ"),
      anonKeyLooksPublishable: anonKey.startsWith("sb_publishable_"),
      note: "Restart `npm run dev` after editing .env — Vite reads env only at startup.",
    });
    if (url && !hostMatchesExpected) {
      console.warn(
        "[Barbara Login Debug] URL host does not match expected project host:",
        EXPECTED_BARBARA_SUPABASE_HOST
      );
    }
  } catch {
    console.warn("[Barbara Login Debug] VITE_SUPABASE_URL is not a valid URL:", url);
  }
}

if (!url || !anonKey) {
  console.warn(
    "Barbara's Ledger: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment."
  );
}

export const supabase = createClient(url, anonKey);

/** Same string passed to `createClient` (trimmed). Use for debug only. */
export const resolvedSupabaseUrl = url;

/** Safe subset for logs (never log full key). */
export function getBarbaraSupabaseKeyDebugInfo() {
  return {
    anonKeyPresent: Boolean(anonKey),
    anonKeyPrefix: anonKey ? `${anonKey.slice(0, 16)}…` : "(none)",
  };
}
