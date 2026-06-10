import { extractSalaryFromPosting } from "@/lib/normalization/salary";
import type { RawJobPosting } from "@/types";

/** Fill in salary fields from posting content when adapters did not provide them. */
export function enrichPostingSalary(posting: RawJobPosting): RawJobPosting {
  if (posting.salaryMin != null || posting.salaryMax != null) {
    return posting;
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
