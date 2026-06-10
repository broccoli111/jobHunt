/** Shared heuristics for design-related job titles across ingestion adapters. */
const DESIGN_TITLE_RE =
  /designer|product design|ux\b|user experience|design system|visual design|content design|brand design|design engineer|interaction design|ux research|design ops|design operations|creative director|ui design/i;

export function isDesignJobTitle(title: string, extraContext = ""): boolean {
  const text = `${title} ${extraContext}`.toLowerCase();
  return DESIGN_TITLE_RE.test(text);
}
