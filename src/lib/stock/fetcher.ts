/**
 * Stock price fetcher using Yahoo Finance chart API (no API key required).
 * For production, consider FINNHUB_API_KEY or POLYGON_API_KEY for reliability.
 */

export interface StockQuote {
  ticker: string;
  price: number;
  currency: string;
}

export async function fetchStockPrice(ticker: string): Promise<StockQuote | null> {
  if (!ticker) return null;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "jobHunt/1.0" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; currency?: string };
        }>;
      };
    };

    const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
    const currency = data.chart?.result?.[0]?.meta?.currency ?? "USD";

    if (price == null) return null;
    return { ticker, price, currency };
  } catch {
    return null;
  }
}

export async function fetchStockPrices(
  tickers: string[],
): Promise<Map<string, StockQuote>> {
  const unique = [...new Set(tickers.filter(Boolean))];
  const results = new Map<string, StockQuote>();

  await Promise.all(
    unique.map(async (ticker) => {
      const quote = await fetchStockPrice(ticker);
      if (quote) results.set(ticker, quote);
    }),
  );

  return results;
}
