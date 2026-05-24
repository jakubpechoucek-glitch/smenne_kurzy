# Směnné kurzy

Webová aplikace pro sledování směnných kurzů CZK ↔ EUR, GBP, PHP, USD s historií 12 měsíců.

## Funkce
- **Dashboard** – aktuální kurzy a hodnota portfolia v CZK
- **Grafy** – historický vývoj kurzů za posledních 12 měsíců
- **Portfolio** – zadání vlastních částek v každé měně
- **Alarmy** – upozornění při dosažení cílového kurzu

## Instalace

### Požadavky
- [Node.js](https://nodejs.org/) 18 nebo vyšší

### Spuštění

```bash
# Nainstalovat všechny závislosti
npm run install:all

# Spustit vývojový server (backend + frontend najednou)
npm run dev
```

Frontend běží na **http://localhost:5173**  
Backend API běží na **http://localhost:3001**

## Technologie
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend**: Node.js + Express + TypeScript
- **Databáze**: SQLite (soubor `backend/data/rates.db`)
- **Kurzy**: [Frankfurter API](https://www.frankfurter.app/) (zdarma, bez API klíče)
