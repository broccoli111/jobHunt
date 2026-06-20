import { extractSalaryFromPosting, normalizeSalaryAmount } from "@/lib/normalization/salary";
import type { RawJobPosting } from "@/types";

/** Fill in salary fields from posting content when adapters did not provide them. */
export function enrichPostingSalary(posting: RawJobPosting): RawJobPosting {
  const existingMin = normalizeSalaryAmount(posting.salaryMin);
  const existingMax = normalizeSalaryAmount(posting.salaryMax);

  if (existingMin != null || existingMax != null) {
    return {
      ...posting,
      salaryMin: existingMin,
      salaryMax: existingMax ?? existingMin,
      salaryCurrency: posting.salaryCurrency ?? "USD",
    };
  }

  const salary = extractSalaryFromPosting(posting.description, posting.rawPayload);
  if (salary.min == null && salary.max == null) {
    return posting;
  }

  return {
    ...posting,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
  };
}
