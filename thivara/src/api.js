const U=import.meta.env.VITE_API_URL,T=import.meta.env.VITE_API_TOKEN;
async function call(body){if(!U)throw new Error('VITE_API_URL is not set');
 const r=await fetch(U,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({token:T,...body})});
 const j=await r.json();if(!j.ok)throw new Error(j.error||'Request failed');return j.data;}
export const api={list:s=>call({action:'list',sheet:s}),save:(s,row)=>call({action:'save',sheet:s,row}),
 remove:(s,id)=>call({action:'remove',sheet:s,id}),next:t=>call({action:'next',type:t}),log:(a,d,c)=>call({action:'log',a,d,c})};
