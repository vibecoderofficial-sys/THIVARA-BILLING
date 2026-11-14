import {SEED} from './catalogue.js';
const U=import.meta.env.VITE_API_URL,T=import.meta.env.VITE_API_TOKEN;
export const demo=!U; // no backend configured: data lives in this browser (localStorage)
const rd=k=>{try{return JSON.parse(localStorage.getItem('ts_'+k)||'[]')}catch{return[]}},wr=(k,v)=>localStorage.setItem('ts_'+k,JSON.stringify(v));
function local(b){const s=b.sheet;
 if(b.action==='list'){if(s==='Service_Categories'&&!localStorage.ts_seeded){localStorage.ts_seeded='1';
   wr('Service_Categories',SEED.map((c,i)=>({id:'cat-'+(i+1),name:c.name,description:c.types.join(', '),active:true})));
   wr('Services',SEED.flatMap((c,i)=>c.services.map((n,j)=>({id:`svc-${i+1}-${j+1}`,categoryId:'cat-'+(i+1),name:n,type:'',desc:n,unit:c.unit,price:0,tax:18,active:true}))))}
  return rd(s)}
 if(b.action==='save'){const a=rd(s),r={...b.row};if(!r.id)r.id=crypto.randomUUID();const i=a.findIndex(x=>x.id===r.id);i>=0?a[i]=r:a.push(r);wr(s,a);return r}
 if(b.action==='remove'){wr(s,rd(s).filter(x=>x.id!==b.id));return true}
 if(b.action==='next'){const y=new Date().getFullYear(),k='ctr_'+b.type+y,n=(+localStorage[k]||0)+1;localStorage[k]=n;return `TS-${b.type==='invoice'?'INV':'QUO'}-${y}-${String(n).padStart(3,'0')}`}
 return true}
async function call(body){if(demo)return local(body);
 const r=await fetch(U,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({token:T,...body})});
 const j=await r.json();if(!j.ok)throw new Error(j.error||'Request failed');return j.data;}
export const api={list:s=>call({action:'list',sheet:s}),save:(s,row)=>call({action:'save',sheet:s,row}),
 remove:(s,id)=>call({action:'remove',sheet:s,id}),next:t=>call({action:'next',type:t}),log:(a,d,c)=>call({action:'log',a,d,c})};
