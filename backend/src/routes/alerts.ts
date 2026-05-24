import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM alerts ORDER BY created_at DESC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { currency, target_rate, direction, from_currency } = req.body as {
    currency: string;
    target_rate: number;
    direction: 'above' | 'below';
    from_currency?: string; // pokud je nastaveno, jde o křížový pár from_currency/currency
  };

  if (!currency || typeof target_rate !== 'number' || !['above', 'below'].includes(direction)) {
    return res.status(400).json({ error: 'Neplatná data alarmu' });
  }

  const result = db.prepare(
    'INSERT INTO alerts (currency, target_rate, direction, triggered, created_at) VALUES (?, ?, ?, 0, ?)'
  ).run(
    from_currency ? `${from_currency}/${currency}` : currency,
    target_rate,
    direction,
    new Date().toISOString()
  ) as { lastInsertRowid: number };

  res.status(201).json({
    id: result.lastInsertRowid,
    currency: from_currency ? `${from_currency}/${currency}` : currency,
    target_rate,
    direction,
    triggered: 0,
  });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM alerts WHERE id = ?').run(req.params.id) as { changes: number };
  if (result.changes === 0) return res.status(404).json({ error: 'Alarm nenalezen' });
  res.json({ ok: true });
});

router.patch('/:id/trigger', (req, res) => {
  db.prepare('UPDATE alerts SET triggered = 1 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
