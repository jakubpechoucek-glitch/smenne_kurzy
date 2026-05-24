import { Router } from 'express';
import { db, CURRENCIES, transaction } from '../db';
import { fetchLatestRates, saveRatesToDb } from '../services/frankfurter';

const router = Router();

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

  const result = rows.map(r => ({
    date: r.date,
    rate: parseFloat((1 / r.rate).toFixed(4)),
  }));

  res.json(result);
});

export default router;
