import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'rates.db'));

export const CURRENCIES = ['EUR', 'GBP', 'PHP', 'USD'] as const;
export type Currency = 'CZK' | 'EUR' | 'GBP' | 'PHP' | 'USD';

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      date TEXT NOT NULL,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      PRIMARY KEY (date, from_currency, to_currency)
    );

    CREATE TABLE IF NOT EXISTS portfolio (
      currency TEXT PRIMARY KEY,
      amount REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      currency TEXT NOT NULL,
      target_rate REAL NOT NULL,
      direction TEXT NOT NULL,
      triggered INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // Seed portfolio currencies if empty
  const count = (db.prepare('SELECT COUNT(*) as c FROM portfolio').get() as { c: number }).c;
  if (count === 0) {
    const insert = db.prepare(
      'INSERT OR IGNORE INTO portfolio (currency, amount, updated_at) VALUES (?, 0, ?)'
    );
    const now = new Date().toISOString();
    for (const c of ['CZK', 'EUR', 'GBP', 'PHP', 'USD']) {
      insert.run(c, now);
    }
  }
}
