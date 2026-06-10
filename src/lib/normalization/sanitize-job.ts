import { extractSalaryFromText } from "@/lib/normalization/salary";
import { normalizeJobText } from "@/lib/normalization/text";
import type { JobWithCompany } from "@/types";

function cleanText(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  return normalizeJobText(value);
}

function enrichSalaryFromDescription(
  job: JobWithCompany,
  description: string | null,
): Pick<JobWithCompany, "salary_min" | "salary_max" | "salary_currency"> {
  if (job.salary_min != null || job.salary_max != null) {
    return {
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      salary_currency: job.salary_currency,
    };
  }

  const extracted = extractSalaryFromText(description ?? "");
  if (extracted.min == null && extracted.max == null) {
    return {
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      salary_currency: job.salary_currency,
    };
  }

  return {
    salary_min: extracted.min,
    salary_max: extracted.max ?? extracted.min,
    salary_currency: extracted.currency,
  };
}

/** Ensure job text fields are plain text and salary is parsed for API responses. */
export function sanitizeJobForResponse(job: JobWithCompany): JobWithCompany {
  const description = cleanText(job.description);
  const responsibilities = cleanText(job.responsibilities);
  const qualifications = cleanText(job.qualifications);
  const salary = enrichSalaryFromDescription(job, description);

  return {
    ...job,
    description,
    responsibilities,
    qualifications,
    ...salary,
  };
}
