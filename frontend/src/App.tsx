import { useState } from 'react';
import Dashboard from './components/Dashboard';
import RateChart from './components/RateChart';
import Portfolio from './components/Portfolio';
import Alerts from './components/Alerts';

type Tab = 'dashboard' | 'charts' | 'portfolio' | 'alerts';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Přehled', icon: '◈' },
  { id: 'charts', label: 'Grafy', icon: '↗' },
  { id: 'portfolio', label: 'Portfolio', icon: '◎' },
  { id: 'alerts', label: 'Alarmy', icon: '◉' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-xl font-bold tracking-tight">₿</span>
            <h1 className="text-slate-100 font-bold tracking-tight">Směnné kurzy</h1>
            <span className="text-xs text-slate-600 ml-1">CZK · EUR · GBP · PHP · USD</span>
          </div>
          <div className="text-xs text-slate-600">
            {new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="max-w-5xl mx-auto px-4">
        <nav className="flex gap-1 py-3 border-b border-slate-800">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="text-xs">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'charts' && <RateChart />}
        {tab === 'portfolio' && <Portfolio />}
        {tab === 'alerts' && <Alerts />}
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-700">
        Kurzy z <a href="https://www.frankfurter.app" target="_blank" rel="noreferrer" className="underline hover:text-slate-500">Frankfurter API</a> (ECB data) · aktualizace každou hodinu
      </footer>
    </div>
  );
}
