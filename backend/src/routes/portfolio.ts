import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT currency, amount, updated_at FROM portfolio').all();
  res.json(rows);
});

router.put('/:currency', (req, res) => {
  const { currency } = req.params;
  const { amount } = req.body as { amount: number };

  if (typeof amount !== 'number' || amount < 0) {
    return res.status(400).json({ error: 'Neplatná částka' });
  }

  const result = db.prepare(
    'UPDATE portfolio SET amount = ?, updated_at = ? WHERE currency = ?'
  ).run(amount, new Date().toISOString(), currency) as { changes: number };

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Měna nenalezena' });
  }

  res.json({ currency, amount });
});

export default router;
