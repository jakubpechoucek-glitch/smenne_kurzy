import cron from 'node-cron';
import { fetchLatestRates, fetchHistoricalRates, saveRatesToDb } from './frankfurter';
import { db } from '../db';

async function fetchAndSaveLatest() {
  const data = await fetchLatestRates();
  saveRatesToDb(data.date, data.rates);
  console.log(`[${new Date().toISOString()}] Kurzy aktualizovány: ${data.date}`);
}

async function seedHistoricalIfEmpty() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM exchange_rates').get() as { c: number }).c;
  if (count < 50) {
    console.log('Stahuji historická data (12 měsíců)...');
    const data = await fetchHistoricalRates(12);
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO exchange_rates (date, from_currency, to_currency, rate) VALUES (?, ?, ?, ?)'
    );
    const insertAll = db.transaction(() => {
      for (const [date, currencies] of Object.entries(data.rates)) {
        for (const [currency, rate] of Object.entries(currencies)) {
          stmt.run(date, 'CZK', currency, rate);
        }
      }
    });
    insertAll();
    console.log(`Historická data uložena (${Object.keys(data.rates).length} dní).`);
  }
}

export async function startScheduler() {
  await seedHistoricalIfEmpty();
  await fetchAndSaveLatest();

  // Fetch every hour
  cron.schedule('0 * * * *', () => {
    fetchAndSaveLatest().catch(err => console.error('Chyba při aktualizaci kurzů:', err));
  });
}
