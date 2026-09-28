export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wadiwala.net").replace(/\/$/, "");

/** Set on preview builds so a temporary address never competes with the real domain in search. */
export const NOINDEX = process.env.NEXT_PUBLIC_NOINDEX === "1";

/** Prefix a public asset path with the deploy base path (needed for raw URLs, not next/link). */
export function withBase(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
