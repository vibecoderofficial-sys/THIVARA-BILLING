# THIVARA Solutions Billing

## Deploy / connect to Google Sheets
1. Create or open the Google Spreadsheet used for billing.
2. Open **Extensions → Apps Script** and paste `apps-script/Code.gs` into `Code.gs`.
3. Run `setup()` once and approve the requested permissions. Existing worksheet data is preserved; required worksheets are created if missing.
4. In Apps Script **Project Settings → Script Properties**, add `API_TOKEN` with a long random value.
5. Select **Deploy → New deployment → Web app**. Set **Execute as: Me**, choose the access setting required by your deployment, deploy, and copy the URL ending in `/exec`.
6. In Vercel project settings, add `VITE_API_URL` (the `/exec` URL) and `VITE_API_TOKEN` (the same token). Redeploy after changing environment variables.
7. Open the deployed site and go to **Company & Payments**. Review the prefilled THIVARA Solutions details, upload your UPI QR image (PNG/JPG/WebP, maximum 30 KB), and click **Save company & payment settings**.
8. Open **Services** and use **Load predefined catalogue** if the service catalogue is empty. Set prices before generating real invoices.
9. Test invoice and quotation PDF preview/download, verify all bank details and QR placement, then configure a daily time trigger for `backup()` in Apps Script.

## Local development
```bash
npm install
cp .env.example .env
# Edit VITE_API_URL and VITE_API_TOKEN in .env
npm run dev
```

## PDF updates
- `src/pdf.js`: branded two-page invoice/quotation PDFs, payment details and QR image, company/services page, and footer on every page.
- `src/App.jsx`: Company & Payments dashboard section; settings are read from and saved to the `Settings` worksheet.
- `public/logo.jpg`: supplied THIVARA Solutions logo used in PDF headers and application branding.

## Important security note
Vite variables prefixed with `VITE_` are included in the browser bundle. A token configured as `VITE_API_TOKEN` is visible to visitors and should not be treated as a secure production secret. Before storing sensitive live customer or payment records, add proper server-side authentication/authorization or a backend proxy that keeps secrets server-side. Limit access to the spreadsheet and Apps Script deployment accordingly.

## Google Sheets settings keys
The app saves the company and payment profile in the `Settings` worksheet using `Key` and `Value` columns. QR image data is stored as a data URL in `upi_qr_data`; use a small image to stay within Google Sheets cell limits.

## Branding & UI update
- `public/logo.jpg`: square THIVARA logo (app sidebar, favicon, PDF page-1 header). `public/logo-name.png`: name-only logo (mobile top bar, dashboard, PDF From block / footer / company page).
- `src/Services.jsx`: searchable service catalogue (category cards, per-service icons, inline edit) and the "Add service from catalogue" picker used in invoices/quotations. `src/icons.jsx`: category and service icon rules.
- `src/pdf.js`: phone-friendly PDF (16 mm margins, 11 pt body, tappable phone/email/WhatsApp/UPI links). No longer uses jspdf-autotable.
