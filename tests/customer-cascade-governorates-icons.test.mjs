import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function setup(){
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const root={innerHTML:''};
 const document={
  title:'',
  querySelector:q=>q==='#app'?root:null,
  querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),
  body:{append(){}}
 };
 class MockFormData{
  constructor(form){this.values=form.values||{}}
  get(k){return this.values[k]??null}
  *entries(){for(const row of Object.entries(this.values))yield row}
 }
 class MockFile{}
 let serial=1;
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File','setTimeout',
  source+'\nreturn {s,render,listing,modalHtml,governorateField,IRAQ_GOVERNORATES,fieldHtml,nav,settings,uiIcon,openCustomerDelete,customerCascadeStats,deleteCustomerConfirmed};'
 )({getItem:()=>null,setItem:()=>{}},document,{randomUUID:()=>String(serial++)},()=>{},{},MockFormData,MockFile,()=>{});
 const {s}=app;
 s.demo=true;s.staff={role:'admin',active:true};s.view='customers';
 s.data.customers=[
  {id:'a',name:'عميل تجربة A',phone:'07700000000',status:'active'},
  {id:'b',name:'عميل محفوظ B',phone:'07711111111',status:'active'}
 ];
 s.data.campaigns=[
  {id:'ca',customer_id:'a',title:'إعلان A',price:100,currency:'USD',months:3},
  {id:'cb',customer_id:'b',title:'إعلان B',price:150,currency:'USD',months:3}
 ];
 s.data.campaign_payments=[
  {id:'pa',campaign_id:'ca',amount:60,paid_at:'2026-11-14'},
  {id:'pb',campaign_id:'cb',amount:50,paid_at:'2026-11-14'}
 ];
 s.data.campaign_sites=[
  {id:'link-a',campaign_id:'ca',site_id:'shared-site'},
  {id:'link-b',campaign_id:'cb',site_id:'shared-site'}
 ];
 s.data.customer_contracts=[
  {id:'contract-a',customer_id:'a',campaign_id:'ca',contract_number:'RC-1'},
  {id:'old-a',customer_id:'a',campaign_id:null,contract_number:'RC-2'},
  {id:'contract-b',customer_id:'b',campaign_id:'cb',contract_number:'RC-3'}
 ];
 s.data.ad_sites=[{id:'shared-site',code:'A01',name:'موقع مشترك'}];
 s.data.packages=[{id:'package-a',name:'الباقة A',code:'A'}];
 s.data.landlords=[{id:'owner',name:'مؤجّر محفوظ',governorate:'صلاح الدين'}];
 s.data.properties=[{id:'roof',landlord_id:'owner',title:'سطح محفوظ'}];
 s.data.leases=[{id:'lease',landlord_id:'owner',property_id:'roof',rent_total:1000}];
 s.data.lease_installments=[{id:'rent',lease_id:'lease',amount:500}];
 return {app,root};
}

test('customer deletion requires admin role and an explicit irreversible confirmation',async()=>{
 const {app,root}=setup();
 app.render();
 assert.match(root.innerHTML,/data-delete-customer="a"/);
 assert.match(root.innerHTML,/data-delete-customer="b"/);
 assert.deepEqual(app.customerCascadeStats('a'),{campaigns:1,contracts:2,payments:1,siteLinks:1});
 app.openCustomerDelete('a');
 assert.equal(app.s.modal.kind,'deleteCustomer');
 assert.match(root.innerHTML,/حذف الزبون وجميع سجلاته/);
 assert.match(root.innerHTML,/disabled>حذف الزبون وكل سجلاته نهائياً/);
 assert.match(root.innerHTML,/لا يمكن التراجع عنها/);

 // A cancelled/mistyped attempt cannot erase any data.
 await app.deleteCustomerConfirmed({values:{customer_id:'a',confirm:'نعم'}});
 assert.equal(app.s.data.customers.length,2);
 await app.deleteCustomerConfirmed({values:{customer_id:'b',confirm:'حذف'}});
 assert.equal(app.s.data.customers.length,2);

 // Exact confirmation wipes only the selected customer's dependent records.
 await app.deleteCustomerConfirmed({values:{customer_id:'a',confirm:'حذف'}});
 assert.deepEqual(app.s.data.customers.map(x=>x.id),['b']);
 assert.deepEqual(app.s.data.campaigns.map(x=>x.id),['cb']);
 assert.deepEqual(app.s.data.campaign_payments.map(x=>x.id),['pb']);
 assert.deepEqual(app.s.data.campaign_sites.map(x=>x.id),['link-b']);
 assert.deepEqual(app.s.data.customer_contracts.map(x=>x.id),['contract-b']);
 assert.equal(app.s.data.ad_sites.length,1);
 assert.equal(app.s.data.packages.length,1);
 assert.equal(app.s.data.landlords.length,1);
 assert.equal(app.s.data.properties.length,1);
 assert.equal(app.s.data.leases.length,1);
 assert.equal(app.s.data.lease_installments.length,1);
 assert.equal(app.s.modal,null);
 assert.doesNotMatch(root.innerHTML,/عميل تجربة A/);

 app.s.staff={role:'staff'};
 app.render();
 assert.doesNotMatch(root.innerHTML,/data-delete-customer=/);
 app.openCustomerDelete('b');
 assert.equal(app.s.modal,null);
});

