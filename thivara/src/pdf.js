import jsPDF from 'jspdf';import autoTable from 'jspdf-autotable';import {calc,fmtDate,words} from './util.js';
const N=[11,37,69],T=[15,163,163],m=n=>'Rs. '+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2});
export function buildPdf(doc,cust,co){const isI=doc.kind==='invoice',p=new jsPDF({format:'a4'}),W=210,c=calc(doc.items,doc);
 p.setFillColor(...N);p.rect(0,0,W,30,'F');p.setFillColor(...T);p.rect(0,30,W,2,'F');
 p.setTextColor(255);p.setFontSize(20).setFont('helvetica','bold').text(co.name||'THIVARA Solutions',14,15);
 p.setFontSize(8).setFont('helvetica','normal').text([co.address,[co.phone,co.email].filter(Boolean).join('  |  '),co.gstin?'GSTIN: '+co.gstin:''].filter(Boolean),14,21);
 p.setFontSize(18).setFont('helvetica','bold').text(isI?'INVOICE':'QUOTATION',W-14,15,{align:'right'});
 p.setFontSize(9).setFont('helvetica','normal').text(doc.number,W-14,22,{align:'right'});
 p.setTextColor(30);p.setFontSize(9).text(['Bill to:',cust?.name||'',cust?.business||'',cust?.address||'',[cust?.city,cust?.state,cust?.pin].filter(Boolean).join(', '),cust?.gstin?'GSTIN: '+cust.gstin:'',cust?.phone||''].filter(Boolean),14,42);
 p.text([`Date: ${fmtDate(doc.date)}`,isI?`Due: ${fmtDate(doc.due)}`:`Valid until: ${fmtDate(doc.valid)}`,isI&&doc.ref?`Ref/PO: ${doc.ref}`:'',!isI&&doc.timeline?`Delivery: ${doc.timeline}`:''].filter(Boolean),W-14,42,{align:'right'});
 autoTable(p,{startY:76,head:[['#','Service','Qty','Unit price','Disc.','Tax %','Total']],headStyles:{fillColor:N},styles:{fontSize:8},
  body:c.rows.map((r,i)=>[i+1,`${r.name}${r.type?' ('+r.type+')':''}\n${r.desc||''}`,`${r.qty} ${r.unit||''}`,m(r.price),m(r.discount),r.tax,m(r.total)]),columnStyles:{1:{cellWidth:68}}});
 let y=p.lastAutoTable.finalY+6;const L=(k,v,b)=>{p.setFont('helvetica',b?'bold':'normal').text(k,120,y);p.text(v,W-14,y,{align:'right'});y+=5.5};
 p.setFontSize(9);L('Subtotal',m(c.sub));L('Discount',m(c.disc));if(doc.gst){if(doc.interState)L('IGST',m(c.igst));else{L('CGST',m(c.cgst));L('SGST',m(c.sgst))}}
 if(+doc.extra)L('Additional charges',m(doc.extra));L(isI?'Grand total':'Estimated total',m(c.total),1);if(isI){L('Amount paid',m(doc.paid));L('Balance due',m(c.due),1)}
 p.setFont('helvetica','italic').setFontSize(8).text(words(c.total),14,y-5);y+=4;p.setFont('helvetica','normal');
 const B=(t,s)=>{if(!s)return;if(y>262){p.addPage();y=20}p.setFont('helvetica','bold').setFontSize(9).text(t,14,y);y+=4.5;p.setFont('helvetica','normal').setFontSize(8);const l=p.splitTextToSize(s,182);p.text(l,14,y);y+=l.length*3.8+4};
 B(isI?'Payment details':'Payment terms',isI?co.bank:doc.payTerms);B('Scope / notes',doc.notes);B('Terms & conditions',doc.terms);
 p.setDrawColor(150).line(140,Math.max(y+14,270),W-14,Math.max(y+14,270));p.setFontSize(8).text(isI?'Authorized signature':'Customer acceptance & signature',140,Math.max(y+18,274));
 return p}
