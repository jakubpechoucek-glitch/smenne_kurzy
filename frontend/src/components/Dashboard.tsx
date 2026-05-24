import { useEffect, useState } from 'react';
import { getLatestRates, getPortfolio } from '../api';
import type { LatestRates, PortfolioEntry } from '../types';
import { CURRENCY_COLORS, CURRENCY_LABELS, CURRENCY_SYMBOLS } from '../types';

const ALL = ['CZK', 'EUR', 'GBP', 'PHP', 'USD'] as const;
const FOREIGN = ['EUR', 'GBP', 'PHP', 'USD'] as const;

// Vrátí "kolik CZK za 1 měnu X"
function displayRate(currency: string, rates: LatestRates): number {
  if (currency === 'CZK') return 1;
  return rates.rates[currency]?.display ?? 0;
}

// Křížový kurz: kolik TO dostanu za 1 FROM
function crossRate(from: string, to: string, rates: LatestRates): number {
  if (from === to) return 1;
  const fromCzk = displayRate(from, rates); // CZK per 1 FROM
  const toCzk = displayRate(to, rates);     // CZK per 1 TO
  if (toCzk === 0) return 0;
  return fromCzk / toCzk;
}

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
      {/* Křížová tabulka kurzů */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-200">Křížové kurzy</h2>
          <span className="text-xs text-slate-500">{rates?.date}</span>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="p-3 text-left text-slate-500 font-medium">1 →</th>
                {ALL.map(c => (
                  <th key={c} className="p-3 text-right font-bold" style={{ color: c === 'CZK' ? '#60a5fa' : CURRENCY_COLORS[c] }}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL.map(from => (
                <tr key={from} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                  <td className="p-3 font-bold" style={{ color: from === 'CZK' ? '#60a5fa' : CURRENCY_COLORS[from] }}>
                    {from}
                  </td>
                  {ALL.map(to => {
                    if (from === to) return (
                      <td key={to} className="p-3 text-right text-slate-600">—</td>
                    );
                    const rate = rates ? crossRate(from, to, rates) : 0;
                    const decimals = rate < 0.01 ? 6 : rate < 1 ? 4 : rate < 100 ? 3 : 2;
                    return (
                      <td key={to} className="p-3 text-right text-slate-200 font-mono text-xs">
                        {rate.toLocaleString('cs-CZ', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio hodnota v každé cizí měně */}
      {portfolio.some(e => e.amount > 0) && (
        <div>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">Hodnota portfolia</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {ALL.map(toCurrency => {
              const totalInCurrency = portfolio.reduce((sum, entry) => {
                if (!rates) return sum;
                const entryCzk = entry.currency === 'CZK'
                  ? entry.amount
                  : entry.amount * displayRate(entry.currency, rates);
                if (toCurrency === 'CZK') return sum + entryCzk;
                return sum + entryCzk / displayRate(toCurrency, rates);
              }, 0);
              const color = toCurrency === 'CZK' ? '#60a5fa' : CURRENCY_COLORS[toCurrency];
              return (
                <div key={toCurrency} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="text-xs font-bold mb-1" style={{ color }}>{toCurrency}</div>
                  <div className="text-xl font-bold text-slate-100">
                    {CURRENCY_SYMBOLS[toCurrency]}{totalInCurrency.toLocaleString('cs-CZ', { maximumFractionDigits: toCurrency === 'PHP' ? 0 : 2 })}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{CURRENCY_LABELS[toCurrency]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rozložení portfolia */}
      {portfolio.some(e => e.amount > 0) && rates && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Rozložení portfolia</h2>
          <div className="space-y-2">
            {portfolio.filter(e => e.amount > 0).map(entry => {
              const czk = entry.currency === 'CZK' ? entry.amount : entry.amount * displayRate(entry.currency, rates);
              const pct = totalCzk > 0 ? (czk / totalCzk) * 100 : 0;
              const color = entry.currency === 'CZK' ? '#60a5fa' : CURRENCY_COLORS[entry.currency];
              return (
                <div key={entry.currency} className="flex items-center gap-3">
                  <span className="w-10 text-sm font-medium" style={{ color }}>{entry.currency}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-xs text-slate-400 w-16 text-right">{pct.toFixed(1)} %</span>
                  <span className="text-xs text-slate-500 w-36 text-right">
                    {entry.amount.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} {CURRENCY_SYMBOLS[entry.currency]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {portfolio.every(e => e.amount === 0) && (
        <p className="text-slate-500 text-sm text-center">Zadej částky v záložce Portfolio.</p>
      )}
    </div>
  );
}
