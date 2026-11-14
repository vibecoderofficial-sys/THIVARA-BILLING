import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { calc, fmtDate, words } from './util.js';

const NAVY = [11, 37, 69];
const TEAL = [15, 163, 163];
const INK = [30, 41, 59];
const MUTED = [100, 116, 139];
const money = n => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let LG;

export async function getLogo() {
  if (LG !== undefined) return LG;
  try {
    const blob = await (await fetch('/logo.jpg')).blob();
    LG = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { LG = null; }
  return LG;
}

export const bus = { set: null };

export async function pdfAction(doc, cust, company, mode) {
  try {
    const pdf = buildPdf(doc, cust, company || {}, await getLogo());
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

function safeText(v) { return String(v ?? '').trim(); }
function addFooter(pdf, co, generatedDate) {
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.25);
    pdf.line(12, h - 15, w - 12, h - 15);
    pdf.setFont('helvetica', 'bold').setFontSize(7).setTextColor(...NAVY);
    pdf.text(safeText(co.name) || 'THIVARA Solutions', 12, h - 9.5);
    pdf.setFont('helvetica', 'normal').setTextColor(...MUTED);
    pdf.text('PDF generated: ' + generatedDate, 75, h - 9.5, { align: 'center' });
    if (safeText(co.email)) pdf.text(safeText(co.email), w - 12, h - 9.5, { align: 'right', maxWidth: 55 });
    if (safeText(co.website)) pdf.text(safeText(co.website).replace(/^https?:\/\//, ''), w - 12, h - 5.2, { align: 'right', maxWidth: 75 });
  }
}

function addHeader(pdf, doc, co, logo, isInvoice) {
  const w = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, 0, w, 34, 'F');
  if (logo) {
    try { pdf.addImage(logo, 'JPEG', 9, 7, 96, 18.9, undefined, 'FAST'); }
    catch { /* Logo is optional if the browser cannot decode the image. */ }
  }
  pdf.setFillColor(...TEAL);
  pdf.rect(0, 34, w, 1.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold').setFontSize(17);
  pdf.text(isInvoice ? 'INVOICE' : 'QUOTATION', w - 12, 15, { align: 'right' });
  pdf.setFont('helvetica', 'normal').setFontSize(9);
  pdf.text(safeText(doc.number) || 'DRAFT', w - 12, 23, { align: 'right' });
}

function addPaymentPanel(pdf, co, y, isInvoice) {
  const w = pdf.internal.pageSize.getWidth();
  const left = 14;
  const panelW = w - 28;
  const qrSize = co.qrData ? 34 : 0;
  const textW = panelW - (qrSize ? qrSize + 14 : 6);
  const lines = [];
  if (safeText(co.accountName)) lines.push('Account holder: ' + co.accountName);
  if (safeText(co.bank)) lines.push('Bank: ' + co.bank + (safeText(co.branch) ? ' | Branch: ' + co.branch : ''));
  if (safeText(co.account)) lines.push('Account No.: ' + co.account);
  if (safeText(co.ifsc)) lines.push('IFSC: ' + co.ifsc);
  if (safeText(co.upi)) lines.push('UPI ID: ' + co.upi);
  if (!lines.length) lines.push('Please contact THIVARA Solutions for payment instructions.');
  const wrapped = pdf.splitTextToSize(lines.join('\n'), textW - 8);
  const h = Math.max(34, wrapped.length * 4 + 13, qrSize + 10);
  pdf.setDrawColor(203, 213, 225);
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(left, y, panelW, h, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...NAVY);
  pdf.text(isInvoice ? 'PAYMENT DETAILS' : 'PAYMENT INFORMATION', left + 5, y + 7);
  pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...INK);
  pdf.text(wrapped.join('\n'), left + 5, y + 13);
  if (co.qrData) {
    try {
      const fmt = String(co.qrData).startsWith('data:image/jpeg') || String(co.qrData).startsWith('data:image/jpg') ? 'JPEG' : 'PNG';
      pdf.addImage(co.qrData, fmt, w - 14 - qrSize, y + 3, qrSize, qrSize, undefined, 'FAST');
      pdf.setFontSize(6.5).setTextColor(...MUTED).text('Scan to pay', w - 14 - qrSize / 2, y + qrSize + 5, { align: 'center' });
    } catch { /* Invalid or unsupported QR image is ignored rather than breaking PDF creation. */ }
  }
  return y + h;
}

function addCompanyPage(pdf, co, doc, isInvoice, logo) {
  const w = pdf.internal.pageSize.getWidth();
  pdf.addPage();
  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, 0, w, 28, 'F');
  pdf.setFillColor(...TEAL);
  pdf.rect(0, 28, w, 1.5, 'F');
  if (logo) { try { pdf.addImage(logo, 'JPEG', 10, 5, 58, 11.4, undefined, 'FAST'); } catch {} }
  pdf.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(10);
  pdf.text('COMPANY PROFILE & SERVICE INFORMATION', 78, 17);
  let y = 42;
  const blockTitle = (title) => {
    pdf.setFillColor(...NAVY); pdf.roundedRect(14, y, w - 28, 8, 1.5, 1.5, 'F');
    pdf.setFont('helvetica', 'bold').setFontSize(9).setTextColor(255, 255, 255).text(title, 18, y + 5.4);
    y += 13;
  };
  const blockLines = (text, width = w - 34, size = 9) => {
    const val = safeText(text);
    if (!val) return;
    pdf.setFont('helvetica', 'normal').setFontSize(size).setTextColor(...INK);
    const lines = pdf.splitTextToSize(val, width);
    pdf.text(lines.join('\n'), 17, y);
    y += lines.length * (size * 0.48) + 5;
  };

  blockTitle('COMPANY CONTACT DETAILS');
  blockLines(safeText(co.address));
  blockLines([co.phone ? 'Phone: ' + co.phone : '', co.alternate ? 'Alternate: ' + co.alternate : '', co.whatsapp ? 'WhatsApp: ' + co.whatsapp : ''].filter(Boolean).join('  |  '));
  blockLines([co.email ? 'Email: ' + co.email : '', co.website ? 'Website: ' + co.website : ''].filter(Boolean).join('  |  '));
  blockLines(co.instagram ? 'Instagram: ' + co.instagram : '', w - 34, 8);
  if (safeText(co.gstin)) blockLines('GSTIN: ' + co.gstin);

  y += 1;
  blockTitle('SERVICES');
  const serviceText = safeText(co.services) || 'IT Solutions, Website Development, Software Development, AI Solutions, Networking & Infrastructure, DevOps & Cloud Support, Hardware & IoT Solutions, Digital Services & Technical Consultation';
  const serviceLines = serviceText.split(/,\s*/).filter(Boolean).map(s => '• ' + s);
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK);
  const serviceWrapped = pdf.splitTextToSize(serviceLines.join('\n'), w - 38);
  pdf.text(serviceWrapped.join('\n'), 18, y);
  y += serviceWrapped.length * 4.8 + 6;

  if (safeText(doc.notes)) {
    blockTitle(isInvoice ? 'SERVICE NOTES' : 'SCOPE OF WORK');
    blockLines(doc.notes, w - 34, 8.5);
  }
  if (safeText(doc.terms)) {
    blockTitle('TERMS & CONDITIONS');
    blockLines(doc.terms, w - 34, 8.5);
  }
  if (safeText(co.disclaimer)) {
    blockTitle('DISCLAIMER');
    blockLines(co.disclaimer, w - 34, 8.5);
  }
  if (!safeText(doc.terms) && !safeText(co.disclaimer)) {
    blockTitle('CONTACT & SUPPORT');
    blockLines('For service enquiries, billing questions or support, contact THIVARA Solutions using the contact details listed above.');
  }
}

