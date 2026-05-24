import { useEffect, useState } from 'react';
import { getAlerts, createAlert, deleteAlert, triggerAlert, getLatestRates } from '../api';
import type { Alert, LatestRates } from '../types';
import { CURRENCY_COLORS } from '../types';

const ALL = ['CZK', 'EUR', 'GBP', 'PHP', 'USD'];

function currColor(c: string) {
  return c === 'CZK' ? '#60a5fa' : (CURRENCY_COLORS[c] ?? '#94a3b8');
}

function displayRate(from: string, to: string, rates: LatestRates): number {
  const czk = (c: string) => c === 'CZK' ? 1 : (rates.rates[c]?.display ?? 0);
  if (to === 'CZK') return czk(from);
  return czk(from) / czk(to);
}

function checkAlerts(alerts: Alert[], rates: LatestRates): Alert[] {
  return alerts.filter(a => {
    if (a.triggered) return false;
    let current: number;
    if (a.currency.includes('/')) {
      const [from, to] = a.currency.split('/');
      current = displayRate(from, to, rates);
    } else {
      current = rates.rates[a.currency]?.display ?? 0;
    }
    return a.direction === 'above' ? current >= a.target_rate : current <= a.target_rate;
  });
}

function formatRate(r: number) {
  if (r < 0.01) return r.toFixed(6);
  if (r < 1) return r.toFixed(4);
  if (r < 100) return r.toFixed(3);
  return r.toFixed(2);
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rates, setRates] = useState<LatestRates | null>(null);
  const [fromCurr, setFromCurr] = useState('PHP');
  const [toCurr, setToCurr] = useState('USD');
  const [targetRate, setTargetRate] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notified, setNotified] = useState<number[]>([]);

  useEffect(() => {
    Promise.all([getAlerts(), getLatestRates()])
      .then(([a, r]) => {
        setAlerts(a);
        setRates(r);
        const triggered = checkAlerts(a, r);
        triggered.forEach(alert => {
          triggerAlert(alert.id).catch(() => {});
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Směnný kurz — alarm!', {
              body: `${alert.currency} je ${alert.direction === 'above' ? 'nad' : 'pod'} ${formatRate(alert.target_rate)}`,
            });
          }
        });
        if (triggered.length > 0) setNotified(triggered.map(a => a.id));
        setAlerts(prev => prev.map(a => triggered.find(t => t.id === a.id) ? { ...a, triggered: 1 } : a));
      })
      .catch(() => setError('Nepodařilo se načíst data'));
  }, []);

  const currentRate = rates ? displayRate(fromCurr, toCurr, rates) : 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(targetRate.replace(',', '.'));
    if (isNaN(rate) || rate <= 0) return;
    setSaving(true);
    try {
      const alert = await createAlert(toCurr, rate, direction, fromCurr === 'CZK' ? undefined : fromCurr);
      setAlerts(prev => [alert, ...prev]);
      setTargetRate('');
    } catch {
      setError('Nepodařilo se vytvořit alarm');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      {'Notification' in window && Notification.permission === 'default' && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 flex items-center justify-between">
          <span className="text-amber-300 text-sm">Povolte notifikace pro upozornění v prohlížeči.</span>
          <button onClick={() => Notification.requestPermission()}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-medium">
            Povolit
          </button>
        </div>
      )}

      {/* Formulář */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Nový alarm</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Výběr páru */}
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Z měny</label>
              <div className="flex gap-1">
                {ALL.map(c => (
                  <button type="button" key={c} onClick={() => { setFromCurr(c); if (c === toCurr) setToCurr(ALL.find(x => x !== c)!); }}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${fromCurr === c ? 'text-slate-900' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                    style={fromCurr === c ? { backgroundColor: currColor(c) } : {}}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-slate-500 mt-4">→</span>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Do měny</label>
              <div className="flex gap-1">
                {ALL.filter(c => c !== fromCurr).map(c => (
                  <button type="button" key={c} onClick={() => setToCurr(c)}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${toCurr === c ? 'text-slate-900' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                    style={toCurr === c ? { backgroundColor: currColor(c) } : {}}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Podmínka</label>
              <select value={direction} onChange={e => setDirection(e.target.value as 'above' | 'below')}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500">
                <option value="above">Přesáhne ↑</option>
                <option value="below">Klesne pod ↓</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Cílová hodnota (v {toCurr})</label>
              <input type="number" step="any" min="0" required value={targetRate}
                onChange={e => setTargetRate(e.target.value)}
                placeholder={currentRate > 0 ? formatRate(currentRate) : '0'}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          {currentRate > 0 && (
            <div className="text-xs text-slate-500 bg-slate-700/40 rounded-lg px-3 py-2">
              Aktuální kurz: 1 <span style={{ color: currColor(fromCurr) }}>{fromCurr}</span>
              {' = '}
              <span className="text-slate-200 font-mono font-medium">{formatRate(currentRate)}</span>
              {' '}<span style={{ color: currColor(toCurr) }}>{toCurr}</span>
            </div>
          )}

          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? 'Ukládám…' : 'Vytvořit alarm'}
          </button>
        </form>
      </div>

      {/* Seznam alarmů */}
      <div className="space-y-2">
        {alerts.length === 0 && (
          <div className="text-slate-500 text-sm text-center py-8">Žádné alarmy</div>
        )}
        {alerts.map(alert => {
          const parts = alert.currency.split('/');
          const fromC = parts.length === 2 ? parts[0] : 'CZK';
          const toC = parts.length === 2 ? parts[1] : parts[0];
          const isNew = notified.includes(alert.id);
          return (
            <div key={alert.id}
              className={`flex items-center justify-between rounded-lg p-4 border ${
                alert.triggered ? 'bg-green-900/20 border-green-700/50'
                : isNew ? 'bg-amber-900/30 border-amber-600'
                : 'bg-slate-800 border-slate-700'
              }`}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currColor(fromC) }} />
                  <span className="text-xs font-bold" style={{ color: currColor(fromC) }}>{fromC}</span>
                  <span className="text-slate-500 text-xs">→</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currColor(toC) }} />
                  <span className="text-xs font-bold" style={{ color: currColor(toC) }}>{toC}</span>
                </div>
                <div className="text-sm text-slate-300">
                  {alert.direction === 'above' ? 'přesáhne' : 'klesne pod'}
                  {' '}
                  <span className="font-bold text-slate-100 font-mono">{formatRate(alert.target_rate)} {toC}</span>
                </div>
                {alert.triggered ? (
                  <span className="text-xs text-green-400">✓ Spuštěno</span>
                ) : (
                  <span className="text-xs text-slate-600">{new Date(alert.created_at).toLocaleDateString('cs-CZ')}</span>
                )}
              </div>
              <button onClick={() => handleDelete(alert.id)}
                className="text-slate-500 hover:text-red-400 text-xs transition-colors px-2 py-1">
                Smazat
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  async function handleDelete(id: number) {
    await deleteAlert(id).catch(() => {});
    setAlerts(prev => prev.filter(a => a.id !== id));
  }
}
