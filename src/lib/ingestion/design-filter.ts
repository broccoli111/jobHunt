/** Shared heuristics for design-related job titles across ingestion adapters. */

const DESIGN_TITLE_RE =
  /designer|product design|ux\b|user experience|design system|visual design|content design|brand design|interaction design|ux research|design ops|design operations|creative director|ui design|head of design|director of design|design lead|design manager/i;

/** Hard block: any job title containing "engineer" (e.g. UX Engineer, Design Systems Engineer). */
const ENGINEER_IN_TITLE_RE = /engineer/i;

export function isEngineeringJobTitle(title: string): boolean {
  return ENGINEER_IN_TITLE_RE.test(title.trim());
}

export function isDesignJobTitle(title: string, extraContext = ""): boolean {
  if (isEngineeringJobTitle(title)) {
    return false;
  }

  const text = `${title} ${extraContext}`.toLowerCase();
  return DESIGN_TITLE_RE.test(text);
}