export function buildPdf(doc, cust, company, logo) {
  const co = company || {};
  const isInvoice = doc.kind === 'invoice';
  const pdf = new jsPDF({ format: 'a4' });
  const w = pdf.internal.pageSize.getWidth();
  const calcResult = calc(doc.items || [], doc);
  const generatedDate = fmtDate(new Date().toISOString().slice(0, 10));

  addHeader(pdf, doc, co, logo, isInvoice);
  pdf.setTextColor(...INK).setFont('helvetica', 'bold').setFontSize(9);
  pdf.text('BILL TO', 14, 44);
  pdf.setFont('helvetica', 'normal').setFontSize(8.5);
  const customerLines = [
    safeText(cust?.name), safeText(cust?.business), safeText(cust?.address),
    [cust?.city, cust?.state, cust?.pin].filter(Boolean).join(', '),
    cust?.phone ? 'Phone: ' + cust.phone : '',
    cust?.email ? 'Email: ' + cust.email : '',
    cust?.gstin ? 'GSTIN: ' + cust.gstin : ''
  ].filter(Boolean);
  pdf.text(customerLines.length ? customerLines.join('\n') : 'Customer details not provided', 14, 50, { maxWidth: 90 });

  pdf.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...INK);
  const dateLines = [
    `Date: ${fmtDate(doc.date)}`,
    isInvoice ? `Due date: ${fmtDate(doc.due)}` : `Valid until: ${fmtDate(doc.valid)}`,
    isInvoice && doc.ref ? `Reference: ${doc.ref}` : '',
    !isInvoice && doc.timeline ? `Delivery: ${doc.timeline}` : ''
  ].filter(Boolean).join('\n');
  pdf.text(dateLines, w - 14, 44, { align: 'right' });

  pdf.autoTable({
    startY: 77,
    margin: { left: 14, right: 14, bottom: 22 },
    head: [['#', 'Service / Description', 'Qty', 'Unit price', 'Discount', 'Tax %', 'Total']],
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2.1, overflow: 'linebreak', textColor: INK },
    body: calcResult.rows.map((row, i) => [
      String(i + 1), [safeText(row.name) + (row.type ? ` (${row.type})` : ''), safeText(row.desc)].filter(Boolean).join('\n'),
      `${row.qty} ${safeText(row.unit)}`, money(row.price), money(row.discount), `${doc.gst ? (row.tax || 0) : 0}%`, money(row.total)
    ]),
    columnStyles: { 0: { cellWidth: 7 }, 1: { cellWidth: 67 }, 2: { cellWidth: 14 }, 3: { cellWidth: 23 }, 4: { cellWidth: 20 }, 5: { cellWidth: 13 }, 6: { cellWidth: 25 } },
    didDrawPage: () => { /* Footer is applied after all pages are built. */ }
  });

  let y = (pdf.lastAutoTable?.finalY || 80) + 6;
  if (y > 190) { pdf.addPage(); y = 18; }
  const totalX = w - 14;
  const line = (label, value, bold = false) => {
    if (y > 230) { pdf.addPage(); y = 18; }
    pdf.setFont('helvetica', bold ? 'bold' : 'normal').setFontSize(bold ? 9.5 : 8.5).setTextColor(...INK);
    pdf.text(label, 119, y);
    pdf.text(String(value), totalX, y, { align: 'right' });
    y += bold ? 6.2 : 5.2;
  };
  line('Subtotal', money(calcResult.sub));
  line('Discount', money(calcResult.disc));
  if (doc.gst) {
    if (doc.interState) line('IGST', money(calcResult.igst));
    else { line('CGST', money(calcResult.cgst)); line('SGST', money(calcResult.sgst)); }
  }
  if (+doc.extra) line('Additional charges', money(doc.extra));
  line(isInvoice ? 'GRAND TOTAL' : 'ESTIMATED TOTAL', money(calcResult.total), true);
  if (isInvoice) {
    line('Amount paid', money(doc.paid));
    line('Balance due', money(calcResult.due), true);
  }
  pdf.setFont('helvetica', 'italic').setFontSize(7.5).setTextColor(...MUTED);
  pdf.text('Amount in words: ' + safeText(words(calcResult.total)), 14, Math.min(y + 1, 242), { maxWidth: 105 });
  y = y + 8;

  if (isInvoice) {
    if (y > 215) { pdf.addPage(); y = 18; }
    y = addPaymentPanel(pdf, co, y, true) + 5;
  } else if (safeText(doc.payTerms)) {
    pdf.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...NAVY).text('PAYMENT TERMS', 14, y);
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...INK).text(safeText(doc.payTerms), 14, y + 5, { maxWidth: 175 });
    y += 13;
  }
  if (safeText(doc.notes) && y < 265) {
    pdf.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...NAVY).text(isInvoice ? 'Notes' : 'Scope / notes', 14, y);
    pdf.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...INK);
    pdf.text(pdf.splitTextToSize(safeText(doc.notes), 178).join('\n'), 14, y + 4.5);
  }
  const signY = Math.min(y + 17, 278);
  pdf.setDrawColor(148, 163, 184).line(142, signY, w - 14, signY);
  pdf.setFont('helvetica', 'normal').setFontSize(7).setTextColor(...MUTED);
  pdf.text(isInvoice ? 'Authorized signature' : 'Customer acceptance & signature', 142, signY + 4);

  addCompanyPage(pdf, co, doc, isInvoice, logo);
  addFooter(pdf, co, generatedDate);
  return pdf;
}
