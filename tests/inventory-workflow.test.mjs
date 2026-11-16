import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const script=readFileSync(new URL('../inventory.js',import.meta.url),'utf8');
const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../inventory.css',import.meta.url),'utf8');
function fixture(){
 const win={};
 new Function('window',script)(win);
 const s={demo:true,session:{user:{id:'staff-uuid',email:'staff@example.test'}},
  staff:{role:'admin',display_name:'المدير المفوض'},view:'inventory'};
 const notices=[];
 const inv=win.RaafatInventory({s,
  E:x=>String(x??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;'),
  fmt:x=>String(x),money:(x,c)=>String(x)+' '+c,uiIcon:()=>'<svg></svg>',
  toast:(message,bad)=>notices.push({message,bad:!!bad}),render:()=>{},
  canAccess:()=>true,today:()=> '2026-11-16'});
 inv.resetDemo();
 return {inv,s,notices};
}
async function seed(f){
 const carton=await f.inv.command('save_item',{
  code:'BOLT-12',name:'مسامير تعبئة',unit:'carton',pieces_per_carton:12,
  item_kind:'consumable',price:12000,min_qty:1,currency:'IQD',active:true});
 const cable=await f.inv.command('save_item',{
  code:'CABLE-M',name:'كيبل يرجع للمخزن',unit:'meter',
  item_kind:'returnable',price:2500,min_qty:2,currency:'IQD',active:true});
 const receipt=await f.inv.command('receive',{
  receipt_number:'R-001',document_date:'2026-11-16',details:'استلام مواد',
  lines:[
   {item_id:carton.id,quantity:3,unit:'carton',unit_price:12000},
   {item_id:cable.id,quantity:20,unit:'meter',unit_price:2500}
  ]});
 return {carton,cable,receipt};
}
test('inventory navigation, permission control, print CSS and script are installed',()=>{
 assert.match(index,/inventory\.js/);
 assert.match(index,/inventory\.css/);
 assert.match(appSource,/المخازن والعهد/);
 assert.match(appSource,/inventory\.alertCount\(\)/);
 assert.match(appSource,/inventory\.page\(\)/);
 assert.match(css,/\.inv-print-sheet/);
 assert.match(css,/@media print/);
});
test('one receipt can receive multiple materials and cartons convert into individual pieces',async()=>{
 const f=fixture(),seeded=await seed(f),d=f.inv.state;
 assert.equal(d.items.length,2);
 assert.equal(d.documents.length,1);
 assert.equal(d.lines.filter(l=>l.document_id===seeded.receipt.id).length,2);
 assert.equal(d.items.find(i=>i.id===seeded.carton.id).stock_qty,36);
 assert.equal(d.items.find(i=>i.id===seeded.cable.id).stock_qty,20);
 assert.equal(d.documents[0].receipt_number,'R-001');
 assert.match(f.inv.page(),/إدخال مخزني/);
 assert.equal(d.notifications.filter(n=>n.event_type==='received').length,1);
});
test('manager approval never debits stock; the warehouse issues after authorization',async()=>{
 const f=fixture(),ids=await seed(f);
 f.s.staff={role:'staff',display_name:'أمين المخزن'};
 const request=await f.inv.command('request_out',{
  recipient_name:'موظف الإنتاج',document_date:'2026-11-16',return_due_date:'2026-11-14',
  lines:[
   {item_id:ids.carton.id,quantity:6,unit:'piece'},
   {item_id:ids.cable.id,quantity:4,unit:'meter'}
  ]});
 assert.equal(f.inv.state.documents.find(d=>d.id===request.id).status,'pending');
 assert.equal(f.inv.state.items.find(x=>x.id===ids.carton.id).stock_qty,36);
 const refused=await f.inv.command('approve',{id:request.id});
 assert.equal(refused,undefined);
 assert.equal(f.inv.state.documents.find(d=>d.id===request.id).status,'pending');
 assert.ok(f.notices.some(n=>n.bad&&/للمدير/.test(n.message)));
 f.s.staff={role:'admin',display_name:'المدير'};
 await f.inv.command('approve',{id:request.id});
 assert.equal(f.inv.state.documents.find(d=>d.id===request.id).status,'approved');
 assert.equal(f.inv.state.items.find(x=>x.id===ids.carton.id).stock_qty,36);
 assert.equal(f.inv.stockAvailable(f.inv.state.items.find(i=>i.id===ids.carton.id)),30);
 f.s.staff={role:'staff',display_name:'أمين المخزن'};
 await f.inv.command('issue',{id:request.id});
 assert.equal(f.inv.state.documents.find(d=>d.id===request.id).status,'issued');
 assert.equal(f.inv.state.items.find(x=>x.id===ids.carton.id).stock_qty,30);
 assert.match(f.inv.page(),/إدارة المخازن/);
 f.inv.state.printDocId=request.id;
 assert.match(f.inv.printSheet(),/توقيع الموظف المستلم/);
 assert.match(f.inv.printSheet(),/المدير/);
});
test('returnable supplies remain outstanding until a linked return voucher is posted',async()=>{
 const f=fixture(),ids=await seed(f);
 const request=await f.inv.command('request_out',{
  recipient_name:'الموظف المستلم',return_due_date:'2026-11-10',
  lines:[{item_id:ids.cable.id,unit:'meter',quantity:8}]
 });
 await f.inv.command('approve',{id:request.id});
 await f.inv.command('issue',{id:request.id});
 const source=f.inv.state.lines.find(l=>l.document_id===request.id);
 assert.equal(f.inv.outstanding()[0].remaining,8);
 await f.inv.command('return',{lines:[{source_line_id:source.id,quantity:3}]});
 assert.equal(f.inv.outstanding()[0].remaining,5);
 assert.equal(f.inv.state.items.find(i=>i.id===ids.cable.id).stock_qty,15);
 assert.match(f.inv.alertHtml(),/المخازن/);
 assert.match(f.inv.page(),/عهد لم ترجع/);
 await f.inv.command('return',{lines:[{source_line_id:source.id,quantity:5}]});
 assert.equal(f.inv.outstanding().length,0);
 assert.equal(f.inv.state.items.find(i=>i.id===ids.cable.id).stock_qty,20);
});
test('outgoing document validations reject overdrawn item, overdrawn combined lines and missing return due date',async()=>{
 const f=fixture(),ids=await seed(f);
 const current={type:'out',recipient_name:'طالب المواد',lines:[
  {item_id:ids.carton.id,quantity:'3',unit:'carton'},
  {item_id:ids.carton.id,quantity:'1',unit:'carton'}
 ]};
 assert.throws(()=>f.inv.validateDraft(current),/المخزون|المتوفر/);
 assert.throws(()=>f.inv.validateDraft({type:'out',recipient_name:'طالب المواد',lines:[
  {item_id:ids.cable.id,quantity:'2',unit:'meter'}]}),/موعد إرجاع/);
 assert.throws(()=>f.inv.validateDraft({type:'out',recipient_name:'طالب المواد',
  return_due_date:'2026-11-17',lines:[{item_id:ids.carton.id,quantity:'5',unit:'carton'}]}),/المتوفر/);
});
