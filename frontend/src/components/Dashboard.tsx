import { useEffect, useState } from 'react';
import { getLatestRates, getPortfolio } from '../api';
import type { LatestRates, PortfolioEntry } from '../types';
import { CURRENCY_COLORS, CURRENCY_LABELS, CURRENCY_SYMBOLS } from '../types';

const FOREIGN = ['EUR', 'GBP', 'PHP', 'USD'];

export default function Dashboard() {
  const [rates, setRates] = useState<LatestRates | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getLatestRates(), getPortfolio()])
      .then(([r, p]) => { setRates(r); setPortfolio(p); })
      .catch(() => setError('Nepodařilo se načíst data. Je backend spuštěný?'))
      .finally(() => setLoading(false));
  }, []);

  const totalCzk = portfolio.reduce((sum, entry) => {
    if (entry.currency === 'CZK') return sum + entry.amount;
    const rate = rates?.rates[entry.currency]?.display ?? 0;
    return sum + entry.amount * rate;
  }, 0);

  if (loading) return <div className="text-slate-400 py-12 text-center">Načítám kurzy…</div>;
  if (error) return <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Rate cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-200">Aktuální kurzy</h2>
          <span className="text-xs text-slate-500">{rates?.date}{rates?.cached ? ' (z cache)' : ''}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FOREIGN.map(currency => {
            const info = rates?.rates[currency];
            if (!info) return null;
            const color = CURRENCY_COLORS[currency];
            return (
              <div key={currency} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm" style={{ color }}>{currency}</span>
                  <span className="text-xs text-slate-500">{CURRENCY_SYMBOLS[currency]}</span>
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {info.display.toFixed(3)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Kč za 1 {currency}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  1 Kč = {info.raw.toFixed(5)} {currency}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Portfolio summary */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Hodnota portfolia</h2>
        <div className="text-4xl font-bold text-blue-400 mb-4">
          {totalCzk.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
        </div>
        <div className="space-y-2">
          {portfolio.filter(e => e.amount > 0).map(entry => {
            const isBase = entry.currency === 'CZK';
            const czk = isBase
              ? entry.amount
              : entry.amount * (rates?.rates[entry.currency]?.display ?? 0);
            const pct = totalCzk > 0 ? (czk / totalCzk) * 100 : 0;
            const color = entry.currency === 'CZK' ? '#60a5fa' : CURRENCY_COLORS[entry.currency];
            return (
              <div key={entry.currency} className="flex items-center gap-3">
                <span className="w-12 text-sm font-medium" style={{ color }}>{entry.currency}</span>
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-sm text-slate-300 w-28 text-right">
                  {entry.amount.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} {CURRENCY_SYMBOLS[entry.currency]}
                </span>
                <span className="text-xs text-slate-500 w-24 text-right">
                  ≈ {czk.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
                </span>
              </div>
            );
          })}
          {portfolio.every(e => e.amount === 0) && (
            <p className="text-slate-500 text-sm">Žádné prostředky. Zadej je v záložce Portfolio.</p>
          )}
        </div>
      </div>

      {/* Labels reference */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {['CZK', ...FOREIGN].map(c => (
          <div key={c} className="bg-slate-800/50 rounded-lg p-2 text-center">
            <div className="text-xs font-bold" style={{ color: c === 'CZK' ? '#60a5fa' : CURRENCY_COLORS[c] }}>{c}</div>
            <div className="text-xs text-slate-500">{CURRENCY_LABELS[c]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
