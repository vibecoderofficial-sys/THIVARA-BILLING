import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Search,X,Plus,Pencil,Check,Trash2,ChevronRight,ChevronDown,LayoutGrid,List as ListIcon,Settings as Cog,Layers,ArrowLeft} from 'lucide-react';
import {api} from './api.js';
import {inr} from './util.js';
import {UNITS as UNIT_LIST} from './catalogue.js';
import {CatIcon,SvcIcon,IconTile} from './icons.jsx';

const uid=()=>crypto.randomUUID();
export const isActive=x=>x.active!==false&&x.active!=='FALSE'&&x.active!=='false';

/* ---------- search ---------- */
const tokens=q=>String(q||'').toLowerCase().split(/\s+/).filter(Boolean);
export function matches(svc,cat,q){const t=tokens(q);if(!t.length)return true;
 const hay=`${svc.name||''} ${svc.desc||''} ${svc.type||''} ${cat?.name||''} ${svc.unit||''}`.toLowerCase();return t.every(w=>hay.includes(w))}
export function Hi({text,q}){const t=String(text??'');const w=tokens(q).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));if(!w.length)return t;
 return t.split(new RegExp('('+w.join('|')+')','ig')).map((p,i)=>i%2?<mark key={i} className="rounded bg-cyan-brand/30 px-0.5 text-inherit">{p}</mark>:p)}