test('real customer deletion uses one server RPC rather than unsafe client-side cascades',async()=>{
 const {app}=setup();
 app.s.demo=false;app.s.staff={role:'admin',active:true};
 app.s.session={user:{id:'admin-id'}};
 const sent=[];
 app.s.client={rpc:async(name,params)=>{sent.push({name,params});return {data:null,error:{message:'Server denied'}}}};
 app.openCustomerDelete('a');
 await app.deleteCustomerConfirmed({values:{customer_id:'a',confirm:'حذف'}});
 assert.deepEqual(sent,[{name:'raafat_delete_customer_cascade',params:{p_customer_id:'a'}}]);
 assert.equal(app.s.data.customers.length,2,'network failure cannot erase local customer list');
});

test('Iraq governorate dropdown lists all 19 provinces and preserves legacy saved values',()=>{
 const {app}=setup();
 assert.equal(app.IRAQ_GOVERNORATES.length,19);
 assert.equal(new Set(app.IRAQ_GOVERNORATES).size,19);
 for(const required of ['صلاح الدين','كركوك','بغداد','حلبجة','البصرة','دهوك','القادسية'])
  assert.ok(app.IRAQ_GOVERNORATES.includes(required),required);
 const field=app.governorateField('governorate','المحافظة','صلاح الدين',true);
 assert.match(field,/<select name="governorate" required>/);
 assert.match(field,/value="صلاح الدين" selected/);
 assert.equal((field.match(/<option value="[^"]+"/g)||[]).length,20,'19 choices and placeholder');
 assert.match(app.governorateField('governorate','المحافظة','اسم قديم',true),/القيمة المحفوظة سابقاً: اسم قديم/);
 app.s.modal={kind:'edit',table:'landlords',data:{}};
 assert.match(app.fieldHtml(['governorate','المحافظة','text',true],{governorate:'كركوك'},{governorate:'كركوك'}),/<select name="governorate"/);
 app.s.modal={kind:'edit',table:'ad_sites',data:{}};
 assert.match(app.fieldHtml(['governorate','المحافظة','text',true],{governorate:'البصرة'},{governorate:'البصرة'}),/<select name="governorate"/);
 app.s.settings.company_governorate='بغداد';
 assert.match(app.settings(),/<select name="company_governorate"/);
 assert.match(app.settings(),/value="بغداد" selected/);
});

test('navigation and settings icons are actual accessible, self-contained SVGs',()=>{
 const {app}=setup();
 const nav=app.nav(),settings=app.settings();
 assert.ok((nav.match(/<svg /g)||[]).length>=14);
 assert.match(nav,/stroke-width="1.8"/);
 assert.doesNotMatch(nav,/[♟◈✦▣▧◉]/);
 assert.match(settings,/<svg /);
 assert.match(app.uiIcon('trash',16),/<svg class="ui-icon"/);
 assert.match(app.uiIcon('x',18),/<path d=/);
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/\.ui-icon\{display:inline-block/);
 assert.match(css,/\.customer-delete-modal\{/);
});
