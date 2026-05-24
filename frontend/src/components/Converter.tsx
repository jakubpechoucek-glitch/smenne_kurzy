import { useEffect, useState } from 'react';
import { getLatestRates } from '../api';
import type { LatestRates } from '../types';
import { CURRENCY_COLORS, CURRENCY_SYMBOLS } from '../types';

const ALL = ['CZK', 'EUR', 'GBP', 'PHP', 'USD'];

function toBaseCzk(amount: number, from: string, rates: LatestRates): number {
  if (from === 'CZK') return amount;
  return amount * (rates.rates[from]?.display ?? 0);
}

function fromBaseCzk(czk: number, to: string, rates: LatestRates): number {
  if (to === 'CZK') return czk;
  const display = rates.rates[to]?.display ?? 1;
  return czk / display;
}

export default function Converter() {
  const [rates, setRates] = useState<LatestRates | null>(null);
  const [amount, setAmount] = useState('1000');
  const [from, setFrom] = useState('CZK');

  useEffect(() => {
    getLatestRates().then(setRates).catch(() => {});
  }, []);

  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const czk = rates ? toBaseCzk(numAmount, from, rates) : 0;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-200">Kalkulačka</h2>

        <div className="flex gap-3">
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-xl text-slate-100 focus:outline-none focus:border-blue-500"
            placeholder="0"
          />
          <select
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-3 text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
          >
            {ALL.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="text-slate-500 text-xs text-center">↕ převod</div>

        <div className="space-y-2">
          {ALL.filter(c => c !== from).map(to => {
            const color = to === 'CZK' ? '#60a5fa' : CURRENCY_COLORS[to];
            const result = rates ? fromBaseCzk(czk, to, rates) : 0;
            const decimals = ['PHP', 'CZK'].includes(to) ? 2 : 4;
            return (
              <div
                key={to}
                className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3"
              >
                <span className="font-semibold text-sm" style={{ color }}>{to}</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-slate-100">
                    {result.toLocaleString('cs-CZ', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                  </span>
                  <span className="text-slate-500 text-sm ml-1">{CURRENCY_SYMBOLS[to]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {rates && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Referenční kurzy ke dni {rates.date}</div>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(rates.rates).map(([currency, info]) => (
              <div key={currency} className="text-xs text-slate-500">
                1 {currency} = {info.display.toFixed(4)} CZK
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
