import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { getCrossRateHistory } from '../api';
import type { RatePoint } from '../types';
import { CURRENCY_COLORS, CURRENCY_SYMBOLS } from '../types';

const ALL = ['CZK', 'EUR', 'GBP', 'PHP', 'USD'] as const;
const PERIODS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '12M', months: 12 },
];

function currColor(c: string) {
  return c === 'CZK' ? '#60a5fa' : (CURRENCY_COLORS[c] ?? '#94a3b8');
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
}

function formatRate(rate: number) {
  if (rate === 0) return '—';
  if (rate < 0.0001) return rate.toExponential(3);
  if (rate < 0.01) return rate.toFixed(6);
  if (rate < 1) return rate.toFixed(4);
  if (rate < 100) return rate.toFixed(3);
  return rate.toFixed(2);
}

export default function RateChart() {
  const [from, setFrom] = useState<string>('PHP');
  const [to, setTo] = useState<string>('USD');
  const [period, setPeriod] = useState(12);
  const [data, setData] = useState<RatePoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (from === to) return;
    setLoading(true);
    getCrossRateHistory(from, to, period)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [from, to, period]);

  // Automaticky přehoď TO pokud se shoduje s FROM
  const handleFrom = (val: string) => {
    setFrom(val);
    if (val === to) setTo(ALL.find(c => c !== val) ?? 'USD');
  };
  const handleTo = (val: string) => {
    setTo(val);
    if (val === from) setFrom(ALL.find(c => c !== val) ?? 'PHP');
  };

  const rates = data.map(d => d.rate);
  const min = rates.length ? Math.min(...rates) : 0;
  const max = rates.length ? Math.max(...rates) : 0;
  const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const first = rates[0] ?? 0;
  const last = rates[rates.length - 1] ?? 0;
  const change = first > 0 ? ((last - first) / first) * 100 : 0;

  const displayData = data.length > 250
    ? data.filter((_, i) => i % Math.ceil(data.length / 250) === 0)
    : data;

  const fromColor = currColor(from);
  const toColor = currColor(to);

  // Výpočet "co by mi dalo X jednotek FROM v TO dnes vs. rok ago"
  const hasPortfolioContext = from === 'PHP' || from === 'USD' || from === 'EUR' || from === 'GBP';

  return (
    <div className="space-y-4">
      {/* Výběr páru */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Z</span>
          <div className="flex gap-1">
            {ALL.map(c => (
              <button key={c} onClick={() => handleFrom(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${from === c ? 'text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                style={from === c ? { backgroundColor: currColor(c) } : {}}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <span className="text-slate-500 text-lg">→</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Do</span>
          <div className="flex gap-1">
            {ALL.filter(c => c !== from).map(c => (
              <button key={c} onClick={() => handleTo(c)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${to === c ? 'text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                style={to === c ? { backgroundColor: currColor(c) } : {}}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1 ml-auto">
          {PERIODS.map(p => (
            <button key={p.months} onClick={() => setPeriod(p.months)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${period === p.months ? 'bg-slate-600 text-slate-100' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Statistiky */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: `Aktuální kurz`, value: formatRate(last) },
          { label: 'Minimum', value: formatRate(min) },
          { label: 'Maximum', value: formatRate(max) },
          {
            label: `Změna (${PERIODS.find(p => p.months === period)?.label})`,
            value: first > 0 ? `${change >= 0 ? '+' : ''}${change.toFixed(2)} %` : '—',
            color: change >= 0 ? 'text-green-400' : 'text-red-400',
          },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={`text-lg font-bold font-mono ${s.color ?? 'text-slate-100'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Popis páru */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold" style={{ color: fromColor }}>{from}</span>
          <span className="text-slate-500">→</span>
          <span className="font-semibold" style={{ color: toColor }}>{to}</span>
          <span className="text-xs text-slate-500 ml-1">
            — {CURRENCY_SYMBOLS[from]} za {CURRENCY_SYMBOLS[to]} ({PERIODS.find(p => p.months === period)?.label})
          </span>
        </div>
        <div className="text-xs text-slate-500 mb-4">
          1 {from} = <span className="text-slate-300 font-mono">{formatRate(last)}</span> {to}
          {last > 0 && first > 0 && (
            <span className={`ml-3 font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)} % za {PERIODS.find(p => p.months === period)?.label}
            </span>
          )}
        </div>

        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-500">Načítám…</div>
        ) : displayData.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-slate-500">Žádná data</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={displayData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tickFormatter={formatDate}
                tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false}
                tickFormatter={v => formatRate(v)} width={70} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                formatter={(value: number) => [`${formatRate(value)} ${to}`, `1 ${from}`]}
                labelFormatter={formatDate}
              />
              <ReferenceLine y={min} stroke="#ef4444" strokeDasharray="4 4"
                label={{ value: `Min ${formatRate(min)}`, fill: '#ef4444', fontSize: 10 }} />
              <ReferenceLine y={max} stroke="#22c55e" strokeDasharray="4 4"
                label={{ value: `Max ${formatRate(max)}`, fill: '#22c55e', fontSize: 10 }} />
              <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="2 4"
                label={{ value: `Avg ${formatRate(avg)}`, fill: '#94a3b8', fontSize: 10 }} />
              <Line type="monotone" dataKey="rate" stroke={fromColor} strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: fromColor }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tip: nejlepší a nejhorší moment */}
      {first > 0 && last > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-3">
            <div className="text-xs text-green-400 font-medium mb-1">Maximum za období</div>
            <div className="text-lg font-bold text-green-300 font-mono">{formatRate(max)} {to}</div>
            <div className="text-xs text-green-600">za 1 {from} — nejlepší čas na směnu</div>
          </div>
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
            <div className="text-xs text-red-400 font-medium mb-1">Minimum za období</div>
            <div className="text-lg font-bold text-red-300 font-mono">{formatRate(min)} {to}</div>
            <div className="text-xs text-red-600">za 1 {from} — nejhorší čas na směnu</div>
          </div>
        </div>
      )}
    </div>
  );
}
