import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { getRateHistory } from '../api';
import type { RatePoint } from '../types';
import { CURRENCY_COLORS, CURRENCY_LABELS, CURRENCY_SYMBOLS } from '../types';

const CURRENCIES = ['EUR', 'GBP', 'PHP', 'USD'] as const;
const PERIODS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '12M', months: 12 },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
}

export default function RateChart() {
  const [selected, setSelected] = useState<string>('EUR');
  const [period, setPeriod] = useState(12);
  const [data, setData] = useState<RatePoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getRateHistory(selected, period)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [selected, period]);

  const rates = data.map(d => d.rate);
  const min = rates.length ? Math.min(...rates) : 0;
  const max = rates.length ? Math.max(...rates) : 0;
  const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  const first = rates[0] ?? 0;
  const last = rates[rates.length - 1] ?? 0;
  const change = first > 0 ? ((last - first) / first) * 100 : 0;
  const color = CURRENCY_COLORS[selected];

  // Thin out data for display (max 200 points)
  const displayData = data.length > 200
    ? data.filter((_, i) => i % Math.ceil(data.length / 200) === 0)
    : data;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {CURRENCIES.map(c => (
            <button
              key={c}
              onClick={() => setSelected(c)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selected === c
                  ? 'text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              style={selected === c ? { backgroundColor: CURRENCY_COLORS[c] } : {}}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {PERIODS.map(p => (
            <button
              key={p.months}
              onClick={() => setPeriod(p.months)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                period === p.months
                  ? 'bg-slate-600 text-slate-100'
                  : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Aktuální', value: `${last.toFixed(4)} Kč` },
          { label: 'Minimum', value: `${min.toFixed(4)} Kč` },
          { label: 'Maximum', value: `${max.toFixed(4)} Kč` },
          {
            label: `Změna (${PERIODS.find(p => p.months === period)?.label})`,
            value: `${change >= 0 ? '+' : ''}${change.toFixed(2)} %`,
            color: change >= 0 ? 'text-green-400' : 'text-red-400',
          },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={`text-lg font-bold ${s.color ?? 'text-slate-100'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-semibold text-slate-200">
            {CURRENCY_LABELS[selected]} ({CURRENCY_SYMBOLS[selected]}) vůči CZK
          </span>
          <span className="text-xs text-slate-500">— Kč za 1 {selected}</span>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500">Načítám…</div>
        ) : displayData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500">Žádná data</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={displayData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                tickFormatter={v => v.toFixed(3)}
                width={60}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8', fontSize: 12 }}
                formatter={(value: number) => [`${value.toFixed(4)} Kč`, `1 ${selected}`]}
                labelFormatter={formatDate}
              />
              <ReferenceLine y={min} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Min', fill: '#ef4444', fontSize: 11 }} />
              <ReferenceLine y={max} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'Max', fill: '#22c55e', fontSize: 11 }} />
              <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="2 4" label={{ value: 'Průměr', fill: '#94a3b8', fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
