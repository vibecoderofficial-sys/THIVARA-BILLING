import { jsPDF } from 'jspdf';
import { calc, fmtDate, words } from './util.js';

/* ------------------------------------------------------------------ *
 *  THIVARA Solutions - invoice / quotation PDF
 *  - Palette comes from the logo: black, electric blue -> cyan, silver.
 *  - Phone friendly: single column, large type (11 pt body), 16 mm side
 *    margins, tappable phone / email / website / WhatsApp / UPI links.
 *  - Square logo in the page-1 header, name-only logo wherever the
 *    company name appears (From block, footer, company page header).
 * ------------------------------------------------------------------ */

const BLACK = [1, 1, 3];           // same black as the logo background
const INK = [15, 23, 42];
const MUTED = [100, 116, 139];
const BLUE = [10, 85, 214];
const CYAN = [39, 211, 247];
const SILVER = [201, 209, 220];
const LIGHT = [244, 247, 252];
const TINT = [234, 242, 255];
const LINE = [214, 223, 236];
const GRAD = [[10, 63, 216], [30, 136, 255], [39, 211, 247]];

const PAGE_W = 210, PAGE_H = 297;
const M = 16;                       // left / right margin (mm)
const CW = PAGE_W - 2 * M;          // content width
const FOOT_H = 15;                  // footer band height
const BOTTOM = PAGE_H - FOOT_H - 8; // lowest y content may reach
const PT = 0.3528;                  // 1 pt in mm

const fmtNum = n => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = n => 'Rs. ' + fmtNum(n);
const safeText = v => String(v ?? '').replace(/₹/g, 'Rs.').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ /g, ' ').trim();

/* ---------------- logo assets ---------------- */
let ASSETS;
const loadImg = src => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
async function flatten(src, quality) {
  const im = await loadImg(src);
  const c = document.createElement('canvas');
  c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext('2d');
  x.fillStyle = `rgb(${BLACK.join(',')})`; x.fillRect(0, 0, c.width, c.height); // PDF bands are black, so flatten onto black
  x.drawImage(im, 0, 0);
  return { data: c.toDataURL('image/jpeg', quality), w: c.width, h: c.height };
}
/** { logo, name } - each { data, w, h } or null when an image cannot be loaded. */
export async function getAssets() {
  if (ASSETS) return ASSETS;
  const one = (src, q) => flatten(src, q).catch(() => null);
  ASSETS = { logo: await one('/logo.jpg', 0.92), name: await one('/logo-name.png', 0.95) };
  return ASSETS;
}

export const bus = { set: null };

export async function pdfAction(doc, cust, company, mode) {
  try {
    const pdf = buildPdf(doc, cust, company || {}, await getAssets());
    const name = (doc.number || 'document') + '.pdf';
    if (mode === 'download') return pdf.save(name);
    const url = URL.createObjectURL(pdf.output('blob'));
    if (mode === 'preview') return bus.set && bus.set({ url, name });
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0';
    frame.src = url;
    document.body.appendChild(frame);
    frame.onload = () => { frame.contentWindow.focus(); frame.contentWindow.print(); };
  } catch (error) {
    alert('Could not create the PDF: ' + error.message);
  }
}

