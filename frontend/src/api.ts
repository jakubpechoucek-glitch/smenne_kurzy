import type { Alert, LatestRates, PortfolioEntry, RatePoint } from './types';

const BASE = '/api';

export async function getLatestRates(): Promise<LatestRates> {
  const res = await fetch(`${BASE}/rates/latest`);
  if (!res.ok) throw new Error('Nelze načíst aktuální kurzy');
  return res.json();
}

export async function getRateHistory(currency: string, months = 12): Promise<RatePoint[]> {
  const res = await fetch(`${BASE}/rates/history?currency=${currency}&months=${months}`);
  if (!res.ok) throw new Error('Nelze načíst historická data');
  return res.json();
}

export async function getPortfolio(): Promise<PortfolioEntry[]> {
  const res = await fetch(`${BASE}/portfolio`);
  if (!res.ok) throw new Error('Nelze načíst portfolio');
  return res.json();
}

export async function updatePortfolio(currency: string, amount: number): Promise<void> {
  const res = await fetch(`${BASE}/portfolio/${currency}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error('Nelze uložit portfolio');
}

export async function getAlerts(): Promise<Alert[]> {
  const res = await fetch(`${BASE}/alerts`);
  if (!res.ok) throw new Error('Nelze načíst alarmy');
  return res.json();
}

export async function createAlert(
  currency: string,
  target_rate: number,
  direction: 'above' | 'below'
): Promise<Alert> {
  const res = await fetch(`${BASE}/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency, target_rate, direction }),
  });
  if (!res.ok) throw new Error('Nelze vytvořit alarm');
  return res.json();
}

export async function deleteAlert(id: number): Promise<void> {
  const res = await fetch(`${BASE}/alerts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Nelze smazat alarm');
}

export async function triggerAlert(id: number): Promise<void> {
  await fetch(`${BASE}/alerts/${id}/trigger`, { method: 'PATCH' });
}
