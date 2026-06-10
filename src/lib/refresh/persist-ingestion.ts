import { TECH_COMPANIES } from "@/config/companies";
import { estimateCompensation } from "@/lib/compensation/estimator";
import { getDatabase } from "@/lib/db";
import { getLogoUrl } from "@/lib/logos";
import { normalizeCompanyName } from "@/lib/normalization/text";
import type { ProcessedJob } from "@/lib/ingestion/orchestrator";
import { fetchStockPrices } from "@/lib/stock/fetcher";

export async function persistIngestionResult(
  jobs: ProcessedJob[],
  duplicatesRemoved: number,
  errors: string[],
): Promise<{
  jobsAdded: number;
  jobsUpdated: number;
  jobsFound: number;
}> {
  const db = getDatabase();
  const run = await db.startIngestionRun();

  let jobsAdded = 0;
  let jobsUpdated = 0;

  const companyConfigMap = new Map(
    TECH_COMPANIES.map((c) => [normalizeCompanyName(c.name), c]),
  );

  const tickersToFetch = new Set<string>();

  for (const item of jobs) {
    const config = companyConfigMap.get(normalizeCompanyName(item.posting.companyName));
    const normalizedName = normalizeCompanyName(item.posting.companyName);

    const company = await db.upsertCompany({
      name: item.posting.companyName,
      normalized_name: normalizedName,
      logo_url: getLogoUrl(item.posting.companyDomain ?? config?.domain),
      ticker: config?.ticker ?? null,
      is_public: config?.isPublic ?? false,
      careers_url: config?.careersUrl ?? null,
      domain: item.posting.companyDomain ?? config?.domain ?? null,
    });

    if (company.ticker) tickersToFetch.add(company.ticker);

    const comp = estimateCompensation(company.ticker, company.is_public, item.seniority);
    await db.upsertCompensation({
      company_id: company.id,
      level: item.seniority,
      role_family: "product_design",
      base_min: comp.baseMin,
      base_max: comp.baseMax,
      bonus_min: comp.bonusMin,
      bonus_max: comp.bonusMax,
      equity_min: comp.equityMin,
      equity_max: comp.equityMax,
      total_comp_min: comp.totalCompMin,
      total_comp_max: comp.totalCompMax,
      confidence: comp.confidence,
      source: comp.source,
    });

    const { job, created } = await db.upsertJob(company.id, {
      title: item.posting.title,
      normalized_title: item.normalizedTitle,
      description: item.posting.description,
      responsibilities: item.responsibilities,
      qualifications: item.qualifications,
      salary_min: item.posting.salaryMin ?? null,
      salary_max: item.posting.salaryMax ?? null,
      salary_currency: item.posting.salaryCurrency ?? "USD",
      location: item.posting.location,
      work_mode: item.workMode,
      seniority: item.seniority,
      role_focus: item.roleFocus,
      canonical_url: item.posting.url,
      preferred_source_type: item.preferredSourceType,
      match_percentage: item.matchPercentage,
      match_explanation: item.matchExplanation,
      created_at_source: item.posting.postedAt ?? null,
      last_seen_at: new Date().toISOString(),
      is_active: true,
    });

    if (created) jobsAdded++;
    else jobsUpdated++;

    await db.addJobSource({
      job_id: job.id,
      source_name: item.posting.sourceName,
      source_type: item.posting.sourceType,
      source_url: item.posting.url,
      discovered_at: new Date().toISOString(),
    });

    for (const alt of item.alternateUrls) {
      await db.addJobSource({
        job_id: job.id,
        source_name: alt.sourceName,
        source_type: alt.sourceType,
        source_url: alt.url,
        discovered_at: new Date().toISOString(),
      });
    }
  }

  const stockQuotes = await fetchStockPrices([...tickersToFetch]);
  const companies = await db.getCompanies();

  for (const company of companies) {
    if (!company.ticker) continue;
    const quote = stockQuotes.get(company.ticker);
    if (quote) {
      await db.upsertStockPrice({
        company_id: company.id,
        ticker: quote.ticker,
        price: quote.price,
        currency: quote.currency,
        fetched_at: new Date().toISOString(),
      });
    }
  }

  await db.setMetadata("last_refreshed_at", new Date().toISOString());

  await db.completeIngestionRun(run.id, {
    status: errors.length > 0 ? "completed" : "completed",
    jobs_found: jobs.length,
    jobs_added: jobsAdded,
    jobs_updated: jobsUpdated,
    duplicates_removed: duplicatesRemoved,
    errors,
  });

  return { jobsAdded, jobsUpdated, jobsFound: jobs.length };
}