/* ---------------- drawing helpers ---------------- */
function lerp(a, b, t) { return a + (b - a) * t; }
function gradAt(t) {
  const seg = t < 0.5 ? 0 : 1, u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  return GRAD[seg].map((v, i) => Math.round(lerp(v, GRAD[seg + 1][i], u)));
}
/** Horizontal logo-style gradient (deep blue -> blue -> cyan) drawn as thin strips. */
function gradBar(pdf, x, y, w, h, steps = 56) {
  const sw = w / steps;
  for (let i = 0; i < steps; i++) {
    pdf.setFillColor(...gradAt(i / (steps - 1)));
    pdf.rect(x + i * sw, y, sw + 0.3, h, 'F');
  }
}
function txt(pdf, s, x, top, o = {}) {
  const size = o.size || 11;
  pdf.setFont('helvetica', o.bold ? 'bold' : o.italic ? 'italic' : 'normal').setFontSize(size).setTextColor(...(o.color || INK));
  const base = top + size * PT * 0.8;
  const str = String(s);
  const w = pdf.getTextWidth(str);
  const px = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
  pdf.text(str, px, base);
  if (o.link) {
    if (!o.plain) pdf.setDrawColor(...(o.color || BLUE)).setLineWidth(0.2).line(px, base + 0.7, px + w, base + 0.7);
    pdf.link(px, top, w, size * PT * 1.2, { url: o.link });
  }
  return w;
}
const lineH = size => size * PT * 1.45;
function wrap(pdf, s, width, size, bold = false) {
  pdf.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(size);
  return pdf.splitTextToSize(safeText(s), width);
}
function card(pdf, x, y, w, h, fill, stroke, r = 2.5) {
  pdf.setFillColor(...fill);
  if (stroke) { pdf.setDrawColor(...stroke).setLineWidth(0.3); pdf.roundedRect(x, y, w, h, r, r, 'FD'); }
  else pdf.roundedRect(x, y, w, h, r, r, 'F');
}
function image(pdf, img, x, y, h) {
  if (!img) return 0;
  const w = h * (img.w / img.h);
  try { pdf.addImage(img.data, 'JPEG', x, y, w, h, undefined, 'FAST'); return w; } catch { return 0; }
}
const digits = s => String(s || '').replace(/\D/g, '');
const tel = s => 'tel:+' + (digits(s).length === 10 ? '91' : '') + digits(s);
const wa = s => 'https://wa.me/' + (digits(s).length === 10 ? '91' : '') + digits(s);
const web = s => (/^https?:\/\//i.test(s) ? s : 'https://' + s);
const bareUrl = s => safeText(s).replace(/^https?:\/\/(www\.)?/i, '').replace(/[?#].*$/, '').replace(/\/$/, '');

/* ---------------- page furniture ---------------- */
function headerFirst(pdf, doc, co, A, isInvoice) {
  pdf.setFillColor(...BLACK).rect(0, 0, PAGE_W, 42, 'F');
  gradBar(pdf, 0, 42, PAGE_W, 1.8);
  if (A.logo) image(pdf, A.logo, M - 4, 3, 36);
  else txt(pdf, safeText(co.name) || 'THIVARA Solutions', M, 14, { size: 18, bold: true, color: [255, 255, 255] });
  txt(pdf, isInvoice ? 'INVOICE' : 'QUOTATION', PAGE_W - M, 11, { size: 24, bold: true, color: [255, 255, 255], align: 'right' });
  txt(pdf, safeText(doc.number) || 'DRAFT', PAGE_W - M, 23, { size: 13, bold: true, color: CYAN, align: 'right' });
  txt(pdf, 'Issued ' + fmtDate(doc.date), PAGE_W - M, 31, { size: 9.5, color: SILVER, align: 'right' });
}
function headerRunning(pdf, doc, A, isInvoice, title) {
  pdf.setFillColor(...BLACK).rect(0, 0, PAGE_W, 18, 'F');
  gradBar(pdf, 0, 18, PAGE_W, 1.2);
  if (A.name) image(pdf, A.name, M, 4.5, 9); else txt(pdf, 'THIVARA Solutions', M, 5, { size: 12, bold: true, color: [255, 255, 255] });
  txt(pdf, title || `${isInvoice ? 'Invoice' : 'Quotation'} ${safeText(doc.number)}`, PAGE_W - M, 5.2, { size: 10, bold: true, color: SILVER, align: 'right' });
}
function headerCompany(pdf, A, co) {
  pdf.setFillColor(...BLACK).rect(0, 0, PAGE_W, 32, 'F');
  gradBar(pdf, 0, 32, PAGE_W, 1.5);
  if (A.name) image(pdf, A.name, M, 8, 14); else txt(pdf, safeText(co.name) || 'THIVARA Solutions', M, 10, { size: 18, bold: true, color: [255, 255, 255] });
  txt(pdf, 'COMPANY PROFILE', PAGE_W - M, 9, { size: 12, bold: true, color: [255, 255, 255], align: 'right' });
  txt(pdf, 'Services & contact', PAGE_W - M, 17, { size: 9.5, color: SILVER, align: 'right' });
}
function addFooters(pdf, co, A) {
  const pages = pdf.getNumberOfPages(), generated = fmtDate(new Date().toISOString().slice(0, 10));
  const email = safeText(co.email), site = bareUrl(co.website);
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    const y0 = PAGE_H - FOOT_H;
    pdf.setFillColor(...BLACK).rect(0, y0, PAGE_W, FOOT_H, 'F');
    gradBar(pdf, 0, y0, PAGE_W, 0.9);
    if (A.name) image(pdf, A.name, M, y0 + 4, 7); else txt(pdf, safeText(co.name) || 'THIVARA Solutions', M, y0 + 4.5, { size: 9, bold: true, color: [255, 255, 255] });
    txt(pdf, `Page ${p} of ${pages}`, PAGE_W / 2 + 4, y0 + 3.6, { size: 8, color: SILVER, align: 'center' });
    txt(pdf, 'Generated ' + generated, PAGE_W / 2 + 4, y0 + 8, { size: 8, color: [140, 150, 168], align: 'center' });
    if (email) txt(pdf, email, PAGE_W - M, y0 + 3.4, { size: 8, color: CYAN, align: 'right', link: 'mailto:' + email, plain: true });
    if (site) txt(pdf, site, PAGE_W - M, y0 + 8, { size: 8, color: SILVER, align: 'right', link: web(safeText(co.website)), plain: true });
  }
}

/* ---------------- flowing layout (handles page breaks) ---------------- */
function makeFlow(pdf, doc, A, isInvoice) {
  const f = { y: 0 };
  f.newPage = (title) => { pdf.addPage(); headerRunning(pdf, doc, A, isInvoice, title); f.y = 28; };
  f.ensure = (h, title) => { if (f.y + h > BOTTOM) { f.newPage(title); return true; } return false; };
  return f;
}
function sectionTitle(pdf, f, title) {
  f.ensure(16);
  gradBar(pdf, M, f.y + 0.5, 2.2, 6.5, 6);
  txt(pdf, title, M + 5, f.y + 0.8, { size: 12.5, bold: true, color: INK });
  f.y += 11;
}
function paragraph(pdf, f, text, { size = 10.5, color = INK, x = M, w = CW, gap = 4 } = {}) {
  const lines = wrap(pdf, text, w, size);
  const lh = lineH(size);
  for (const ln of lines) { f.ensure(lh); txt(pdf, ln, x, f.y, { size, color }); f.y += lh; }
  f.y += gap;
}

/* ---------------- page 1 blocks ---------------- */
function metaStrip(pdf, f, doc, isInvoice, total, paid) {
  const cells = [[isInvoice ? 'INVOICE NO.' : 'QUOTE NO.', safeText(doc.number) || 'DRAFT'], ['DATE', fmtDate(doc.date)], [isInvoice ? 'DUE DATE' : 'VALID UNTIL', fmtDate(isInvoice ? doc.due : doc.valid)]];
  if (isInvoice) cells.push(['STATUS', total > 0 && paid >= total ? 'PAID' : paid > 0 ? 'PART PAID' : 'UNPAID']);
  else if (safeText(doc.timeline)) cells.push(['DELIVERY', safeText(doc.timeline)]);
  const h = 17, cw = CW / cells.length;
  card(pdf, M, f.y, CW, h, LIGHT, LINE);
  cells.forEach(([l, v], i) => {
    const x = M + i * cw;
    if (i) pdf.setDrawColor(...LINE).setLineWidth(0.3).line(x, f.y + 3, x, f.y + h - 3);
    txt(pdf, l, x + 4, f.y + 3.6, { size: 8, bold: true, color: MUTED });
    const status = l === 'STATUS';
    const col = status ? (v === 'PAID' ? [16, 140, 90] : v === 'UNPAID' ? [200, 60, 60] : [200, 130, 20]) : INK;
    const wrapped = wrap(pdf, v, cw - 6, 10.5, true)[0];
    txt(pdf, wrapped, x + 4, f.y + 9, { size: 10.5, bold: true, color: col });
  });
  f.y += h + 6;
}
function partyBlocks(pdf, f, cust, co, A) {
  // FROM - black card, company name appears as the name-only logo
  const lines = [safeText(co.address)].filter(Boolean).flatMap(a => wrap(pdf, a, CW - 12, 9.5));
  const contact = [co.phone ? 'Phone: ' + safeText(co.phone) : '', co.email ? safeText(co.email) : ''].filter(Boolean).join('   |   ');
  if (contact) lines.push(...wrap(pdf, contact, CW - 12, 9.5));
  if (safeText(co.gstin)) lines.push('GSTIN: ' + safeText(co.gstin));
  const nameH = A.name ? 8 : 6;
  const h = 5 + 4 + nameH + 2 + lines.length * lineH(9.5) + 3;
  f.ensure(h + 4);
  card(pdf, M, f.y, CW, h, BLACK);
  gradBar(pdf, M + 6, f.y + 1.4, 22, 0.8, 12);
  txt(pdf, 'FROM', M + CW - 6, f.y + 4, { size: 8, bold: true, color: CYAN, align: 'right' });
  if (A.name) image(pdf, A.name, M + 6, f.y + 5, nameH); else txt(pdf, safeText(co.name) || 'THIVARA Solutions', M + 6, f.y + 5, { size: 15, bold: true, color: [255, 255, 255] });
  let y = f.y + 5 + nameH + 2;
  lines.forEach(l => { txt(pdf, l, M + 6, y, { size: 9.5, color: SILVER }); y += lineH(9.5); });
  f.y += h + 4;

  // BILL TO
  const c = cust || {};
  const body = [safeText(c.business), safeText(c.address), [c.city, c.state, c.pin].filter(Boolean).map(safeText).join(', '), c.phone ? 'Phone: ' + safeText(c.phone) : '', c.email ? 'Email: ' + safeText(c.email) : '', c.gstin ? 'GSTIN: ' + safeText(c.gstin) : ''].filter(Boolean).flatMap(l => wrap(pdf, l, CW - 12, 10));
  const nm = safeText(c.name) || 'Customer details not provided';
  const bh = 6 + 5 + 7 + body.length * lineH(10) + 4;
  f.ensure(bh + 4);
  card(pdf, M, f.y, CW, bh, [255, 255, 255], LINE);
  gradBar(pdf, M, f.y + 2.5, 1.6, bh - 5, 8);
  txt(pdf, 'BILL TO', M + 6, f.y + 4, { size: 8, bold: true, color: BLUE });
  txt(pdf, nm, M + 6, f.y + 10, { size: 13, bold: true });
  let by = f.y + 17.5;
  body.forEach(l => { txt(pdf, l, M + 6, by, { size: 10, color: [51, 65, 85] }); by += lineH(10); });
  f.y += bh + 7;
}

const COLS = { svc: M, qty: M + 84, rate: M + 128, amt: M + CW };   // qty = left edge of qty col; rate/amt = right edges
function tableHead(pdf, f) {
  f.ensure(20);
  pdf.setFillColor(...BLACK).roundedRect(M, f.y, CW, 9, 1.8, 1.8, 'F');
  const o = { size: 8.5, bold: true, color: [255, 255, 255] };
  txt(pdf, 'SERVICE', COLS.svc + 4, f.y + 2.7, o);
  txt(pdf, 'QTY', COLS.qty + 12, f.y + 2.7, { ...o, align: 'center' });
  txt(pdf, 'RATE (Rs.)', COLS.rate - 2, f.y + 2.7, { ...o, align: 'right' });
  txt(pdf, 'AMOUNT (Rs.)', COLS.amt - 3, f.y + 2.7, { ...o, align: 'right' });
  gradBar(pdf, M + 3, f.y + 8.2, CW - 6, 0.8, 40);
  f.y += 10;
}
function itemRows(pdf, f, rows, doc) {
  tableHead(pdf, f);
  rows.forEach((r, i) => {
    const nameLines = wrap(pdf, safeText(r.name) + (r.type ? ` (${safeText(r.type)})` : ''), 78, 10.5, true);
    const descLines = safeText(r.desc) && safeText(r.desc) !== safeText(r.name) ? wrap(pdf, r.desc, 78, 9) : [];
    const extra = [];
    if (+r.discount) extra.push('Discount Rs. ' + fmtNum(r.discount));
    if (doc.gst && +r.tax) extra.push('GST ' + r.tax + '%');
    const h = 3.5 + nameLines.length * lineH(10.5) + descLines.length * lineH(9) + (extra.length ? lineH(8.5) : 0) + 3;
    if (f.y + h > BOTTOM) { f.newPage(); tableHead(pdf, f); }
    if (i % 2 === 0) { pdf.setFillColor(...LIGHT).rect(M, f.y, CW, h, 'F'); }
    let y = f.y + 3.5;
    nameLines.forEach(l => { txt(pdf, l, COLS.svc + 4, y, { size: 10.5, bold: true }); y += lineH(10.5); });
    descLines.forEach(l => { txt(pdf, l, COLS.svc + 4, y, { size: 9, color: MUTED }); y += lineH(9); });
    if (extra.length) txt(pdf, extra.join('  |  '), COLS.svc + 4, y, { size: 8.5, color: BLUE });
    txt(pdf, String(r.qty), COLS.qty + 12, f.y + 3.5, { size: 10.5, bold: true, align: 'center' });
    txt(pdf, safeText(r.unit), COLS.qty + 12, f.y + 3.5 + lineH(10.5), { size: 8, color: MUTED, align: 'center' });
    txt(pdf, fmtNum(r.price), COLS.rate - 2, f.y + 3.5, { size: 10.5, align: 'right' });
    txt(pdf, fmtNum(r.total), COLS.amt - 3, f.y + 3.5, { size: 10.5, bold: true, align: 'right' });
    pdf.setDrawColor(...LINE).setLineWidth(0.2).line(M, f.y + h, M + CW, f.y + h);
    f.y += h;
  });
  f.y += 6;
}
function totals(pdf, f, doc, c, isInvoice) {
  const rows = [['Subtotal', c.sub], ['Discount', -c.disc]];
  if (doc.gst) { if (doc.interState) rows.push(['IGST', c.igst]); else rows.push(['CGST', c.cgst], ['SGST', c.sgst]); }
  if (+doc.extra) rows.push(['Additional charges', +doc.extra]);
  const bw = 92, bx = M + CW - bw;
  const need = rows.length * 7 + 14 + (isInvoice ? 24 : 0);
  const wordsLines = wrap(pdf, words(c.total), CW - bw - 8, 10);
  f.ensure(Math.max(need, 30));
  const top = f.y;
  // amount in words (left)
  txt(pdf, 'AMOUNT IN WORDS', M, top + 1, { size: 8, bold: true, color: MUTED });
  let wy = top + 7; wordsLines.forEach(l => { txt(pdf, l, M, wy, { size: 10, italic: true, color: [51, 65, 85] }); wy += lineH(10); });
  // totals (right)
  let y = top;
  rows.forEach(([l, v]) => { txt(pdf, l, bx + 2, y, { size: 10.5, color: [51, 65, 85] }); txt(pdf, (v < 0 ? '- ' : '') + money(Math.abs(v)), bx + bw - 2, y, { size: 10.5, align: 'right' }); y += 7; });
  y += 1;
  gradBar(pdf, bx, y, bw, 12, 40);
  txt(pdf, isInvoice ? 'GRAND TOTAL' : 'ESTIMATED TOTAL', bx + 4, y + 3.4, { size: 10, bold: true, color: [255, 255, 255] });
  txt(pdf, money(c.total), bx + bw - 4, y + 3, { size: 12, bold: true, color: [255, 255, 255], align: 'right' });
  y += 16;
  if (isInvoice) {
    txt(pdf, 'Amount paid', bx + 2, y, { size: 10.5, color: [51, 65, 85] }); txt(pdf, money(doc.paid), bx + bw - 2, y, { size: 10.5, align: 'right' }); y += 8;
    pdf.setFillColor(...BLACK).rect(bx, y - 1, bw, 11, 'F');
    txt(pdf, 'BALANCE DUE', bx + 4, y + 2, { size: 10, bold: true, color: SILVER });
    txt(pdf, money(c.due), bx + bw - 4, y + 1.7, { size: 12, bold: true, color: CYAN, align: 'right' });
    y += 12;
  }
  f.y = Math.max(y, wy) + 6;
}
function upiLink(co, doc, due) {
  const pa = safeText(co.upi); if (!pa) return '';
  const q = [`pa=${encodeURIComponent(pa)}`, `pn=${encodeURIComponent(safeText(co.name) || 'THIVARA Solutions')}`, 'cu=INR'];
  if (due > 0) q.push(`am=${due.toFixed(2)}`);
  if (doc.number) q.push(`tn=${encodeURIComponent(safeText(doc.number))}`);
  return 'upi://pay?' + q.join('&');
}
function paymentPanel(pdf, f, co, doc, due) {
  const qr = co.qrData ? 38 : 0;
  const tw = CW - 12 - (qr ? qr + 6 : 0);
  const rows = [['Account holder', co.accountName], ['Bank', co.bank + (safeText(co.branch) ? ' - ' + co.branch : '')], ['Account no.', co.account], ['IFSC', co.ifsc], ['UPI ID', co.upi]].filter(([, v]) => safeText(v));
  const rowH = r => wrap(pdf, r[1], tw - 34, 10.5, true).length * lineH(10.5) + 1.2;
  const rh = rows.map(rowH);
  const upi = upiLink(co, doc, due);
  const btnH = upi && due > 0 ? 14 : 0;
  const bodyH = Math.max(rh.reduce((a, b) => a + b, 0) + btnH, qr ? qr + 8 : 0);
  const h = 12 + (rows.length ? bodyH : 8) + 5;
  f.ensure(h + 4);
  card(pdf, M, f.y, CW, h, TINT, [190, 212, 246]);
  gradBar(pdf, M, f.y + 2.5, 1.6, h - 5, 8);
  txt(pdf, 'PAYMENT DETAILS', M + 6, f.y + 4, { size: 8.5, bold: true, color: BLUE });
  let y = f.y + 11;
  if (!rows.length) txt(pdf, 'Please contact THIVARA Solutions for payment instructions.', M + 6, y, { size: 10 });
  rows.forEach((r, i) => {
    txt(pdf, r[0], M + 6, y + 0.4, { size: 9, color: MUTED });
    wrap(pdf, r[1], tw - 34, 10.5, true).forEach((l, k) => txt(pdf, l, M + 6 + 34, y + k * lineH(10.5), { size: 10.5, bold: true }));
    y += rh[i];
  });
  if (btnH) {
    const label = `Pay Rs. ${fmtNum(due)} via UPI`;
    const bw = Math.min(tw, 82), by = y + 3;
    gradBar(pdf, M + 6, by, bw, 10, 36);
    txt(pdf, label, M + 6 + bw / 2, by + 2.6, { size: 10.5, bold: true, color: [255, 255, 255], align: 'center' });
    pdf.link(M + 6, by, bw, 10, { url: upi });
  }
  if (qr) {
    const qx = M + CW - 6 - qr, qy = f.y + 9;
    pdf.setFillColor(255, 255, 255).roundedRect(qx - 1.5, qy - 1.5, qr + 3, qr + 3, 2, 2, 'F');
    try { pdf.addImage(co.qrData, /^data:image\/jpe?g/.test(co.qrData) ? 'JPEG' : 'PNG', qx, qy, qr, qr, undefined, 'FAST'); } catch { /* unreadable QR is skipped */ }
    txt(pdf, 'Scan to pay', qx + qr / 2, qy + qr + 3, { size: 8.5, color: MUTED, align: 'center' });
  }
  f.y += h + 7;
}

/* ---------------- company page ---------------- */
function companyPage(pdf, f, co, doc, isInvoice, A) {
  pdf.addPage(); headerCompany(pdf, A, co); f.y = 44;

  sectionTitle(pdf, f, 'Contact us');
  const rows = [['Address', safeText(co.address)], ['Phone', safeText(co.phone), tel(co.phone)], ['Alternate', safeText(co.alternate), tel(co.alternate)], ['WhatsApp', safeText(co.whatsapp), wa(co.whatsapp)],
    ['Email', safeText(co.email), 'mailto:' + safeText(co.email)], ['Website', bareUrl(co.website), web(safeText(co.website))], ['Instagram', bareUrl(co.instagram), web(safeText(co.instagram))], ['GSTIN', safeText(co.gstin)]].filter(r => r[1]);
  const ch = rows.reduce((a, r) => a + wrap(pdf, r[1], CW - 40, 10.5).length * lineH(10.5) + 2.2, 0) + 8;
  f.ensure(ch);
  card(pdf, M, f.y, CW, ch, LIGHT, LINE);
  let y = f.y + 5;
  rows.forEach(([l, v, link]) => {
    txt(pdf, l, M + 5, y + 0.4, { size: 9, bold: true, color: MUTED });
    const ls = wrap(pdf, v, CW - 40, 10.5);
    ls.forEach((ln, k) => txt(pdf, ln, M + 32, y + k * lineH(10.5), { size: 10.5, bold: !link, color: link ? BLUE : INK, link: link && k === 0 && ls.length === 1 ? link : undefined }));
    if (link && ls.length > 1) pdf.link(M + 32, y, CW - 40, ls.length * lineH(10.5), { url: link });
    y += ls.length * lineH(10.5) + 2.2;
  });
  f.y += ch + 9;

  sectionTitle(pdf, f, 'Our services');
  const services = (safeText(co.services) || 'IT Solutions, Website Development, Software Development, AI Solutions, Networking & Infrastructure, DevOps & Cloud Support, Hardware & IoT Solutions, Digital Services & Technical Consultation').split(/,\s*/).filter(Boolean);
  const sh = services.reduce((a, s) => a + wrap(pdf, s, CW - 18, 10.5, true).length * lineH(10.5) + 3, 0) + 7;
  f.ensure(sh);
  card(pdf, M, f.y, CW, sh, [255, 255, 255], LINE);
  y = f.y + 5;
  services.forEach((s, i) => {
    const ls = wrap(pdf, s, CW - 18, 10.5, true);
    pdf.setFillColor(...gradAt(i / Math.max(1, services.length - 1))).circle(M + 7, y + 1.9, 1.5, 'F');
    ls.forEach((l, k) => txt(pdf, l, M + 12, y + k * lineH(10.5), { size: 10.5, bold: true }));
    y += ls.length * lineH(10.5) + 3;
  });
  f.y += sh + 9;

  if (safeText(doc.notes)) { sectionTitle(pdf, f, isInvoice ? 'Service notes' : 'Scope of work'); paragraph(pdf, f, doc.notes, { size: 10 }); f.y += 3; }
  if (safeText(doc.terms)) { sectionTitle(pdf, f, 'Terms & conditions'); paragraph(pdf, f, doc.terms, { size: 10 }); f.y += 3; }
  if (safeText(co.disclaimer)) { sectionTitle(pdf, f, 'Disclaimer'); paragraph(pdf, f, co.disclaimer, { size: 10 }); }
  if (!safeText(doc.terms) && !safeText(co.disclaimer)) { sectionTitle(pdf, f, 'Contact & support'); paragraph(pdf, f, 'For service enquiries, billing questions or support, contact THIVARA Solutions using the details above.', { size: 10 }); }
}

/* ---------------- document ---------------- */
export function buildPdf(doc, cust, company, assets) {
  const co = company || {}, A = assets || {};
  const isInvoice = doc.kind === 'invoice';
  const pdf = new jsPDF({ format: 'a4', unit: 'mm', compress: true });
  const c = calc(doc.items || [], doc);
  pdf.setProperties({ title: `${isInvoice ? 'Invoice' : 'Quotation'} ${safeText(doc.number)} - ${safeText(co.name) || 'THIVARA Solutions'}`, author: safeText(co.name) || 'THIVARA Solutions', subject: isInvoice ? 'Invoice' : 'Quotation' });

  headerFirst(pdf, doc, co, A, isInvoice);
  const f = makeFlow(pdf, doc, A, isInvoice);
  f.y = 52;
  metaStrip(pdf, f, doc, isInvoice, c.total, +doc.paid || 0);
  partyBlocks(pdf, f, cust, co, A);
  itemRows(pdf, f, c.rows, doc);
  totals(pdf, f, doc, c, isInvoice);

  if (isInvoice) paymentPanel(pdf, f, co, doc, c.due);
  else if (safeText(doc.payTerms)) {
    sectionTitle(pdf, f, 'Payment terms');
    paragraph(pdf, f, doc.payTerms, { size: 10.5 });
  }

  // signature
  f.ensure(26);
  const sy = f.y + 14;
  pdf.setDrawColor(...SILVER).setLineWidth(0.4).line(M + CW - 66, sy, M + CW, sy);
  txt(pdf, isInvoice ? 'Authorized signature' : 'Customer acceptance & signature', M + CW, sy + 1.8, { size: 9, color: MUTED, align: 'right' });
  txt(pdf, 'Thank you for choosing ' + (safeText(co.name) || 'THIVARA Solutions') + '.', M, sy - 2, { size: 10.5, bold: true, color: BLUE });
  f.y = sy + 8;

  companyPage(pdf, f, co, doc, isInvoice, A);
  addFooters(pdf, co, A);
  pdf.setPage(1);
  return pdf;
}
