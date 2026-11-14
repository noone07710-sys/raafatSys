import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function setup(){
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const element={innerHTML:''};
 const doc={
  title:'',
  querySelector:q=>q==='#app'?element:null,
  querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){},textContent:''}),
  body:{append(){}}
 };
 class MockFormData{
  constructor(form){this.form=form}
  *entries(){for(const entry of Object.entries(this.form.values||{}))yield entry}
 }
 class MockFile{}
 let serial=1;
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File','setTimeout',source+
  '\nreturn {s,render,listing,openForm,modalHtml,saveForm,formValidate,campaignPaymentOverview,campaignPaid,campaignBalance,seededDemoPackages,seededDemoRates};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=>`id-${serial++}`},()=>{},{},MockFormData,MockFile,()=>{});
 const {s}=app;
 s.demo=true;s.staff={role:'admin'};
 s.data.packages=app.seededDemoPackages();
 s.data.package_rates=app.seededDemoRates();
 s.data.customers=[{id:'customer-a',name:'شركة الرافدين',phone:'07700000000'},
  {id:'customer-b',name:'مكتبة الزهور',phone:'07701111111'}];
 const pkg=s.data.packages.find(x=>x.code==='A');
 s.data.campaigns=[
  {id:'campaign-a',title:'إعلانات افتتاح',customer_id:'customer-a',package_id:pkg.id,months:3,quantity:1,
   currency:'USD',price:1000,start_date:'2026-11-14',locations:'تكريت'},
  {id:'campaign-b',title:'إعلانات الخريف',customer_id:'customer-b',package_id:pkg.id,months:6,quantity:1,
   currency:'IQD',price:300000,start_date:'2026-11-14',locations:'سامراء'},
  {id:'campaign-c',title:'حملة مدفوعة بالكامل',customer_id:'customer-a',package_id:pkg.id,months:3,quantity:1,
   currency:'USD',price:100,start_date:'2026-11-14',locations:'كركوك'}
 ];
 s.data.campaign_payments=[
  {id:'payment-1',campaign_id:'campaign-a',amount:200,paid_at:'2026-11-14',notes:'دفعة أولى'},
  {id:'payment-2',campaign_id:'campaign-a',amount:200,paid_at:'2026-11-15',notes:'دفعة ثانية'},
  {id:'payment-3',campaign_id:'campaign-b',amount:150000,paid_at:'2026-11-14',notes:'دفعة الخريف'},
  {id:'payment-4',campaign_id:'campaign-c',amount:100,paid_at:'2026-11-14'}
 ];
 return {app,element,doc};
}

test('payment page lists every campaign as account with total, received, remaining and history',()=>{
 const {app}=setup(),{s}=app;
 s.view='campaign_payments';s.displayCurrency='IQD';s.settings.usd_iqd=1500;
 const html=app.listing('campaign_payments');
 assert.match(html,/حسابات الحملات الإعلانية/);
 for(const name of ['إعلانات افتتاح','إعلانات الخريف','حملة مدفوعة بالكامل','شركة الرافدين','مكتبة الزهور'])
  assert.match(html,new RegExp(name));
 for(const label of ['إجمالي الحملة','الواصل','المتبقي','سجل الدفعات السابقة'])
  assert.match(html,new RegExp(label));
 assert.match(html,/1,000 \$|1,000 \$|1,000/);
 assert.match(html,/400 \$/);
 assert.match(html,/600 \$/);
 assert.match(html,/300,000 د\.ع/);
 assert.match(html,/150,000 د\.ع/);
 assert.match(html,/1,950,000 د\.ع/,'total must convert 1000 USD + 300000 IQD + 100 USD');
 assert.match(html,/1,050,000 د\.ع/,'remaining must convert 600 USD + 150000 IQD');
 assert.match(html,/دفعة أولى/);assert.match(html,/دفعة ثانية/);
 assert.match(html,/data-edit="campaign_payments:payment-2"/);
 assert.match(html,/data-new-linked="campaign_payments\|campaign_id\|campaign-a"/);
 assert.match(html,/data-new-linked="campaign_payments\|campaign_id\|campaign-b"/);
 assert.match(html,/campaign-payment-status settled/);
 assert.match(html,/disabled title="الحملة مسددة بالكامل"/);

 s.search='الخريف';
 const filtered=app.listing('campaign_payments');
 assert.match(filtered,/إعلانات الخريف/);
 assert.doesNotMatch(filtered,/إعلانات افتتاح/);
 assert.doesNotMatch(filtered,/حملة مدفوعة بالكامل/);
 s.search='شركة الرافدين';
 assert.match(app.listing('campaign_payments'),/إعلانات افتتاح/);
 assert.doesNotMatch(app.listing('campaign_payments'),/إعلانات الخريف/);
});

