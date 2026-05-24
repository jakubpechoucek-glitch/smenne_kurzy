import { CURRENCIES, db, transaction } from '../db';

const BASE_URL = 'https://api.frankfurter.app';

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface FrankfurterRangeResponse {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
}

export async function fetchLatestRates(): Promise<FrankfurterResponse> {
  const url = `${BASE_URL}/latest?from=CZK&to=${CURRENCIES.join(',')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);
  return res.json() as Promise<FrankfurterResponse>;
}

export async function fetchHistoricalRates(months = 12): Promise<FrankfurterRangeResponse> {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const url = `${BASE_URL}/${startStr}..${endStr}?from=CZK&to=${CURRENCIES.join(',')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`);
  return res.json() as Promise<FrankfurterRangeResponse>;
}

export function saveRatesToDb(date: string, rates: Record<string, number>) {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO exchange_rates (date, from_currency, to_currency, rate) VALUES (?, ?, ?, ?)'
  );
  transaction(() => {
    for (const [currency, rate] of Object.entries(rates)) {
      stmt.run(date, 'CZK', currency, rate);
    }
  });
}
