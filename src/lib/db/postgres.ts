import postgres from "postgres";
import type {
  Company,
  CompensationEstimate,
  IngestionRun,
  Job,
  JobFilters,
  JobSource,
  JobWithCompany,
  StockPrice,
} from "@/types";

export class PostgresDatabase {
  private sql: ReturnType<typeof postgres>;

  constructor(connectionString: string) {
    this.sql = postgres(connectionString, { ssl: connectionString.includes("supabase") ? "require" : undefined });
  }

  async getCompanies(): Promise<Company[]> {
    return this.sql<Company[]>`SELECT * FROM companies ORDER BY name`;
  }

  async getCompanyByNormalizedName(name: string): Promise<Company | null> {
    const rows = await this.sql<Company[]>`
      SELECT * FROM companies WHERE normalized_name = ${name} LIMIT 1
    `;
    return rows[0] ?? null;
  }

  async upsertCompany(data: Omit<Company, "id"> & { id?: string }): Promise<Company> {
    const rows = await this.sql<Company[]>`
      INSERT INTO companies (name, normalized_name, logo_url, ticker, is_public, careers_url, domain)
      VALUES (${data.name}, ${data.normalized_name}, ${data.logo_url}, ${data.ticker}, ${data.is_public}, ${data.careers_url}, ${data.domain})
      ON CONFLICT (normalized_name) DO UPDATE SET
        name = EXCLUDED.name,
        logo_url = EXCLUDED.logo_url,
        ticker = EXCLUDED.ticker,
        is_public = EXCLUDED.is_public,
        careers_url = EXCLUDED.careers_url,
        domain = EXCLUDED.domain,
        updated_at = NOW()
      RETURNING *
    `;
    return rows[0];
  }

