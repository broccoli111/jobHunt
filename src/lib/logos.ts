/**
 * Company logo resolution.
 * Uses Clearbit Logo API (no key required for basic usage).
 * Configure LOGO_DEV_API_KEY or CLEARBIT_API_KEY for higher rate limits if needed.
 */
export function getLogoUrl(domain: string | null | undefined): string | null {
  if (!domain) return null;
  const clean = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  // Clearbit Logo API — replace with logo.dev if you have an API key
  return `https://logo.clearbit.com/${clean}`;
}

export function getCompanyInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
