/** Shared heuristics for design-related job titles across ingestion adapters. */

const DESIGN_TITLE_RE =
  /designer|product design|ux\b|user experience|design system|visual design|content design|brand design|interaction design|ux research|design ops|design operations|creative director|ui design|head of design|director of design|design lead|design manager/i;

/**
 * Engineering / IC-dev titles we never ingest, even when "design" appears in the title
 * (e.g. "Software Engineer, Design Systems", "Design Release Engineer", "UX Engineer").
 */
const ENGINEERING_TITLE_RE =
  /\b(?:(?:staff|principal|senior|lead|sr\.?|junior|jr\.?|mid(?:level)?)\s+)?(?:software|hardware|firmware|embedded|platform|backend|back-end|frontend|front-end|full[\s-]?stack|site reliability|devops|dev ops|data|ml|machine learning|infrastructure|systems|security|cloud|mobile|ios|android|qa|quality|test|validation|release|manufacturing|mechanical|electrical|civil|structural|process|application|solutions|sales|support|field|design)\s+engineer\b|\bengineer(?:ing)?\b|\bdeveloper\b|\bprogrammer\b|\b(?:swe|sre)\b|\bsoftware\s+developer\b|\bweb\s+developer\b|\btech(?:nical)?\s+lead\b(?!\s+designer)/i;

export function isEngineeringJobTitle(title: string): boolean {
  return ENGINEERING_TITLE_RE.test(title.trim());
}

export function isDesignJobTitle(title: string, extraContext = ""): boolean {
  if (isEngineeringJobTitle(title)) {
    return false;
  }

  const text = `${title} ${extraContext}`.toLowerCase();
  return DESIGN_TITLE_RE.test(text);
}