  async getJobs(filters: JobFilters = {}): Promise<JobWithCompany[]> {
    const conditions: string[] = ["j.is_active = true"];
    const params: unknown[] = [];

    if (filters.workMode?.length) {
      params.push(filters.workMode);
      conditions.push(`j.work_mode = ANY($${params.length})`);
    }
    if (filters.seniority?.length) {
      params.push(filters.seniority);
      conditions.push(`j.seniority = ANY($${params.length})`);
    }
    if (filters.companies?.length) {
      params.push(filters.companies);
      conditions.push(`j.company_id = ANY($${params.length}::uuid[])`);
    }
    if (filters.salaryVisibility === "has_salary") {
      conditions.push(`(j.salary_min IS NOT NULL OR j.salary_max IS NOT NULL)`);
    }
    if (filters.salaryVisibility === "no_salary") {
      conditions.push(`j.salary_min IS NULL AND j.salary_max IS NULL`);
    }
    if (filters.publicOnly === true) {
      conditions.push(`c.is_public = true`);
    }
    if (filters.minMatch != null) {
      params.push(filters.minMatch);
      conditions.push(`j.match_percentage >= $${params.length}`);
    }

    const sortBy = filters.sortBy ?? "match_percentage";
    const sortOrder = filters.sortOrder ?? "desc";
    const sortColumn =
      sortBy === "company_name" ? "c.name" : `j.${sortBy}`;

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT j.*,
        row_to_json(c.*) as company,
        (SELECT row_to_json(ce.*) FROM compensation_estimates ce WHERE ce.company_id = c.id LIMIT 1) as compensation,
        (SELECT row_to_json(sp.*) FROM stock_prices sp WHERE sp.company_id = c.id ORDER BY sp.fetched_at DESC LIMIT 1) as stock_price
      FROM jobs j
      JOIN companies c ON c.id = j.company_id
      ${where}
      ORDER BY ${sortColumn} ${sortOrder === "asc" ? "ASC" : "DESC"}
      LIMIT 500
    `;

    const rows = await this.sql.unsafe(query, params as never[]);

    let results = rows as unknown as JobWithCompany[];

    if (filters.roleFocus?.length) {
      results = results.filter((j) =>
        j.role_focus?.some((f) => filters.roleFocus!.includes(f as never)),
      );
    }

    return results;
  }

  async upsertJob(
    companyId: string,
    data: Omit<Job, "id" | "company_id" | "first_seen_at">,
  ): Promise<{ job: Job; created: boolean }> {
    const existing = await this.sql<Job[]>`
      SELECT * FROM jobs
      WHERE company_id = ${companyId}
        AND normalized_title = ${data.normalized_title}
        AND location = ${data.location}
      LIMIT 1
    `;

    if (existing[0]) {
      const updated = await this.sql<Job[]>`
        UPDATE jobs SET
          title = ${data.title},
          description = ${data.description},
          responsibilities = ${data.responsibilities},
          qualifications = ${data.qualifications},
          salary_min = ${data.salary_min},
          salary_max = ${data.salary_max},
          salary_currency = ${data.salary_currency},
          work_mode = ${data.work_mode},
          seniority = ${data.seniority},
          role_focus = ${data.role_focus as string[]},
          canonical_url = ${data.canonical_url},
          preferred_source_type = ${data.preferred_source_type},
          match_percentage = ${data.match_percentage},
          match_explanation = ${data.match_explanation},
          last_seen_at = NOW(),
          is_active = true
        WHERE id = ${existing[0].id}
        RETURNING *
      `;
      return { job: updated[0], created: false };
    }

    const inserted = await this.sql<Job[]>`
      INSERT INTO jobs (
        company_id, title, normalized_title, description, responsibilities, qualifications,
        salary_min, salary_max, salary_currency, location, work_mode, seniority, role_focus,
        canonical_url, preferred_source_type, match_percentage, match_explanation,
        created_at_source, last_seen_at, is_active
      ) VALUES (
        ${companyId}, ${data.title}, ${data.normalized_title}, ${data.description},
        ${data.responsibilities}, ${data.qualifications},
        ${data.salary_min}, ${data.salary_max}, ${data.salary_currency},
        ${data.location}, ${data.work_mode}, ${data.seniority},
        ${data.role_focus as string[]}, ${data.canonical_url}, ${data.preferred_source_type},
        ${data.match_percentage}, ${data.match_explanation},
        ${data.created_at_source}, NOW(), true
      )
      RETURNING *
    `;
    return { job: inserted[0], created: true };
  }

  async addJobSource(source: Omit<JobSource, "id">): Promise<JobSource> {
    const rows = await this.sql<JobSource[]>`
      INSERT INTO job_sources (job_id, source_name, source_type, source_url, raw_payload, discovered_at)
      VALUES (${source.job_id}, ${source.source_name}, ${source.source_type}, ${source.source_url}, ${JSON.stringify(source)}::jsonb, ${source.discovered_at})
      RETURNING *
    `;
    return rows[0];
  }

  async upsertCompensation(data: Omit<CompensationEstimate, "id">): Promise<void> {
    await this.sql`
      INSERT INTO compensation_estimates (
        company_id, level, role_family, base_min, base_max, bonus_min, bonus_max,
        equity_min, equity_max, total_comp_min, total_comp_max, confidence, source
      ) VALUES (
        ${data.company_id}, ${data.level}, ${data.role_family},
        ${data.base_min}, ${data.base_max}, ${data.bonus_min}, ${data.bonus_max},
        ${data.equity_min}, ${data.equity_max}, ${data.total_comp_min}, ${data.total_comp_max},
        ${data.confidence}, ${data.source}
      )
      ON CONFLICT DO NOTHING
    `;
  }

  async upsertStockPrice(data: Omit<StockPrice, "id">): Promise<void> {
    await this.sql`
      INSERT INTO stock_prices (company_id, ticker, price, currency, fetched_at)
      VALUES (${data.company_id}, ${data.ticker}, ${data.price}, ${data.currency}, ${data.fetched_at})
    `;
  }

  async startIngestionRun(): Promise<IngestionRun> {
    const rows = await this.sql<IngestionRun[]>`
      INSERT INTO ingestion_runs (status) VALUES ('running') RETURNING *
    `;
    return rows[0];
  }

  async completeIngestionRun(id: string, data: Partial<IngestionRun>): Promise<void> {
    await this.sql`
      UPDATE ingestion_runs SET
        completed_at = NOW(),
        status = ${data.status ?? "completed"},
        jobs_found = ${data.jobs_found ?? 0},
        jobs_added = ${data.jobs_added ?? 0},
        jobs_updated = ${data.jobs_updated ?? 0},
        duplicates_removed = ${data.duplicates_removed ?? 0},
        errors = ${JSON.stringify(data.errors ?? [])}::jsonb
      WHERE id = ${id}
    `;
  }

  async setMetadata(key: string, value: string): Promise<void> {
    await this.sql`
      INSERT INTO app_metadata (key, value, updated_at) VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
  }

  async getMetadata(key: string): Promise<string | null> {
    const rows = await this.sql<{ value: string }[]>`
      SELECT value FROM app_metadata WHERE key = ${key}
    `;
    return rows[0]?.value ?? null;
  }
}
