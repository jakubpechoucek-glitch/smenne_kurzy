import express from 'express';
import cors from 'cors';
import { initDb } from './db';
import ratesRouter from './routes/rates';
import portfolioRouter from './routes/portfolio';
import alertsRouter from './routes/alerts';
import { startScheduler } from './services/scheduler';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/rates', ratesRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/alerts', alertsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

initDb();
startScheduler()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend běží na http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Chyba při startu:', err);
    process.exit(1);
  });
