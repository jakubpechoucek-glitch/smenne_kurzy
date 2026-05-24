import { useEffect, useState } from 'react';
import { getAlerts, createAlert, deleteAlert, triggerAlert, getLatestRates } from '../api';
import type { Alert, LatestRates } from '../types';
import { CURRENCY_COLORS } from '../types';

const FOREIGN = ['EUR', 'GBP', 'PHP', 'USD'];

function checkAlerts(alerts: Alert[], rates: LatestRates): Alert[] {
  return alerts.filter(a => {
    if (a.triggered) return false;
    const current = rates.rates[a.currency]?.display ?? 0;
    if (a.direction === 'above') return current >= a.target_rate;
    return current <= a.target_rate;
  });
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rates, setRates] = useState<LatestRates | null>(null);
  const [currency, setCurrency] = useState('EUR');
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
              body: `${alert.currency}/CZK je ${alert.direction === 'above' ? 'nad' : 'pod'} ${alert.target_rate} Kč`,
            });
          }
        });
        if (triggered.length > 0) setNotified(triggered.map(a => a.id));
        setAlerts(prev => prev.map(a => triggered.find(t => t.id === a.id) ? { ...a, triggered: 1 } : a));
      })
      .catch(() => setError('Nepodařilo se načíst data'));
  }, []);

  const requestNotifPermission = () => {
    if ('Notification' in window) Notification.requestPermission();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(targetRate.replace(',', '.'));
    if (isNaN(rate) || rate <= 0) return;
    setSaving(true);
    try {
      const alert = await createAlert(currency, rate, direction);
      setAlerts(prev => [alert, ...prev]);
      setTargetRate('');
    } catch {
      setError('Nepodařilo se vytvořit alarm');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteAlert(id).catch(() => {});
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const currentRate = rates?.rates[currency]?.display ?? 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      {/* Notification permission banner */}
      {'Notification' in window && Notification.permission === 'default' && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 flex items-center justify-between">
          <span className="text-amber-300 text-sm">Povolte notifikace pro upozornění při dosažení kurzu.</span>
          <button
            onClick={requestNotifPermission}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs font-medium transition-colors"
          >
            Povolit
          </button>
        </div>
      )}

      {/* New alert form */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Nový alarm</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Měna</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                {FOREIGN.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Podmínka</label>
              <select
                value={direction}
                onChange={e => setDirection(e.target.value as 'above' | 'below')}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="above">Přesáhne</option>
                <option value="below">Klesne pod</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Cílový kurz (Kč)</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={targetRate}
                onChange={e => setTargetRate(e.target.value)}
                placeholder={currentRate ? currentRate.toFixed(3) : '0.000'}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {currentRate > 0 && (
            <div className="text-xs text-slate-500">
              Aktuální kurz: 1 {currency} = <span className="text-slate-300 font-medium">{currentRate.toFixed(4)} Kč</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Ukládám…' : 'Vytvořit alarm'}
          </button>
        </form>
      </div>

      {/* Alert list */}
      <div className="space-y-2">
        {alerts.length === 0 && (
          <div className="text-slate-500 text-sm text-center py-8">Žádné aktivní alarmy</div>
        )}
        {alerts.map(alert => {
          const color = CURRENCY_COLORS[alert.currency];
          const isNew = notified.includes(alert.id);
          return (
            <div
              key={alert.id}
              className={`flex items-center justify-between rounded-lg p-4 border ${
                alert.triggered
                  ? 'bg-green-900/20 border-green-700/50'
                  : isNew
                  ? 'bg-amber-900/30 border-amber-600'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    {alert.currency}/CZK {alert.direction === 'above' ? 'přesáhne' : 'klesne pod'}{' '}
                    <span className="font-bold text-slate-100">{alert.target_rate.toFixed(4)} Kč</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(alert.created_at).toLocaleDateString('cs-CZ')}
                    {alert.triggered ? ' — Spuštěno' : ''}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(alert.id)}
                className="text-slate-500 hover:text-red-400 text-xs transition-colors px-2 py-1"
              >
                Smazat
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
