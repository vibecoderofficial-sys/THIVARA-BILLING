export const inr=n=>'₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
export const today=()=>new Date().toISOString().slice(0,10);
export const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
export const fmtDate=d=>d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'';
export function calc(items,{gst=true,interState=false,extra=0,paid=0}={}){
 let sub=0,disc=0,tax=0;const rows=items.map(i=>{const g=i.qty*i.price,d=Math.min(g,+i.discount||0),t=gst?(g-d)*(+i.tax||0)/100:0;sub+=g;disc+=d;tax+=t;return{...i,taxAmt:t,total:g-d+t}});
 const taxable=sub-disc,total=taxable+tax+(+extra||0);
 return{rows,sub,disc,taxable,tax,cgst:interState?0:tax/2,sgst:interState?0:tax/2,igst:interState?tax:0,total,paid:+paid||0,due:total-(+paid||0)}}
const a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],b=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
const w=n=>n<20?a[n]:b[Math.floor(n/10)]+(n%10?' '+a[n%10]:'');
const h=n=>(n>99?a[Math.floor(n/100)]+' Hundred'+(n%100?' ':''):'')+(n%100?w(n%100):'');
export function words(x){let n=Math.floor(x),p=Math.round((x-n)*100),s='';
 for(const[v,l]of[[1e7,'Crore'],[1e5,'Lakh'],[1e3,'Thousand']]){if(n>=v){s+=h(Math.floor(n/v))+' '+l+' ';n%=v}}
 s+=h(n);return 'Rupees '+(s.trim()||'Zero')+(p?' and '+w(p)+' Paise':'')+' Only'}
