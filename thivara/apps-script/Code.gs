// Bound to your Google Sheet (Extensions > Apps Script). Set Script Property API_TOKEN, then Deploy > Web app (Execute as: Me, Access: Anyone).
const SHEETS={Settings:['Key','Value'],Customers:['id','name','business','phone','email','address','city','state','pin','gstin','notes','created'],
Service_Categories:['id','name','description','active'],Services:['id','categoryId','name','type','desc','unit','price','tax','active'],
Invoices:['id','number','customerId','date','due','subtotal','discount','taxable','taxTotal','total','paid','outstanding','status','quotationId','json'],
Quotations:['id','number','customerId','date','valid','subtotal','discount','taxTotal','total','status','scope','terms','json'],
Payments:['id','invoiceId','date','amount','method','ref','notes'],Document_Templates:['id','type','category','terms','disclaimer','period','active'],
Activity_Log:['id','timestamp','user','action','docId','summary'],Counters:['type','year','n']};
function out(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function sh(n){const ss=SpreadsheetApp.getActive();let s=ss.getSheetByName(n);if(!s){s=ss.insertSheet(n);s.appendRow(SHEETS[n]);s.setFrozenRows(1)}return s}
function doGet(){return out({ok:true,msg:'THIVARA API'})}
function doPost(e){const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{const b=JSON.parse(e.postData.contents);
  if(b.token!==PropertiesService.getScriptProperties().getProperty('API_TOKEN'))return out({ok:false,error:'Unauthorized'});
  if(b.action==='list')return out({ok:true,data:list(b.sheet)});
  if(b.action==='save')return out({ok:true,data:save(b.sheet,b.row)});
  if(b.action==='remove'){return out({ok:true,data:remove(b.sheet,b.id)})}
  if(b.action==='next')return out({ok:true,data:next(b.type)});
  if(b.action==='log'){save('Activity_Log',{id:Utilities.getUuid(),timestamp:new Date().toISOString(),user:Session.getActiveUser().getEmail()||'app',action:b.a,docId:b.d,summary:b.c});return out({ok:true})}
  return out({ok:false,error:'Unknown action'})}catch(err){return out({ok:false,error:String(err)})}finally{lock.releaseLock()}}
function list(n){if(!SHEETS[n])throw 'Bad sheet';const v=sh(n).getDataRange().getValues(),h=v.shift();return v.map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i]);return o})}
function save(n,row){if(!SHEETS[n])throw 'Bad sheet';const s=sh(n),h=SHEETS[n],k=h[0];if(!row[k])row[k]=Utilities.getUuid();
 const ids=s.getRange(2,1,Math.max(s.getLastRow()-1,1),1).getValues().map(r=>r[0]),i=ids.indexOf(row[k]),vals=h.map(c=>row[c]===undefined?'':row[c]);
 if(i>=0&&s.getLastRow()>1)s.getRange(i+2,1,1,h.length).setValues([vals]);else s.appendRow(vals);return row}
function remove(n,id){if(['Invoices','Quotations','Payments'].indexOf(n)>=0)throw 'Issued records cannot be deleted; cancel instead';
 const s=sh(n),ids=s.getRange(1,1,s.getLastRow(),1).getValues().map(r=>r[0]),i=ids.indexOf(id);if(i>0)s.deleteRow(i+1);return true}
function next(t){const s=sh('Counters'),y=new Date().getFullYear(),v=s.getDataRange().getValues();let r=-1;
 v.forEach((x,i)=>{if(x[0]===t&&x[1]===y)r=i+1});let n=1;if(r>0){n=v[r-1][2]+1;s.getRange(r,3).setValue(n)}else s.appendRow([t,y,1]);
 return 'TS-'+(t==='invoice'?'INV':'QUO')+'-'+y+'-'+('000'+n).slice(-3)}
function setup(){Object.keys(SHEETS).forEach(sh)} // run once
function backup(){DriveApp.getFileById(SpreadsheetApp.getActive().getId()).makeCopy('THIVARA backup '+new Date().toISOString().slice(0,10))} // add a daily time trigger
