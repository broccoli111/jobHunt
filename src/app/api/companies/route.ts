import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { formatDatabaseError } from "@/lib/db/errors";

export async function GET() {
  try {
    const db = getDatabase();
    const companies = await db.getCompanies();
    return NextResponse.json({ companies });
  } catch (error) {
    console.error("GET /api/companies error:", error);
    const { message, hint } = formatDatabaseError(error);
    return NextResponse.json({ error: message, hint }, { status: 500 });
  }
}