test('new partial receipt is entered from one campaign, saved, and updates totals immediately',async()=>{
 const {app}=setup(),{s}=app;
 s.view='campaign_payments';
 app.openForm('campaign_payments',{campaign_id:'campaign-a',amount:''});
 assert.equal(s.modal.data.campaign_id,'campaign-a');
 assert.equal(s.modal.data.amount,'');
 const html=app.modalHtml();
 assert.match(html,/تسجيل دفعة للحملة/);
 assert.match(html,/إعلانات افتتاح/);
 assert.match(html,/شركة الرافدين/);
 assert.match(html,/المتاح لهذه الدفعة/);
 assert.match(html,/600 \$/);
 assert.match(html,/name="campaign_id" value="campaign-a"/);
 assert.doesNotMatch(html,/<select name="campaign_id"/);
 assert.match(html,/name="paid_at"/);
 assert.match(html,/name="amount"/);

 const form={
  values:{campaign_id:'campaign-a',entry_currency:'USD',paid_at:'2026-11-16',amount:'250',notes:'دفعة ثالثة'},
  querySelectorAll(){return []}
 };
 await app.saveForm(form);
 assert.equal(s.modal,null);
 assert.equal(app.campaignPaid('campaign-a'),650);
 assert.equal(app.campaignBalance(s.data.campaigns[0]),350);
 assert.match(app.listing('campaign_payments'),/650 \$/);
 assert.match(app.listing('campaign_payments'),/350 \$/);
 assert.match(app.listing('campaign_payments'),/دفعة ثالثة/);

 s.modal={table:'campaign_payments',data:{campaign_id:'campaign-a'}};
 assert.throws(()=>app.formValidate('campaign_payments',{campaign_id:'campaign-a',amount:351}),/أكبر من رصيد/);
 const original={id:'payment-1',campaign_id:'campaign-b',amount:200};
 assert.throws(()=>app.formValidate('campaign_payments',original),/نقل دفعة/);
});

test('entered payment currency is converted to campaign original currency',async()=>{
 const {app}=setup(),{s}=app;
 s.view='campaign_payments';s.settings.usd_iqd=1500;
 app.openForm('campaign_payments',{campaign_id:'campaign-a',amount:''});
 await app.saveForm({values:{campaign_id:'campaign-a',entry_currency:'IQD',paid_at:'2026-11-16',amount:'150000',notes:'استلام بالدينار'},querySelectorAll(){return []}});
 assert.equal(app.campaignPaid('campaign-a'),500,'150000 IQD should add 100 USD to the USD campaign');
 assert.equal(app.campaignBalance(s.data.campaigns[0]),500);
 assert.match(app.listing('campaign_payments'),/استلام بالدينار/);
});

test('payment dashboard styles preserve responsive cards and no extra ad-hoc payment list',()=>{
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/\.campaign-payment-metrics\{display:grid/);
 assert.match(css,/\.campaign-payment-history\[open\]/);
 assert.match(css,/@media\(max-width:650px\)\{/);
});
