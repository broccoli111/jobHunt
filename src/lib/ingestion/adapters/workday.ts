import type { RawJobPosting } from "@/types";

/**
 * Workday career pages vary heavily per company and often require
 * company-specific API endpoints. This adapter is a placeholder that
 * can be extended per-company when Workday tenant URLs are known.
 *
 * Configure WORKDAY_* env vars per company for production use.
 */
export async function fetchWorkdayJobs(): Promise<RawJobPosting[]> {
  // Workday public APIs are not standardized across tenants.
  // Extend with company-specific CXS endpoints when available.
  return [];
}
