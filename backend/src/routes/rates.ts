import { Router } from 'express';
import { db, CURRENCIES, transaction } from '../db';
import { fetchLatestRates, saveRatesToDb } from '../services/frankfurter';

const router = Router();
const ALL = ['CZK', ...CURRENCIES];

router.get('/latest', async (_req, res) => {
  try {
    const data = await fetchLatestRates();
    saveRatesToDb(data.date, data.rates);

    const displayRates: Record<string, { raw: number; display: number }> = {};
    for (const [currency, rate] of Object.entries(data.rates)) {
      displayRates[currency] = { raw: rate, display: parseFloat((1 / rate).toFixed(4)) };
    }
    res.json({ date: data.date, rates: displayRates });
  } catch (err) {
    console.error(err);
    const latest = db.prepare(`
      SELECT to_currency, rate, date FROM exchange_rates
      WHERE from_currency = 'CZK'
      ORDER BY date DESC
      LIMIT ${CURRENCIES.length}
    `).all() as { to_currency: string; rate: number; date: string }[];

    if (latest.length === 0) return res.status(503).json({ error: 'Nelze načíst kurzy' });

    const displayRates: Record<string, { raw: number; display: number }> = {};
    let date = '';
    for (const row of latest) {
      displayRates[row.to_currency] = { raw: row.rate, display: parseFloat((1 / row.rate).toFixed(4)) };
      date = row.date;
    }
    res.json({ date, rates: displayRates, cached: true });
  }
});

// GET /api/rates/history?currency=EUR&months=12  (CZK-based)
router.get('/history', (req, res) => {
  const currency = (req.query.currency as string) || 'EUR';
  const months = Math.min(parseInt(req.query.months as string) || 12, 12);

  const start = new Date();
  start.setMonth(start.getMonth() - months);
  const startStr = start.toISOString().slice(0, 10);

  const rows = db.prepare(`
    SELECT date, rate FROM exchange_rates
    WHERE from_currency = 'CZK' AND to_currency = ?
      AND date >= ?
    ORDER BY date ASC
  `).all(currency, startStr) as { date: string; rate: number }[];

  res.json(rows.map(r => ({ date: r.date, rate: parseFloat((1 / r.rate).toFixed(6)) })));
});

// GET /api/rates/cross-history?from=PHP&to=USD&months=12
// Vrací historický kurz libovolného páru (přes CZK jako pivot)
router.get('/cross-history', (req, res) => {
  const from = (req.query.from as string) || 'PHP';
  const to = (req.query.to as string) || 'USD';
  const months = Math.min(parseInt(req.query.months as string) || 12, 12);

  if (!ALL.includes(from) || !ALL.includes(to) || from === to) {
    return res.status(400).json({ error: 'Neplatný pár měn' });
  }

  const start = new Date();
  start.setMonth(start.getMonth() - months);
  const startStr = start.toISOString().slice(0, 10);

  let rows: { date: string; rate: number }[];

  if (from === 'CZK') {
    // 1 CZK = ? TO  →  display = 1/raw
    rows = (db.prepare(`
      SELECT date, rate FROM exchange_rates
      WHERE from_currency = 'CZK' AND to_currency = ? AND date >= ?
      ORDER BY date ASC
    `).all(to, startStr) as { date: string; rate: number }[])
      .map(r => ({ date: r.date, rate: parseFloat((r.rate).toFixed(6)) }));
  } else if (to === 'CZK') {
    // 1 FROM = ? CZK  →  display = 1/raw (inverted)
    rows = (db.prepare(`
      SELECT date, rate FROM exchange_rates
      WHERE from_currency = 'CZK' AND to_currency = ? AND date >= ?
      ORDER BY date ASC
    `).all(from, startStr) as { date: string; rate: number }[])
      .map(r => ({ date: r.date, rate: parseFloat((1 / r.rate).toFixed(6)) }));
  } else {
    // Křížový kurz: 1 FROM = (display_FROM / display_TO) TO
    // display_FROM = 1/rate_from_raw (CZK per 1 FROM)
    // display_TO   = 1/rate_to_raw   (CZK per 1 TO)
    // cross = display_FROM / display_TO = rate_to_raw / rate_from_raw
    rows = (db.prepare(`
      SELECT e1.date,
             CAST(e2.rate AS REAL) / CAST(e1.rate AS REAL) as rate
      FROM exchange_rates e1
      JOIN exchange_rates e2
        ON e1.date = e2.date
        AND e2.from_currency = 'CZK' AND e2.to_currency = ?
      WHERE e1.from_currency = 'CZK' AND e1.to_currency = ?
        AND e1.date >= ?
      ORDER BY e1.date ASC
    `).all(to, from, startStr) as { date: string; rate: number }[])
      .map(r => ({ date: r.date, rate: parseFloat(r.rate.toFixed(6)) }));
  }

  res.json(rows);
});

export default router;
