import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function setup(){
 const src=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const root={innerHTML:''};
 const doc={title:'',querySelector:x=>x==='#app'?root:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),body:{append(){}}};
 class MockFormData{constructor(form){this.values=form.values||{}} get(k){return this.values[k]??null}
  *entries(){yield* Object.entries(this.values)}}
 let serial=0;
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File','setTimeout',
  src+'\nreturn {s,render,nav,listing,openForm,modalHtml,saveForm,formValidate,expenseOverview,openExpenseDelete,deleteExpenseConfirmed,openLandlordDelete,deleteLandlordConfirmed,landlordDeleteStats};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=> 'id-'+(++serial)},()=>{},{},MockFormData,class MockFile{},()=>{});
 const s=app.s;s.demo=true;s.staff={role:'admin',active:true};s.displayCurrency='IQD';s.settings.usd_iqd=1500;
 s.data.landlords=[{id:'a',name:'مالك تجريبي',phone:'07701112233',card_image_path:'cards/a.jpg'},{id:'b',name:'مالك محفوظ'}];
 s.data.properties=[{id:'roof-a',landlord_id:'a',title:'سطح الأول'},{id:'roof-b',landlord_id:'b',title:'سطح الآخر'}];
 s.data.leases=[{id:'lease-a',landlord_id:'a',property_id:'roof-a',contract_number:'RA-0001',rent_total:1000},
 {id:'lease-b',landlord_id:'b',property_id:'roof-b',contract_number:'RA-0002',rent_total:2000}];
 s.data.lease_installments=[{id:'install-a',lease_id:'lease-a',amount:500},{id:'install-b',lease_id:'lease-b',amount:1000}];
 s.data.ad_sites=[{id:'site-a',rooftop_property_id:'roof-a'},{id:'site-b',rooftop_property_id:'roof-b'}];
 s.data.customers=[{id:'customer',name:'زبون موجود'}];
 s.data.campaigns=[{id:'campaign',customer_id:'customer',title:'حملة محفوظة'}];
 s.data.customer_contracts=[{id:'contract',customer_id:'customer',site_id:null}];
 return {app,s,root};
}

test('finance expenses: create tea/water expense, sum in IQD/USD, search and filter',async()=>{
 const {app,s,root}=setup();
 s.view='company_expenses';
 assert.match(app.nav(),/data-nav="company_expenses"/);
 app.render();
 assert.match(root.innerHTML,/مصروفات الشركة/);
 app.openForm('company_expenses');
 assert.match(root.innerHTML,/تسجيل مصروف جديد/);
 assert.match(root.innerHTML,/ضيافة ومشروبات/);
 await app.saveForm({values:{expense_date:'2026-11-14',title:'جاي قهوة ماي',category:'hospitality',
  amount:'5000',currency:'IQD',paid_by:'أحمد',notes:'ضيافة'},querySelectorAll:()=>[]});
 assert.equal(s.data.company_expenses.length,1);
 app.openForm('company_expenses');
 await app.saveForm({values:{expense_date:'2026-11-14',title:'قرطاسية المكتب',category:'office',
  amount:'3',currency:'USD',paid_by:'علي'},querySelectorAll:()=>[]});
 assert.equal(s.data.company_expenses.length,2);
 assert.match(app.expenseOverview(),/9,500/);
 s.search='قهوة';
 assert.match(app.expenseOverview(),/جاي قهوة ماي/);
 assert.doesNotMatch(app.expenseOverview(),/قرطاسية المكتب/);
 s.search='';s.expenseCategory='office';
 assert.match(app.expenseOverview(),/قرطاسية المكتب/);
 assert.doesNotMatch(app.expenseOverview(),/جاي قهوة ماي/);
 s.expenseCategory='';s.displayCurrency='USD';
 assert.match(app.expenseOverview(),/6\.33/);
 assert.throws(()=>app.formValidate('company_expenses',{expense_date:'2026-11-14',title:'جاي',category:'hospitality',amount:0,currency:'IQD'}),/أكبر من صفر/);
 assert.throws(()=>app.formValidate('company_expenses',{expense_date:'2026-11-14',title:'جاي',category:'invalid',amount:100,currency:'IQD'}),/تصنيف/);
});

