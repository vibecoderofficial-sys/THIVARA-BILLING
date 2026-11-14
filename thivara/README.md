# THIVARA Solutions Billing
1. Create a Google Sheet → Extensions → Apps Script → paste `apps-script/Code.gs` → run `setup()` once.
2. Project Settings → Script Properties → add `API_TOKEN` (long random string).
3. Deploy → New deployment → Web app (Execute as: Me, Access: Anyone) → copy the /exec URL.
4. Copy `.env.example` to `.env`, fill both values. `npm i && npm run dev`.
5. Edit company/bank details in `CO` at top of `src/App.jsx`. Open Services → "Load predefined catalogue", then set prices.
6. Vercel: import repo, add `VITE_API_URL` and `VITE_API_TOKEN` env vars, deploy (framework: Vite).
7. Add a daily time trigger for `backup()` in Apps Script.
Note: VITE_ vars ship in the browser bundle, so the token is a shared secret; see limits below.
