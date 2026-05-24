export type CurrencyCode = 'CZK' | 'EUR' | 'GBP' | 'PHP' | 'USD';

export interface RateInfo {
  raw: number;    // how many foreign per 1 CZK
  display: number; // how many CZK per 1 foreign
}

export interface LatestRates {
  date: string;
  rates: Record<string, RateInfo>;
  cached?: boolean;
}

export interface RatePoint {
  date: string;
  rate: number; // CZK per 1 foreign currency
}

export interface PortfolioEntry {
  currency: string;
  amount: number;
  updated_at: string;
}

export interface Alert {
  id: number;
  currency: string;
  target_rate: number;
  direction: 'above' | 'below';
  triggered: number;
  created_at: string;
}

export const CURRENCY_LABELS: Record<string, string> = {
  CZK: 'Česká koruna',
  EUR: 'Euro',
  GBP: 'Britská libra',
  PHP: 'Filipínské peso',
  USD: 'Americký dolar',
};

export const CURRENCY_COLORS: Record<string, string> = {
  EUR: '#facc15',
  GBP: '#a78bfa',
  PHP: '#4ade80',
  USD: '#34d399',
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  CZK: 'Kč',
  EUR: '€',
  GBP: '£',
  PHP: '₱',
  USD: '$',
};
