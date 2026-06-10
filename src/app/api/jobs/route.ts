import { NextRequest, NextResponse } from "next/server";
import { getDatabase, isUsingFileStore } from "@/lib/db";
import { formatDatabaseError } from "@/lib/db/errors";
import {
  getDatabaseEnvStatus,
  getPostgresSetupHint,
  resolveDatabaseUrl,
} from "@/lib/db/resolve-database-url";
import type { JobFilters, RoleFocus, WorkMode } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const roleFocus = searchParams.get("roleFocus")?.split(",").filter(Boolean) as RoleFocus[] | undefined;
    const workMode = searchParams.get("workMode")?.split(",").filter(Boolean) as WorkMode[] | undefined;
    const seniority = searchParams.get("seniority")?.split(",").filter(Boolean);
    const companies = searchParams.get("companies")?.split(",").filter(Boolean);
    const salaryVisibility = searchParams.get("salaryVisibility") as JobFilters["salaryVisibility"];
    const publicOnlyParam = searchParams.get("publicOnly");
    const publicOnly =
      publicOnlyParam === "true" ? true : publicOnlyParam === "false" ? false : null;
    const minMatch = searchParams.get("minMatch") ? Number(searchParams.get("minMatch")) : undefined;
    const sortBy = (searchParams.get("sortBy") as JobFilters["sortBy"]) ?? "match_percentage";
    const sortOrder = (searchParams.get("sortOrder") as JobFilters["sortOrder"]) ?? "desc";

    const db = getDatabase();
    const lastRefreshed = await db.getMetadata("last_refreshed_at");

    const jobs = await db.getJobs({
      roleFocus,
      workMode,
      seniority,
      companies,
      salaryVisibility: salaryVisibility ?? "all",
      publicOnly,
      minMatch,
      sortBy,
      sortOrder,
    });

    const usingMemoryOnVercel = process.env.VERCEL && !resolveDatabaseUrl();

    return NextResponse.json({
      jobs,
      count: jobs.length,
      lastRefreshedAt: lastRefreshed,
      storage: usingMemoryOnVercel
        ? "memory"
        : resolveDatabaseUrl()
          ? "postgres"
          : isUsingFileStore()
            ? "file"
            : "memory",
      warning: usingMemoryOnVercel ? "no_postgres" : undefined,
      hint: usingMemoryOnVercel ? getPostgresSetupHint() : undefined,
      env: usingMemoryOnVercel ? getDatabaseEnvStatus() : undefined,
    });
  } catch (error) {
    console.error("GET /api/jobs error:", error);
    const { message, hint } = formatDatabaseError(error);
    return NextResponse.json({ error: message, hint }, { status: 500 });
  }
}
