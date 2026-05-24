import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db';
import ratesRouter from './routes/rates';
import portfolioRouter from './routes/portfolio';
import alertsRouter from './routes/alerts';
import { startScheduler } from './services/scheduler';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(cors({ origin: isProd ? false : 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/rates', ratesRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/alerts', alertsRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// V produkci servíruj built React frontend
if (isProd) {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

initDb();

// Server nastartuje okamžitě, data se stahují na pozadí
app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT} (${isProd ? 'produkce' : 'vývoj'})`);
  startScheduler().catch(err => console.error('Chyba při inicializaci kurzů:', err));
});
