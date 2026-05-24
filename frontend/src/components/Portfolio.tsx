import { useEffect, useState } from 'react';
import { getPortfolio, getLatestRates, updatePortfolio } from '../api';
import type { LatestRates, PortfolioEntry } from '../types';
import { CURRENCY_COLORS, CURRENCY_LABELS, CURRENCY_SYMBOLS } from '../types';

const ALL_CURRENCIES = ['CZK', 'EUR', 'GBP', 'PHP', 'USD'];

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioEntry[]>([]);
  const [rates, setRates] = useState<LatestRates | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getPortfolio(), getLatestRates()])
      .then(([p, r]) => { setPortfolio(p); setRates(r); })
      .catch(() => setError('Nepodařilo se načíst data'));
  }, []);

  const handleEdit = (currency: string, value: string) => {
    setEditing(prev => ({ ...prev, [currency]: value }));
  };

  const handleSave = async (currency: string) => {
    const raw = editing[currency];
    if (raw === undefined) return;
    const amount = parseFloat(raw.replace(',', '.'));
    if (isNaN(amount) || amount < 0) return;
    setSaving(currency);
    try {
      await updatePortfolio(currency, amount);
      setPortfolio(prev =>
        prev.map(e => e.currency === currency ? { ...e, amount } : e)
      );
      setEditing(prev => { const n = { ...prev }; delete n[currency]; return n; });
    } catch {
      setError('Nepodařilo se uložit');
    } finally {
      setSaving(null);
    }
  };

  const toCzk = (entry: PortfolioEntry) => {
    if (entry.currency === 'CZK') return entry.amount;
    return entry.amount * (rates?.rates[entry.currency]?.display ?? 0);
  };

  const total = portfolio.reduce((s, e) => s + toCzk(e), 0);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left p-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Měna</th>
              <th className="text-right p-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Kurz (Kč)</th>
              <th className="text-right p-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Částka</th>
              <th className="text-right p-4 text-xs font-medium text-slate-500 uppercase tracking-wide">Hodnota v CZK</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {ALL_CURRENCIES.map(currency => {
              const entry = portfolio.find(e => e.currency === currency);
              const amount = entry?.amount ?? 0;
              const czk = entry ? toCzk(entry) : 0;
              const pct = total > 0 ? (czk / total) * 100 : 0;
              const color = currency === 'CZK' ? '#60a5fa' : CURRENCY_COLORS[currency];
              const displayRate = currency === 'CZK' ? 1 : (rates?.rates[currency]?.display ?? 0);
              const editVal = editing[currency] ?? String(amount);

              return (
                <tr key={currency} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <div>
                        <div className="font-medium text-sm" style={{ color }}>{currency}</div>
                        <div className="text-xs text-slate-500">{CURRENCY_LABELS[currency]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right text-sm text-slate-300">
                    {currency === 'CZK' ? '—' : `${displayRate.toFixed(4)} Kč`}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editing[currency] ?? amount}
                        onChange={e => handleEdit(currency, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSave(currency)}
                        className="w-32 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-right text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-xs text-slate-500 w-8">{CURRENCY_SYMBOLS[currency]}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-sm font-medium text-slate-200">
                      {czk.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1 mt-1">
                      <div className="h-1 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </td>
                  <td className="p-4">
                    {editing[currency] !== undefined && editing[currency] !== String(amount) && (
                      <button
                        onClick={() => handleSave(currency)}
                        disabled={saving === currency}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {saving === currency ? '…' : 'Uložit'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-700/30">
              <td colSpan={3} className="p-4 text-sm font-medium text-slate-300">Celkem</td>
              <td className="p-4 text-right text-xl font-bold text-blue-400">
                {total.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-slate-600 text-center">
        Kurzy ze dne {rates?.date ?? '…'}. Hodnoty jsou orientační.
      </p>
    </div>
  );
}