export function SearchBox({value,onChange,placeholder='Search services…',autoFocus,inputRef}){
 return <div className="relative"><Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
  <input ref={inputRef} type="search" autoFocus={autoFocus} enterKeyHint="search" className="inp pl-10 pr-10" placeholder={placeholder} aria-label="Search services" value={value} onChange={e=>onChange(e.target.value)} onKeyDown={e=>e.key==='Escape'&&onChange('')}/>
  {value&&<button type="button" aria-label="Clear search" onClick={()=>onChange('')} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-navy"><X size={16}/></button>}</div>}

/* Horizontally scrollable category filter chips, each with its own icon. */
export function CatChips({cats,counts,sel,onSel,total}){
 const chip=on=>`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${on?'grad border-transparent text-white shadow-sm shadow-teal/30':'border-navy/15 bg-white text-navy hover:border-teal hover:text-teal-600'}`;
 return <div className="noscroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Service categories">
  <button role="tab" aria-selected={!sel} className={chip(!sel)} onClick={()=>onSel('')}><Layers size={15}/>All<span className="text-xs opacity-80">{total}</span></button>
  {cats.map(c=><button key={c.id} role="tab" aria-selected={sel===c.id} className={chip(sel===c.id)} onClick={()=>onSel(sel===c.id?'':c.id)}><CatIcon name={c.name} size={15}/>{shortName(c.name)}<span className="text-xs opacity-80">{counts[c.id]||0}</span></button>)}</div>}
const shortName=n=>String(n||'').split(/\s*[&,]\s*/)[0];

function Switch({on,onChange,label}){return <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={()=>onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on?'grad':'bg-slate-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on?'left-[22px]':'left-0.5'}`}/></button>}

/* ---------- one editable service row ---------- */
function SvcRow({x,cat,q,up,del,autoEdit}){
 const [edit,setEdit]=useState(!!autoEdit),[name,setName]=useState(x.name);
 useEffect(()=>setName(x.name),[x.name]);
 const commit=()=>{setEdit(false);const n=name.trim();if(n&&n!==x.name)up(x,'name',n);else setName(x.name)};
 return <div className={`rounded-xl border bg-white p-3 transition md:flex md:items-center md:gap-4 ${isActive(x)?'border-navy/10':'border-dashed border-slate-300 opacity-70'}`}>
  <div className="flex min-w-0 flex-1 items-center gap-3">
   <IconTile size={42}><SvcIcon name={x.name} cat={cat?.name} size={20}/></IconTile>
   <div className="min-w-0 flex-1">
    {edit?<input autoFocus className="inp" value={name} aria-label="Service name" onChange={e=>setName(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.target.blur();if(e.key==='Escape'){setName(x.name);setEdit(false)}}}/>
     :<div className="break-words text-sm font-semibold leading-snug"><Hi text={x.name} q={q}/></div>}
    {!edit&&<div className="mt-0.5 truncate text-xs text-slate-500"><Hi text={cat?.name} q={q}/></div>}</div>
   {edit?<button type="button" aria-label="Delete service" className="btn2 px-2.5 text-red-600" onMouseDown={e=>e.preventDefault()} onClick={()=>confirm(`Delete "${x.name}"?`)&&del(x)}><Trash2 size={15}/></button>
    :<button type="button" aria-label="Rename service" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-teal-600" onClick={()=>setEdit(true)}><Pencil size={15}/></button>}
   {edit&&<button type="button" aria-label="Done editing" className="btn px-2.5" onMouseDown={e=>e.preventDefault()} onClick={commit}><Check size={15}/></button>}
  </div>
  <div className="mt-3 grid grid-cols-[1fr_1fr_4.5rem_auto] items-end gap-2 md:mt-0 md:w-[26rem] md:shrink-0 md:items-center">
   <label className="text-[11px] font-medium text-slate-500 md:sr-only">Unit<select className="inp mt-0.5 md:mt-0" value={x.unit||'per project'} onChange={e=>up(x,'unit',e.target.value)}>{UNIT_LIST.map(u=><option key={u}>{u}</option>)}</select></label>
   <label className="text-[11px] font-medium text-slate-500 md:sr-only">Price ₹<input type="number" inputMode="decimal" min="0" className="inp mt-0.5 md:mt-0" defaultValue={x.price} key={'p'+x.price} onBlur={e=>+e.target.value!==+x.price&&up(x,'price',+e.target.value||0)}/></label>
   <label className="text-[11px] font-medium text-slate-500 md:sr-only">GST %<input type="number" inputMode="decimal" min="0" className="inp mt-0.5 md:mt-0" defaultValue={x.tax} key={'t'+x.tax} onBlur={e=>+e.target.value!==+x.tax&&up(x,'tax',+e.target.value||0)}/></label>
   <div className="flex h-10 items-center md:h-auto"><Switch on={isActive(x)} label={`${x.name} active`} onChange={v=>up(x,'active',v)}/></div></div></div>}

/* ---------- category overview card ---------- */
function CatCard({c,n,preview,onOpen}){
 return <button type="button" onClick={onOpen} className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-4 text-left shadow-[0_1px_3px_rgba(5,7,13,.08)] transition hover:-translate-y-0.5 hover:border-teal hover:shadow-lg hover:shadow-teal/10 focus:outline-none focus:ring-2 focus:ring-teal/50">
  <div className="flex items-start justify-between"><IconTile size={52} className="!rounded-2xl"><CatIcon name={c.name} size={26}/></IconTile>
   <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-600">{n}</span></div>
  <div className="mt-3 text-sm font-bold leading-snug sm:text-base">{c.name}</div>
  <p className="mt-1 hidden text-xs leading-relaxed text-slate-500 sm:line-clamp-2 sm:block">{preview}</p>
  <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-teal-600">Browse services<ChevronRight size={14} className="transition group-hover:translate-x-1"/></div></button>}

/* ---------- Service catalogue page ---------- */
export function Cat({d,run,seed,initialQ='',initialCat=''}){
 const [q,setQ]=useState(initialQ),[catId,setCatId]=useState(initialCat),[view,setView]=useState('cats'),[closed,setClosed]=useState({}),[manage,setManage]=useState(false),[nc,setNc]=useState(''),[newId,setNewId]=useState('');
 const catOf=useMemo(()=>Object.fromEntries(d.cats.map(c=>[c.id,c])),[d.cats]);
 const counts=useMemo(()=>{const o={};d.services.forEach(s=>{o[s.categoryId]=(o[s.categoryId]||0)+1});return o},[d.services]);
 const searching=q.trim().length>0;
 const groups=useMemo(()=>d.cats.filter(c=>!catId||c.id===catId).map(c=>({c,list:d.services.filter(s=>s.categoryId===c.id&&matches(s,c,q))})).filter(g=>searching?g.list.length:true),[d.cats,d.services,catId,q,searching]);
 const found=groups.reduce((n,g)=>n+g.list.length,0);
 const up=(x,k,v)=>run(()=>api.save('Services',{...x,[k]:v}));
 const del=x=>run(()=>api.remove('Services',x.id));
 const add=c=>{const id=uid();setNewId(id);setClosed(o=>({...o,[c.id]:false}));run(()=>api.save('Services',{id,categoryId:c.id,name:'New service',desc:'',unit:'per project',price:0,tax:18,active:true}))};
 const showGrid=!searching&&!catId&&view==='cats';
 const cur=catOf[catId];
 const select=id=>{setCatId(id);window.scrollTo({top:0,behavior:'smooth'})};
 return <div className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><h1>Service catalogue</h1><p className="text-sm text-slate-500">{d.cats.length} categories · {d.services.length} services</p></div>
   <div className="flex gap-2"><div className="flex rounded-lg border border-navy/15 bg-white p-0.5" role="group" aria-label="View">
     {[['cats','Categories',LayoutGrid],['all','All services',ListIcon]].map(([k,l,I])=><button key={k} type="button" aria-pressed={view===k} onClick={()=>{setView(k);setCatId('')}} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${view===k?'grad text-white':'text-slate-600 hover:text-teal-600'}`}><I size={15}/>{l}</button>)}</div>
    <button type="button" className="btn2" aria-expanded={manage} onClick={()=>setManage(!manage)}><Cog size={16}/><span className="hidden sm:inline">Manage</span></button></div></div>

  {manage&&<div className="card flex flex-wrap items-end gap-2"><label className="min-w-[12rem] flex-1 text-xs font-medium text-slate-600">New category name<input className="inp mt-1" value={nc} placeholder="e.g. Security Services" onChange={e=>setNc(e.target.value)}/></label>
   <button className="btn" disabled={!nc.trim()} onClick={()=>{run(()=>api.save('Service_Categories',{id:uid(),name:nc.trim(),active:true}));setNc('')}}><Plus size={16}/>Add category</button>
   {cur&&<button className="btn2" onClick={()=>{const n=prompt('Rename category',cur.name);n&&n.trim()&&run(()=>api.save('Service_Categories',{...cur,name:n.trim()}))}}><Pencil size={15}/>Rename “{shortName(cur.name)}”</button>}
   {!d.cats.length&&<button className="btn2" onClick={seed}>Load predefined catalogue</button>}</div>}

  {!d.cats.length?<div className="card py-10 text-center"><IconTile size={56} className="mx-auto !rounded-2xl"><Layers size={26}/></IconTile><h2 className="mt-3 font-semibold">No services yet</h2><p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Load the predefined THIVARA catalogue (8 categories) or add your own category from Manage.</p><button className="btn mt-4" onClick={seed}>Load predefined catalogue</button></div>
  :<>
  <div className="sticky top-14 z-20 -mx-4 space-y-2.5 bg-navy-50/95 px-4 py-3 backdrop-blur md:top-0 md:-mx-6 md:px-6">
   <SearchBox value={q} onChange={setQ} placeholder="Search all services, e.g. printer, website, chatbot…"/>
   <CatChips cats={d.cats} counts={counts} sel={catId} onSel={select} total={d.services.length}/></div>

  {searching&&<p className="text-sm text-slate-600" aria-live="polite">{found?<><b>{found}</b> result{found>1?'s':''} for “{q.trim()}”{cur?<> in <b>{cur.name}</b></>:''}</>:<>No services match “{q.trim()}”.</>}{found===0&&<button className="ml-2 font-semibold text-teal-600 underline" onClick={()=>{setQ('');setCatId('')}}>Clear search</button>}</p>}

  {showGrid&&<div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">{d.cats.map(c=><CatCard key={c.id} c={c} n={counts[c.id]||0} preview={d.services.filter(s=>s.categoryId===c.id).slice(0,3).map(s=>s.name).join(' · ')} onOpen={()=>select(c.id)}/>)}</div>}

  {!showGrid&&<div className="space-y-5">
   {cur&&!searching&&<button type="button" className="flex items-center gap-1.5 text-sm font-semibold text-teal-600" onClick={()=>select('')}><ArrowLeft size={16}/>All categories</button>}
   {groups.map(({c,list})=>{const shut=closed[c.id]&&!searching&&!catId;return <section key={c.id} aria-label={c.name}>
    <div className="mb-2 flex items-center gap-3"><button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={!shut} onClick={()=>!catId&&setClosed(o=>({...o,[c.id]:!o[c.id]}))}>
      <IconTile size={36}><CatIcon name={c.name} size={18}/></IconTile><span className="min-w-0"><span className="block truncate text-base font-bold">{c.name}</span><span className="text-xs text-slate-500">{list.length}{searching?' matching':''} service{list.length===1?'':'s'}</span></span>
      {!catId&&<ChevronDown size={18} className={`shrink-0 text-slate-400 transition ${shut?'-rotate-90':''}`}/>}</button>
     {!searching&&<button type="button" className="btn2 shrink-0" onClick={()=>add(c)}><Plus size={16}/><span className="hidden sm:inline">Add service</span></button>}</div>
    {!shut&&<div className="space-y-2">{list.map(x=><SvcRow key={x.id} x={x} cat={c} q={q} up={up} del={del} autoEdit={x.id===newId}/>)}{!list.length&&<p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">No services in this category yet.</p>}</div>}</section>})}</div>}
  </>}</div>}

/* ---------- searchable service picker (bottom sheet on phones) used when creating invoices / quotations ---------- */
export function ServicePicker({d,onPick,close}){
 const [q,setQ]=useState(''),[catId,setCatId]=useState(''),[added,setAdded]=useState({}),ref=useRef();
 useEffect(()=>{const k=e=>e.key==='Escape'&&close();window.addEventListener('keydown',k);const o=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{window.removeEventListener('keydown',k);document.body.style.overflow=o}},[close]);
 const active=d.services.filter(isActive);
 const counts=useMemo(()=>{const o={};active.forEach(s=>{o[s.categoryId]=(o[s.categoryId]||0)+1});return o},[d.services]);
 const groups=d.cats.filter(c=>!catId||c.id===catId).map(c=>({c,list:active.filter(s=>s.categoryId===c.id&&matches(s,c,q))})).filter(g=>g.list.length);
 const n=Object.values(added).reduce((a,b)=>a+b,0);
 return <div className="fixed inset-0 z-50 flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-6" onMouseDown={e=>e.target===e.currentTarget&&close()}>
  <div role="dialog" aria-modal="true" aria-label="Add services" className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-navy-50 sm:h-[80vh] sm:max-w-2xl sm:rounded-2xl">
   <div className="space-y-2.5 bg-navy p-4 text-white"><div className="flex items-center justify-between"><h2 className="font-bold">Add services</h2><button aria-label="Close" onClick={close} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10"><X size={18}/></button></div>
    <SearchBox inputRef={ref} autoFocus value={q} onChange={setQ} placeholder="Search by name, e.g. router, website, backup…"/>
    <CatChips cats={d.cats} counts={counts} sel={catId} onSel={setCatId} total={active.length}/></div>
   <div className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
    {!groups.length&&<p className="py-10 text-center text-sm text-slate-500">No services match your search.</p>}
    {groups.map(({c,list})=><div key={c.id}><div className="sticky top-0 z-10 -mx-1 mb-1.5 flex items-center gap-2 bg-navy-50/95 px-1 py-1 text-xs font-bold uppercase tracking-wide text-slate-500 backdrop-blur"><CatIcon name={c.name} size={14} className="text-teal"/>{c.name}</div>
     <div className="space-y-1.5">{list.map(s=><button type="button" key={s.id} onClick={()=>{onPick(s);setAdded(a=>({...a,[s.id]:(a[s.id]||0)+1}))}} className="flex w-full items-center gap-3 rounded-xl border border-navy/10 bg-white p-2.5 text-left transition hover:border-teal active:scale-[.99]">
      <IconTile size={38}><SvcIcon name={s.name} cat={c.name} size={18}/></IconTile>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-snug"><Hi text={s.name} q={q}/></span><span className="text-xs text-slate-500">{+s.price?inr(s.price):'Price on request'} · {s.unit}</span></span>
      {added[s.id]?<span className="grad rounded-full px-2 py-0.5 text-xs font-bold text-white">×{added[s.id]}</span>:<Plus size={18} className="shrink-0 text-teal"/>}</button>)}</div></div>)}</div>
   <div className="flex items-center justify-between gap-3 border-t border-navy/10 bg-white p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]"><span className="text-sm text-slate-600">{n?`${n} added`:'Tap a service to add it'}</span><button className="btn" onClick={close}>Done</button></div></div></div>}
