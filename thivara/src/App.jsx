import React,{useEffect,useMemo,useState} from 'react';
import {LayoutDashboard,FileText,FileSignature,Users,Layers,Plus,Trash2,Copy,Download,Printer,Search,Loader2,Receipt,CreditCard,Repeat,Monitor,Globe,Code2,Bot,Network,Cloud,Cpu,Briefcase,Eye,X,Menu,CheckCircle2,Info} from 'lucide-react';
import {api,demo} from './api.js';import {SEED,UNITS,TERMS} from './catalogue.js';import {inr,today,addDays,fmtDate,calc} from './util.js';import {pdfAction,bus} from './pdf.js';
const CO={name:'THIVARA Solutions',address:'Chennai, Tamil Nadu',phone:'',email:'',gstin:'',bank:'Bank: ____  A/C: ____  IFSC: ____\nUPI: ____'}; // edit before use
const QS=['Draft','Sent','Under Review','Accepted','Rejected','Expired','Converted to Invoice'];
const uid=()=>crypto.randomUUID();
const ICONS=[[/^IT/,Monitor],[/^Web/,Globe],[/^Software/,Code2],[/^AI/,Bot],[/^Network/,Network],[/^DevOps/,Cloud],[/^Hardware/,Cpu]];
const CatIcon=({name,size=16})=>{const I=(ICONS.find(([r])=>r.test(name||''))||[0,Briefcase])[1];return <I size={size}/>};
const BC={Paid:'bg-emerald-100 text-emerald-700','Partially Paid':'bg-amber-100 text-amber-700',Overdue:'bg-red-100 text-red-700',Unpaid:'bg-slate-100 text-slate-700',Cancelled:'bg-slate-200 text-slate-500'};
const Badge=({s})=><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BC[s]||'bg-slate-100'}`}>{s}</span>;
function PdfModal({p,close}){const r=React.useRef();return <div className="fixed inset-0 z-40 bg-black/60 p-3 sm:p-6"><div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white"><div className="flex flex-wrap items-center gap-2 bg-navy p-3 text-white"><b className="mr-auto">{p.name}</b><a className="btn" href={p.url} download={p.name}><Download size={16}/>Download</a><button className="btn2" onClick={()=>r.current&&r.current.contentWindow.print()}><Printer size={16}/>Print</button><a className="btn2" href={p.url} target="_blank" rel="noreferrer">Open in tab</a><button className="btn2" aria-label="Close preview" onClick={close}><X size={16}/></button></div><iframe ref={r} src={p.url} title="PDF preview" className="w-full flex-1"/></div></div>}
const L=({l,children})=><label className="block text-xs font-medium text-slate-600">{l}<div className="mt-1">{children}</div></label>;
const blank=k=>({kind:k,items:[],gst:true,interState:false,extra:0,paid:0,date:today(),due:addDays(today(),15),valid:addDays(today(),30),status:k==='invoice'?'Unpaid':'Draft',terms:TERMS.IT,payTerms:'50% advance, balance on delivery',timeline:'',notes:'',ref:''});
const newItem=()=>({id:uid(),cat:'',name:'',type:'',desc:'',qty:1,unit:'per project',price:0,discount:0,tax:18});
function payStatus(d,paidAmt,total){if(d.status==='Cancelled')return 'Cancelled';if(paidAmt>=total&&total>0)return 'Paid';if(paidAmt>0)return 'Partially Paid';return d.due<today()?'Overdue':'Unpaid'}

export default function App(){
 const [tab,setTab]=useState('dash'),[d,setD]=useState({customers:[],cats:[],services:[],invoices:[],quotes:[],payments:[]}),[busy,setBusy]=useState(true),[err,setErr]=useState(''),[edit,setEdit]=useState(null),[nav,setNav]=useState(false),[prev,setPrev]=useState(null),[msg,setMsg]=useState('');
 const load=async()=>{setBusy(true);setErr('');try{const[customers,cats,services,invoices,quotes,payments]=await Promise.all(['Customers','Service_Categories','Services','Invoices','Quotations','Payments'].map(api.list));setD({customers,cats,services,invoices,quotes,payments})}catch(e){setErr(e.message)}setBusy(false)};
 useEffect(()=>{bus.set=setPrev;load()},[]);
 const run=async f=>{setBusy(true);setErr('');try{await f();await load();setMsg('Saved');setTimeout(()=>setMsg(''),2000)}catch(e){setErr(e.message);setBusy(false)}};
 const cust=id=>d.customers.find(c=>c.id===id);
 const inv=useMemo(()=>d.invoices.map(i=>{const paid=d.payments.filter(p=>p.invoiceId===i.id).reduce((s,p)=>s+ +p.amount,0);return{...i,paid,outstanding:i.total-paid,status:payStatus(i,paid,+i.total)}}),[d]);
 const open=(kind,doc)=>{setEdit(doc?{...JSON.parse(doc.json),id:doc.id,number:doc.number,customerId:doc.customerId,status:doc.status}:blank(kind));setTab('form')};
 const save=doc=>run(async()=>{const c=calc(doc.items,doc),isI=doc.kind==='invoice',num=doc.number||await api.next(doc.kind);
  const row={id:doc.id||uid(),number:num,customerId:doc.customerId,date:doc.date,subtotal:c.sub,discount:c.disc,taxTotal:c.tax,total:c.total,status:doc.status,json:JSON.stringify({...doc,number:num,id:undefined})};
  if(isI)Object.assign(row,{due:doc.due,taxable:c.taxable,paid:0,outstanding:c.total,quotationId:doc.quotationId||''});else Object.assign(row,{valid:doc.valid,scope:doc.notes,terms:doc.terms});
  await api.save(isI?'Invoices':'Quotations',row);await api.log(doc.id?'update':'create',row.id,num);setEdit({...doc,id:row.id,number:num})});
 const seed=()=>run(async()=>{let n=0;for(const c of SEED){const id='cat-'+(++n);await api.save('Service_Categories',{id,name:c.name,description:c.types.join(', '),active:true});
  for(const s of c.services)await api.save('Services',{id:uid(),categoryId:id,name:s,type:'',desc:s,unit:c.unit,price:0,tax:18,active:true})}});
 const N=[['dash','Dashboard',LayoutDashboard],['invoices','Invoices',FileText],['quotes','Quotations',FileSignature],['customers','Customers',Users],['catalogue','Services',Layers]];
 return <div className="min-h-screen md:flex">
  <aside className={`${nav?'block':'hidden'} md:block md:w-64 shrink-0 bg-gradient-to-b from-[#030712] to-navy text-white md:sticky md:top-0 md:h-screen md:overflow-y-auto`}>
   <div className="p-4"><img src="/logo.jpg" alt="THIVARA Solutions" className="mx-auto w-40 rounded-xl"/></div>
   <nav className="px-3 pb-4">{N.map(([k,t,I])=><button key={k} onClick={()=>{setTab(k);setNav(false)}} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${tab===k||(tab==='form'&&edit&&((k==='invoices'&&edit.kind==='invoice')||(k==='quotes'&&edit.kind==='quote')))?'bg-teal text-white shadow':'text-white/75 hover:bg-white/10'}`}><I size={18}/>{t}</button>)}</nav>
   <p className="px-5 pb-4 text-xs text-white/40">Intelligence. Innovation. Impact.</p></aside>
  <main className="flex-1 p-4 md:p-6 min-w-0">
   <button className="btn2 mb-3 md:hidden" onClick={()=>setNav(!nav)}><Menu size={16}/>Menu</button>
   {busy&&<div className="mb-3 flex items-center gap-2 text-sm text-teal-600"><Loader2 className="animate-spin" size={16}/>Working…</div>}
   {err&&<div role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{err}</div>}
   {demo&&<div className="mb-4 flex items-start gap-2 rounded-xl border border-teal/30 bg-teal-50 p-3 text-sm text-teal-600"><Info size={16} className="mt-0.5 shrink-0"/>Demo mode: data is saved in this browser only. Add VITE_API_URL and VITE_API_TOKEN to use Google Sheets.</div>}
   {msg&&<div className="fixed right-4 top-4 z-30 flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm text-white shadow-lg"><CheckCircle2 size={16} className="text-teal"/>{msg}</div>}
   {prev&&<PdfModal p={prev} close={()=>setPrev(null)}/>}
   {tab==='dash'&&<Dash inv={inv} q={d.quotes} cust={cust} open={open} setTab={setTab}/>}
   {tab==='invoices'&&<List kind="invoice" rows={inv} cust={cust} open={open} d={d} run={run} setEdit={setEdit} setTab={setTab}/>}
   {tab==='quotes'&&<List kind="quote" rows={d.quotes} cust={cust} open={open} d={d} run={run} setEdit={setEdit} setTab={setTab}/>}
   {tab==='customers'&&<Cust d={d} run={run} inv={inv}/>}
   {tab==='catalogue'&&<Cat d={d} run={run} seed={seed}/>}
   {tab==='form'&&edit&&<Form key={edit.id||'new'} doc={edit} d={d} save={save} cust={cust} run={run} done={()=>setTab(edit.kind==='invoice'?'invoices':'quotes')}/>}
  </main></div>}

function Dash({inv,q,cust,open,setTab}){const billed=inv.reduce((s,i)=>s+ +i.total,0),paid=inv.reduce((s,i)=>s+i.paid,0),cnt=s=>q.filter(x=>x.status===s).length;
 const S=[['Invoices',inv.length],['Quotations',q.length],['Billed',inr(billed)],['Received',inr(paid)],['Outstanding',inr(billed-paid)],['Pending quotes',cnt('Sent')+cnt('Under Review')+cnt('Draft')],['Accepted',cnt('Accepted')],['Rejected',cnt('Rejected')]];
 const recent=[...inv.map(i=>({...i,k:'invoice'})),...q.map(i=>({...i,k:'quote'}))].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,6);
 return <div className="space-y-5"><h1 className="text-2xl font-bold">Dashboard</h1>
 <div className="flex flex-wrap gap-2"><button className="btn" onClick={()=>open('invoice')}><Plus size={16}/>New invoice</button><button className="btn" onClick={()=>open('quote')}><Plus size={16}/>New quotation</button>
  <button className="btn2" onClick={()=>setTab('customers')}>Add customer</button><button className="btn2" onClick={()=>setTab('catalogue')}>Manage services</button><button className="btn2" onClick={()=>setTab('invoices')}>Invoice history</button><button className="btn2" onClick={()=>setTab('quotes')}>Quotation history</button></div>
 <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{S.map(([l,v])=><div key={l} className="card"><div className="text-xs text-slate-500">{l}</div><div className="text-xl font-bold">{v}</div></div>)}</div>
 <div className="card"><h2 className="mb-2 font-semibold">Recent documents</h2>{recent.length?recent.map(r=><div key={r.id} className="flex justify-between border-t border-slate-100 py-2 text-sm"><span>{r.number} · {cust(r.customerId)?.name}</span><span>{inr(r.total)} · {r.status}</span></div>):<p className="text-sm text-slate-500">Nothing yet. Create your first invoice or quotation.</p>}</div></div>}

function List({kind,rows,cust,open,d,run,setEdit,setTab}){const [s,setS]=useState(''),[pay,setPay]=useState(null),I=kind==='invoice';
 const f=rows.filter(r=>(r.number+(cust(r.customerId)?.name||'')).toLowerCase().includes(s.toLowerCase()));
 const dup=r=>{const x=JSON.parse(r.json);setEdit({...x,id:undefined,number:'',status:I?'Unpaid':'Draft',date:today()});setTab('form')};
 const conv=r=>run(async()=>{const x=JSON.parse(r.json),n=await api.next('invoice'),id=uid(),dc={...x,kind:'invoice',number:n,date:today(),due:addDays(today(),15),status:'Unpaid',quotationId:r.id,paid:0},c=calc(dc.items,dc);
  await api.save('Invoices',{id,number:n,customerId:r.customerId,date:dc.date,due:dc.due,subtotal:c.sub,discount:c.disc,taxable:c.taxable,taxTotal:c.tax,total:c.total,paid:0,outstanding:c.total,status:'Unpaid',quotationId:r.id,json:JSON.stringify(dc)});
  await api.save('Quotations',{...r,status:'Converted to Invoice'});await api.log('convert',r.id,n)});
 const pdf=(r,m)=>pdfAction({...JSON.parse(r.json),kind:I?'invoice':'quote',number:r.number,paid:r.paid||0},cust(r.customerId),CO,m||'download');
 return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">{I?'Invoices':'Quotations'}</h1><button className="btn" onClick={()=>open(kind)}><Plus size={16}/>New</button></div>
 <div className="relative"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input className="inp pl-9" placeholder="Search number or customer" value={s} onChange={e=>setS(e.target.value)}/></div>
 <div className="card overflow-x-auto p-0"><table className="w-full text-sm"><thead><tr>{['Number','Customer','Date','Total',I?'Balance':'Status','Status',''].map((h,i)=><th key={i} className="th">{h}</th>)}</tr></thead><tbody>
 {f.map(r=><tr key={r.id}><td className="td font-medium">{r.number}</td><td className="td">{cust(r.customerId)?.name}</td><td className="td">{fmtDate(r.date)}</td><td className="td">{inr(r.total)}</td>
  <td className="td">{I?inr(r.outstanding):''}</td><td className="td">{I?<Badge s={r.status}/>:<select className="inp" value={r.status} onChange={e=>run(()=>api.save('Quotations',{...r,status:e.target.value}))}>{QS.map(x=><option key={x}>{x}</option>)}</select>}</td>
  <td className="td"><div className="flex gap-1">{[['Edit',null,()=>open(kind,r)],['Preview',Eye,()=>pdf(r,'preview')],['Duplicate',Copy,()=>dup(r)],['Download',Download,()=>pdf(r)],['Print',Printer,()=>pdf(r,'print')]].map(([t,Ic,fn])=><button key={t} title={t} aria-label={t} className="btn2 px-2" onClick={fn}>{Ic?<Ic size={14}/>:'Edit'}</button>)}
   {I&&r.status!=='Paid'&&<button title="Record payment" className="btn px-2" onClick={()=>setPay(r)}><CreditCard size={14}/></button>}
   {!I&&r.status==='Accepted'&&<button title="Convert to invoice" className="btn px-2" onClick={()=>conv(r)}><Repeat size={14}/></button>}</div></td></tr>)}
 </tbody></table>{!f.length&&<p className="p-4 text-sm text-slate-500">No records found.</p>}</div>
 {pay&&<Pay inv={pay} close={()=>setPay(null)} run={run}/>}</div>}

function Pay({inv,close,run}){const [p,setP]=useState({date:today(),amount:inv.outstanding,method:'UPI',ref:'',notes:''});
 return <div className="fixed inset-0 z-10 grid place-items-center bg-black/40 p-4"><div className="card w-full max-w-sm space-y-3"><h2 className="font-semibold">Record payment · {inv.number}</h2>
 <L l="Date"><input type="date" className="inp" value={p.date} onChange={e=>setP({...p,date:e.target.value})}/></L>
 <L l={`Amount (balance ${inr(inv.outstanding)}; use a negative amount for a refund)`}><input type="number" className="inp" value={p.amount} onChange={e=>setP({...p,amount:e.target.value})}/></L>
 <L l="Method"><select className="inp" value={p.method} onChange={e=>setP({...p,method:e.target.value})}>{['UPI','Cash','Bank transfer','Cheque','Card','Adjustment'].map(m=><option key={m}>{m}</option>)}</select></L>
 <L l="Transaction reference"><input className="inp" value={p.ref} onChange={e=>setP({...p,ref:e.target.value})}/></L>
 <div className="flex justify-end gap-2"><button className="btn2" onClick={close}>Cancel</button><button className="btn" disabled={!+p.amount} onClick={()=>{run(()=>api.save('Payments',{...p,id:uid(),invoiceId:inv.id}));close()}}>Save payment</button></div></div></div>}

function Cust({d,run,inv}){const [s,setS]=useState(''),[e,setE]=useState(null);const F=[['name','Name*'],['business','Business'],['phone','Phone*'],['email','Email'],['address','Billing address'],['city','City'],['state','State'],['pin','PIN code'],['gstin','GSTIN'],['notes','Notes']];
 const f=d.customers.filter(c=>JSON.stringify(c).toLowerCase().includes(s.toLowerCase()));
 return <div className="space-y-4"><div className="flex justify-between"><h1 className="text-2xl font-bold">Customers</h1><button className="btn" onClick={()=>setE({id:'',created:today()})}><Plus size={16}/>Add customer</button></div>
 <input className="inp" placeholder="Search customers" value={s} onChange={x=>setS(x.target.value)}/>
 {e&&<div className="card grid gap-3 sm:grid-cols-2">{F.map(([k,l])=><L key={k} l={l}><input className="inp" value={e[k]||''} onChange={x=>setE({...e,[k]:x.target.value})}/></L>)}
  <div className="flex gap-2 sm:col-span-2"><button className="btn" disabled={!e.name||!e.phone} onClick={()=>{run(()=>api.save('Customers',e));setE(null)}}>Save customer</button><button className="btn2" onClick={()=>setE(null)}>Cancel</button></div></div>}
 <div className="card overflow-x-auto p-0"><table className="w-full text-sm"><tbody>{f.map(c=><tr key={c.id}><td className="td font-medium">{c.name}<div className="text-xs text-slate-500">{c.business}</div></td><td className="td">{c.phone}</td>
  <td className="td">{inv.filter(i=>i.customerId===c.id).length} invoices · {inr(inv.filter(i=>i.customerId===c.id).reduce((a,i)=>a+i.outstanding,0))} due</td><td className="td"><button className="btn2" onClick={()=>setE(c)}>Edit</button></td></tr>)}</tbody></table>
  {!f.length&&<p className="p-4 text-sm text-slate-500">No customers yet.</p>}</div></div>}

function Cat({d,run,seed}){const [s,setS]=useState(''),[cat,setCat]=useState(''),[nc,setNc]=useState('');
 const f=d.services.filter(x=>(!cat||x.categoryId===cat)&&x.name.toLowerCase().includes(s.toLowerCase()));
 const up=(x,k,v)=>run(()=>api.save('Services',{...x,[k]:v}));
 return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">Service catalogue</h1>
  {!d.cats.length&&<button className="btn" onClick={seed}>Load predefined catalogue (8 categories)</button>}</div>
 <div className="flex flex-wrap gap-2">{d.cats.map(c=><button key={c.id} onClick={()=>setCat(cat===c.id?'':c.id)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${cat===c.id?'border-teal bg-teal text-white':'border-navy/15 bg-white hover:border-teal'}`}><CatIcon name={c.name} size={14}/>{c.name}</button>)}</div>
 <div className="flex flex-wrap gap-2"><input className="inp max-w-xs" placeholder="Search services" value={s} onChange={e=>setS(e.target.value)}/>
  <select className="inp max-w-xs" value={cat} onChange={e=>setCat(e.target.value)}><option value="">All categories</option>{d.cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
  <input className="inp max-w-xs" placeholder="New category name" value={nc} onChange={e=>setNc(e.target.value)}/><button className="btn2" disabled={!nc} onClick={()=>{run(()=>api.save('Service_Categories',{id:uid(),name:nc,active:true}));setNc('')}}>Add category</button>
  {cat&&<button className="btn2" onClick={()=>{const n=prompt('Rename category',d.cats.find(c=>c.id===cat).name);n&&run(()=>api.save('Service_Categories',{...d.cats.find(c=>c.id===cat),name:n}))}}>Rename</button>}
  {cat&&<button className="btn2" onClick={()=>run(()=>api.save('Services',{id:uid(),categoryId:cat,name:'New service',desc:'',unit:'per project',price:0,tax:18,active:true}))}>Add service</button>}</div>
 <div className="card overflow-x-auto p-0"><table className="w-full text-sm"><thead><tr>{['Service','Unit','Price ₹','GST %','Active'].map(h=><th key={h} className="th">{h}</th>)}</tr></thead><tbody>
 {f.map(x=><tr key={x.id}><td className="td"><input className="inp" defaultValue={x.name} onBlur={e=>e.target.value!==x.name&&up(x,'name',e.target.value)}/></td>
  <td className="td"><select className="inp" value={x.unit} onChange={e=>up(x,'unit',e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></td>
  <td className="td"><input type="number" className="inp w-28" defaultValue={x.price} onBlur={e=>up(x,'price',+e.target.value)}/></td>
  <td className="td"><input type="number" className="inp w-20" defaultValue={x.tax} onBlur={e=>up(x,'tax',+e.target.value)}/></td>
  <td className="td"><input type="checkbox" aria-label="Active" checked={x.active===true||x.active==='TRUE'} onChange={e=>up(x,'active',e.target.checked)}/></td></tr>)}</tbody></table></div></div>}

function Form({doc:init,d,save,cust,run,done}){const [doc,setDoc]=useState(init),I=doc.kind==='invoice',c=calc(doc.items,doc),[nc,setNc]=useState(null);
 const set=(k,v)=>setDoc(x=>({...x,[k]:v})),item=(id,k,v)=>set('items',doc.items.map(i=>i.id===id?{...i,[k]:v}:i));
 const pick=(id,sid)=>{const s=d.services.find(x=>x.id===sid),cat=d.cats.find(x=>x.id===s?.categoryId);if(s)set('items',doc.items.map(i=>i.id===id?{...i,sid,catId:cat?.id||'',cat:cat?.name||'',name:s.name,desc:s.desc,unit:s.unit,price:+s.price||0,tax:+s.tax||0}:i))};
 const valid=doc.customerId&&doc.items.length&&doc.items.every(i=>i.name&&i.qty>0),okPdf=doc.items.length>0&&doc.items.every(i=>i.name);
 const pdf=m=>pdfAction({...doc,number:doc.number||'DRAFT'},cust(doc.customerId),CO,m||'download');
 return <div className="space-y-4"><h1 className="text-2xl font-bold">{doc.id?'Edit':'New'} {I?'invoice':'quotation'} {doc.number}</h1>
 <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  <L l="Customer*"><select className="inp" value={doc.customerId||''} onChange={e=>e.target.value==='+'?setNc({}):set('customerId',e.target.value)}><option value="">Select…</option>{d.customers.map(x=><option key={x.id} value={x.id}>{x.name}{x.business?' — '+x.business:''}</option>)}<option value="+">+ New customer</option></select></L>
  <L l="Date"><input type="date" className="inp" value={doc.date} onChange={e=>set('date',e.target.value)}/></L>
  {I?<L l="Due date"><input type="date" className="inp" value={doc.due} onChange={e=>set('due',e.target.value)}/></L>:<L l="Valid until"><input type="date" className="inp" value={doc.valid} onChange={e=>set('valid',e.target.value)}/></L>}
  {I?<L l="PO / reference"><input className="inp" value={doc.ref} onChange={e=>set('ref',e.target.value)}/></L>:<L l="Delivery timeline"><input className="inp" value={doc.timeline} onChange={e=>set('timeline',e.target.value)}/></L>}
  <L l="Tax treatment"><select className="inp" value={doc.gst?(doc.interState?'igst':'gst'):'none'} onChange={e=>setDoc({...doc,gst:e.target.value!=='none',interState:e.target.value==='igst'})}><option value="gst">GST: CGST + SGST</option><option value="igst">GST: IGST (inter-state)</option><option value="none">Non-GST / exempt</option></select></L>
  <L l="Additional charges ₹"><input type="number" className="inp" value={doc.extra} onChange={e=>set('extra',e.target.value)}/></L></div>
 {nc&&<div className="card flex flex-wrap gap-2"><input className="inp max-w-xs" placeholder="Name*" onChange={e=>setNc({...nc,name:e.target.value})}/><input className="inp max-w-xs" placeholder="Phone*" onChange={e=>setNc({...nc,phone:e.target.value})}/>
  <button className="btn" disabled={!nc.name||!nc.phone} onClick={()=>{const id=uid();run(()=>api.save('Customers',{...nc,id,created:today()}));set('customerId',id);setNc(null)}}>Save customer</button></div>}
 {doc.items.map((i,n)=><div key={i.id} className="card grid gap-2 sm:grid-cols-6"><div className="sm:col-span-2"><L l={`Category (line ${n+1})`}><select className="inp" value={i.catId||''} onChange={e=>{const ct=d.cats.find(x=>x.id===e.target.value);setDoc(x=>({...x,items:x.items.map(t=>t.id===i.id?{...t,catId:e.target.value,cat:ct?ct.name:'',sid:'',type:''}:t)}))}}><option value="">All categories</option>{d.cats.map(ct=><option key={ct.id} value={ct.id}>{ct.name}</option>)}</select></L></div>
  <div className="sm:col-span-2"><L l="Service"><select className="inp" value={i.sid||''} onChange={e=>pick(i.id,e.target.value)}><option value="">Custom service</option>{d.services.filter(s=>(!i.catId||s.categoryId===i.catId)&&s.active!==false&&s.active!=='FALSE').map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></L></div>
  <div className="sm:col-span-2"><L l="Service type"><select className="inp" value={i.type} onChange={e=>item(i.id,'type',e.target.value)}><option value="">Select type</option>{((d.cats.find(x=>x.id===i.catId)||{}).description||'').split(', ').filter(Boolean).map(t=><option key={t}>{t}</option>)}</select></L></div>
  <div className="sm:col-span-6"><L l="Service name (editable)"><div className="flex items-center gap-2"><span className="text-teal-600"><CatIcon name={i.cat}/></span><input className="inp" value={i.name} onChange={e=>item(i.id,'name',e.target.value)}/></div></L></div>
  <div className="sm:col-span-6"><L l="Description"><input className="inp" value={i.desc} onChange={e=>item(i.id,'desc',e.target.value)}/></L></div>
  {[['qty','Qty'],['price','Unit price ₹'],['discount','Discount ₹'],['tax','GST %']].map(([k,l])=><L key={k} l={l}><input type="number" className="inp" value={i[k]} disabled={k==='tax'&&!doc.gst} onChange={e=>item(i.id,k,+e.target.value)}/></L>)}
  <L l="Unit"><select className="inp" value={i.unit} onChange={e=>item(i.id,'unit',e.target.value)}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></L>
  <div className="flex items-end justify-between gap-2"><b className="text-sm">{inr(c.rows[n].total)}</b><div className="flex gap-1"><button className="btn2 px-2" aria-label="Duplicate line" onClick={()=>set('items',[...doc.items,{...i,id:uid()}])}><Copy size={14}/></button><button className="btn2 px-2" aria-label="Remove line" onClick={()=>confirm('Remove this line?')&&set('items',doc.items.filter(x=>x.id!==i.id))}><Trash2 size={14}/></button></div></div></div>)}
 <button className="btn2" onClick={()=>set('items',[...doc.items,newItem()])}><Plus size={16}/>Add line item</button>
 <div className="card grid gap-3 lg:grid-cols-2"><div className="space-y-3">
  <L l="Terms template"><select className="inp" onChange={e=>set('terms',TERMS[e.target.value])}>{Object.keys(TERMS).map(k=><option key={k}>{k}</option>)}</select></L>
  <L l="Terms & conditions"><textarea rows={4} className="inp" value={doc.terms} onChange={e=>set('terms',e.target.value)}/></L>
  <L l={I?'Notes':'Scope of work, exclusions'}><textarea rows={3} className="inp" value={doc.notes} onChange={e=>set('notes',e.target.value)}/></L>
  {!I&&<L l="Payment terms"><input className="inp" value={doc.payTerms} onChange={e=>set('payTerms',e.target.value)}/></L>}</div>
  <div className="space-y-1 text-sm self-start"><Row k="Subtotal" v={c.sub}/><Row k="Discount" v={-c.disc}/>{doc.gst&&(doc.interState?<Row k="IGST" v={c.igst}/>:<><Row k="CGST" v={c.cgst}/><Row k="SGST" v={c.sgst}/></>)}<Row k="Additional" v={+doc.extra}/><Row k={I?'Grand total':'Estimated total'} v={c.total} b/>
   {I&&<p className="text-xs text-slate-500">Payments are recorded from the invoice list and never marked paid automatically.</p>}</div></div>
 <div className="flex flex-wrap gap-2"><button className="btn" disabled={!valid} onClick={()=>save(doc)}>Save changes</button><button className="btn2" disabled={!okPdf} onClick={()=>pdf('preview')}><Receipt size={16}/>Preview PDF</button><button className="btn2" disabled={!okPdf} onClick={()=>pdf()}><Download size={16}/>Download PDF</button><button className="btn2" disabled={!okPdf} onClick={()=>pdf('print')}><Printer size={16}/>Print</button><button className="btn2" onClick={done}>Create another / back</button></div>
 {!valid&&<p className="text-xs text-slate-500">Add a named line item to enable Preview, Download and Print. Choose a customer to save.</p>}</div>}
const Row=({k,v,b})=><div className={`flex justify-between ${b?'border-t pt-1 font-bold':''}`}><span>{k}</span><span>{inr(v)}</span></div>;
