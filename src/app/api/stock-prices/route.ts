import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { fetchStockPrice } from "@/lib/stock/fetcher";

export async function GET(request: NextRequest) {
  try {
    const ticker = request.nextUrl.searchParams.get("ticker");
    const companyId = request.nextUrl.searchParams.get("companyId");

    if (ticker) {
      const quote = await fetchStockPrice(ticker);
      if (!quote) {
        return NextResponse.json({ error: "Stock data unavailable" }, { status: 404 });
      }
      return NextResponse.json(quote);
    }

    if (companyId) {
      const db = getDatabase();
      const companies = await db.getCompanies();
      const company = companies.find((c) => c.id === companyId);

      if (!company) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
      }

      if (!company.is_public || !company.ticker) {
        return NextResponse.json({ status: "private" });
      }

      const quote = await fetchStockPrice(company.ticker);
      if (!quote) {
        return NextResponse.json({ status: "unavailable", ticker: company.ticker });
      }

      return NextResponse.json(quote);
    }

    return NextResponse.json({ error: "Provide ticker or companyId" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/stock-prices error:", error);
    return NextResponse.json({ error: "Failed to fetch stock price" }, { status: 500 });
  }
}