test('expense deletion requires admin plus explicit exact confirmation',async()=>{
 const {app,s,root}=setup();
 s.view='company_expenses';
 s.data.company_expenses=[{id:'expense-a',title:'جاي',expense_date:'2026-11-14',category:'hospitality',amount:500,currency:'IQD'},
 {id:'expense-b',title:'ماي',expense_date:'2026-11-14',category:'hospitality',amount:1000,currency:'IQD'}];
 app.openExpenseDelete('expense-a');
 assert.match(root.innerHTML,/deleteExpenseConfirmation/);
 await app.deleteExpenseConfirmed({values:{expense_id:'expense-a',confirm:'مو حذف'}});
 assert.equal(s.data.company_expenses.length,2);
 await app.deleteExpenseConfirmed({values:{expense_id:'expense-a',confirm:'حذف'}});
 assert.deepEqual(s.data.company_expenses.map(x=>x.id),['expense-b']);
 s.staff={role:'staff'};app.openExpenseDelete('expense-b');
 assert.equal(s.modal,null);
 assert.doesNotMatch(app.expenseOverview(),/data-delete-expense/);
});

test('landlord deletion removes dependent roofs, ad sites, leases and installments only',async()=>{
 const {app,s,root}=setup();
 s.view='landlords';app.render();
 assert.match(root.innerHTML,/data-delete-landlord="a"/);
 assert.deepEqual(app.landlordDeleteStats('a'),{properties:1,sites:1,leases:1,installments:1,booked:0});
 app.openLandlordDelete('a');
 assert.match(root.innerHTML,/حذف المالك وكل سجلاته/);
 await app.deleteLandlordConfirmed({values:{landlord_id:'a',confirm:'مو حذف'}});
 assert.equal(s.data.landlords.length,2);
 await app.deleteLandlordConfirmed({values:{landlord_id:'a',confirm:'حذف'}});
 assert.deepEqual(s.data.landlords.map(x=>x.id),['b']);
 assert.deepEqual(s.data.properties.map(x=>x.id),['roof-b']);
 assert.deepEqual(s.data.ad_sites.map(x=>x.id),['site-b']);
 assert.deepEqual(s.data.leases.map(x=>x.id),['lease-b']);
 assert.deepEqual(s.data.lease_installments.map(x=>x.id),['install-b']);
 assert.equal(s.data.customers.length,1);
 assert.equal(s.data.campaigns.length,1);
 assert.equal(s.data.customer_contracts.length,1);
});

test('booked client billboard blocks landlord deletion, and non-admin sees no action',async()=>{
 const {app,s,root}=setup();s.view='landlords';
 s.data.campaign_sites=[{campaign_id:'campaign',site_id:'site-a'}];
 app.openLandlordDelete('a');
 assert.equal(app.landlordDeleteStats('a').booked,1);
 assert.match(root.innerHTML,/الحذف متوقف لحماية عقود الزبائن/);
 await app.deleteLandlordConfirmed({values:{landlord_id:'a',confirm:'حذف'}});
 assert.equal(s.data.landlords.length,2);
 assert.equal(s.data.ad_sites.length,2);
 s.data.campaign_sites=[];
 s.data.customer_contracts[0].site_id='site-a';
 assert.equal(app.landlordDeleteStats('a').booked,1);
 s.data.customer_contracts[0].site_id=null;
 s.data.customer_contracts[0].campaign_sites_snapshot=[{id:'site-a',code:'E01'}];
 assert.equal(app.landlordDeleteStats('a').booked,1,'historical client contract board snapshots must block destructive site deletion');
 s.staff={role:'staff'};s.modal=null;app.render();
 assert.doesNotMatch(root.innerHTML,/data-delete-landlord/);
});

test('real landlord deletion uses one server RPC; denial leaves all data intact',async()=>{
 const {app,s}=setup();s.demo=false;s.session={user:{id:'admin-user'}};
 const calls=[];
 s.client={rpc:async(name,params)=>{calls.push({name,params});return {data:null,error:{message:'Denied'}}}};
 app.openLandlordDelete('a');
 await app.deleteLandlordConfirmed({values:{landlord_id:'a',confirm:'حذف'}});
 assert.deepEqual(calls,[{name:'raafat_delete_landlord_cascade',params:{p_landlord_id:'a'}}]);
 assert.equal(s.data.landlords.length,2);
 assert.equal(s.data.ad_sites.length,2);
});
