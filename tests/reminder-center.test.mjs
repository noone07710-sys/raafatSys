import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function makeApp(){
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const target={innerHTML:''};
 const doc={title:'',querySelector:q=>q==='#app'?target:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),body:{append(){}}};
 const app=new Function('localStorage','document','crypto','createClient','window','setTimeout',
  source+'\nreturn {s,alertsList,alertsView,reminderText,reminderMessageDialog,whatsappIraqNumber,alertDayDistance,clean,render,fieldHtml};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=> 'id'},()=>{},{},()=>{});
 app.s.demo=true;app.s.staff={role:'admin'};
 return {app,target};
}
function addFixture(s){
 s.data.customers=[{id:'customer',name:'زبون',phone:'07701234567'}];
 s.data.landlords=[{id:'owner',name:'مالك السطح',phone:'07801234567'}];
 s.data.properties=[{id:'property',title:'سطح أول'}];
 s.data.leases=[{id:'lease',landlord_id:'owner',property_id:'property',contract_number:'RA-9',
  end_date:'2026-11-20',currency:'USD'}];
 s.data.lease_installments=[{id:'part',lease_id:'lease',due_date:'2026-11-14',amount:500,paid_amount:200}];
 s.data.campaigns=[{id:'campaign',customer_id:'customer',title:'حملة إعلانية',
  next_payment_due_date:'2026-11-16',price:1000,currency:'IQD'}];
 s.data.campaign_payments=[{id:'paid',campaign_id:'campaign',amount:400}];
 s.data.customer_contracts=[{id:'contract',customer_id:'customer',campaign_id:'campaign',
  contract_number:'RC-2',end_date:'2026-11-25'}];
}

test('notifications combine due rents, due customer balances and both contract expiry dates without duplicates',()=>{
 const {app,target}=makeApp();addFixture(app.s);
 const list=app.alertsList('2026-11-15');
 assert.deepEqual(list.map(x=>x.key),[
  'lease-payment:part','customer-payment:campaign','lease-expiry:lease','customer-expiry:contract'
 ]);
 assert.equal(list[0].days,-1);
 assert.equal(list[0].amount,300,'rent reminder uses unpaid installment balance');
 assert.equal(list[1].amount,600,'customer reminder uses unpaid campaign balance');
 assert.match(app.reminderText(list[0]),/دفعة إيجار السطح/);
 assert.match(app.reminderText(list[1]),/الرصيد المتبقي على الحملة/);
 assert.match(app.reminderText(list[3]),/تجديد العقد/);
 assert.equal(app.whatsappIraqNumber('07701234567'),'9647701234567');
 assert.equal(app.whatsappIraqNumber('+9647701234567'),'9647701234567');
 assert.equal(app.whatsappIraqNumber('123'),'');
 assert.match(app.alertsView(),/data-reminder-compose/);
 app.s.view='alerts';app.render();
 assert.match(target.innerHTML,/التنبيهات والمواعيد/);
 assert.match(target.innerHTML,/data-alerts-nav/);
});

test('paid installments vanish, expired contracts age out, renewed leases are not duplicated',()=>{
 const {app}=makeApp();addFixture(app.s);
 const s=app.s;
 assert.equal(app.alertsList('2026-12-30').filter(a=>a.kind==='expiry').length,0);
 s.data.lease_installments[0].paid_amount=500;
 s.data.campaign_payments[0].amount=1000;
 const list=app.alertsList('2026-11-15');
 assert.equal(list.filter(a=>a.kind==='payment').length,0);
 s.data.leases.push({id:'renewed',renewed_from:'lease',landlord_id:'owner',property_id:'property',
  contract_number:'RA-10',end_date:'2027-11-20',currency:'USD'});
 assert.equal(app.alertsList('2026-11-15').some(a=>a.key==='lease-expiry:lease'),false);
});

test('customer due dates are optional, and missing due dates do not invent a scheduled installment',()=>{
 const {app}=makeApp();addFixture(app.s);
 app.s.data.campaigns[0].next_payment_due_date=null;
 assert.equal(app.alertsList('2026-11-15').some(a=>a.key==='customer-payment:campaign'),false);
 const saved=app.clean('campaigns',{title:'اختبار',next_payment_due_date:''});
 assert.equal(saved.next_payment_due_date,null);
 const form=app.fieldHtml(['next_payment_due_date','الدفعة القادمة','date'],
  {next_payment_due_date:''},{next_payment_due_date:''});
 assert.match(form,/name="next_payment_due_date"/);
});
