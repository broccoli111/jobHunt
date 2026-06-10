import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET() {
  try {
    const db = getDatabase();
    const companies = await db.getCompanies();
    return NextResponse.json({ companies });
  } catch (error) {
    console.error("GET /api/companies error:", error);
    return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
  }
}
