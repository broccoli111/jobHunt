import { stripHtml } from "@/lib/normalization/text";
import type { JobWithCompany } from "@/types";

function cleanText(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  return stripHtml(value);
}

/** Ensure job text fields are plain text for API responses and UI. */
export function sanitizeJobForResponse(job: JobWithCompany): JobWithCompany {
  return {
    ...job,
    description: cleanText(job.description),
    responsibilities: cleanText(job.responsibilities),
    qualifications: cleanText(job.qualifications),
  };
}
