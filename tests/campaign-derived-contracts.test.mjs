import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function makeApp(){
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const el={innerHTML:''};
 const document={
  title:'',
  querySelector(q){return q==='#app'?el:null},
  querySelectorAll(){return []},
  createElement(){return {style:{},remove(){},textContent:''}},
  body:{append(){}}
 };
 class FakeFormData {
  constructor(form){this.values=form.values}
  *entries(){for(const [k,v] of Object.entries(this.values))yield [k,v]}
 }
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File','setTimeout',
  source+'\nreturn {s,render,openForm,saveForm,formValidate,campaignContractData,customerContractPreview,contractCampaignSummary,seededDemoPackages,seededDemoRates};'
 )({getItem:()=>null,setItem:()=>{}},document,{randomUUID:()=>String(Date.now())},()=>{},{},FakeFormData,class FakeFile{},()=>{});
 const {s}=app;
 s.demo=true;s.staff={role:'admin'};
 s.data.packages=app.seededDemoPackages();s.data.package_rates=app.seededDemoRates();
 s.data.customers=[{id:'cust-1',name:'مطعم تجريبي',phone:'07700000000',national_id:'123456789012'}];
 const pkg=code=>s.data.packages.find(x=>x.code===code);
 s.data.ad_sites=[
  {id:'site-a1',code:'A01',name:'مدخل تكريت',address:'مدخل المدينة',governorate:'صلاح الدين',site_type:'roadside',package_id:pkg('A').id,active:true},
  {id:'site-a2',code:'A02',name:'شارع الزهور',address:'شارع الزهور',governorate:'صلاح الدين',site_type:'roadside',package_id:pkg('A').id,active:true}
 ];
 s.data.campaigns=[
  {id:'cam-1',customer_id:'cust-1',title:'إعلانات مطعم',package_id:pkg('A').id,
   months:6,start_date:'2026-11-14',quantity:3,price:1290,currency:'USD',
   locations:'لوحة إضافية قيد التحديد',notes:'تتضمن الطباعة'}
 ];
 s.data.campaign_sites=[
  {id:'link-1',campaign_id:'cam-1',site_id:'site-a1'},
  {id:'link-2',campaign_id:'cam-1',site_id:'site-a2'}
 ];
 return {app,el,pkg};
}

test('campaign is single source of truth for contract, including ALL site codes and number of pieces',async()=>{
 const {app,el,pkg}=makeApp(),{s}=app;
 app.openForm('customer_contracts',{campaign_id:'cam-1'});
 assert.equal(s.modal.data.customer_id,'cust-1');
 assert.equal(s.modal.data.package_id,pkg('A').id);
 assert.equal(s.modal.data.site_id,'site-a1','first site is only the legacy compatibility pointer');
 assert.equal(s.modal.data.duration_months,6);
 assert.equal(s.modal.data.amount,1290);
 assert.equal(s.modal.data.currency,'USD');
 assert.equal(s.modal.data.start_date,'2026-11-14');
 assert.equal(s.modal.data.end_date,'2027-05-13');
 assert.equal(s.modal.data.campaign_quantity_snapshot,3);
 assert.deepEqual(s.modal.data.campaign_sites_snapshot.map(x=>x.code),['A01','A02']);
 assert.match(el.innerHTML,/عدد القطع المتفق عليها/);
 assert.match(el.innerHTML,/مدخل تكريت/);
 assert.match(el.innerHTML,/شارع الزهور/);
 assert.match(el.innerHTML,/لوحة إضافية قيد التحديد/);
 for(const name of ['site_id','customer_id','package_id','amount','currency','duration_months','start_date','end_date','rented_area_m2']){
  assert.doesNotMatch(el.innerHTML,new RegExp('name="'+name+'"'),name+' should not be an editable contract control');
 }
 assert.match(el.innerHTML,/name="campaign_id"/);
 assert.match(el.innerHTML,/name="terms"/);

 const form={values:{campaign_id:'cam-1',company_representative:'المدير',notes:'معتمد',terms:'بنود الاتفاق'},
  querySelectorAll(){return []}};
 await app.saveForm(form);
 assert.equal(s.data.customer_contracts.length,1);
 const saved=s.data.customer_contracts[0];
 assert.equal(saved.contract_number,'RC-1');
 assert.equal(saved.campaign_id,'cam-1');
 assert.equal(saved.customer_id,'cust-1');
 assert.equal(saved.duration_months,6);
 assert.equal(saved.start_date,'2026-11-14');
 assert.equal(saved.end_date,'2027-05-13');
 assert.equal(saved.campaign_quantity_snapshot,3);
 assert.deepEqual(saved.campaign_sites_snapshot.map(x=>x.code),['A01','A02']);
 assert.equal(saved.amount,1290);
 assert.equal(saved.terms,'بنود الاتفاق');
 assert.equal(saved.company_representative,'المدير');
 const preview=app.customerContractPreview(saved);
 assert.match(preview,/A01/);
 assert.match(preview,/A02/);
 assert.match(preview,/عدد القطع المتفق عليها/);
 assert.match(preview,/1,290/);
 assert.match(preview,/تتضمن الطباعة/);

 // Signed contract snapshot does not drift when the campaign and assigned sites change.
 s.data.campaigns[0].price=7777;s.data.campaigns[0].quantity=99;s.data.campaigns[0].months=12;
 s.data.campaign_sites=[];
 const frozen=app.customerContractPreview(saved);
 assert.match(frozen,/A01/);
 assert.match(frozen,/A02/);
 assert.match(frozen,/1,290/);
 assert.match(frozen,/تتضمن الطباعة/);
 assert.equal(saved.campaign_quantity_snapshot,3);
});

test('new customer contracts require existing campaigns and campaign start dates',()=>{
 const {app}=makeApp(),{s}=app;
 assert.throws(()=>app.formValidate('customer_contracts',{customer_id:'cust-1',package_id:s.data.packages[0].id}),/حملة/);
 s.data.campaigns[0].start_date=null;
 app.openForm('customer_contracts',{campaign_id:'cam-1'});
 assert.match(app.contractCampaignSummary(s.modal.data),/تاريخ بدء الحملة غير محدد/);
 assert.equal(s.modal.data.start_date,'');
 assert.throws(()=>app.formValidate('customer_contracts',s.modal.data),/تاريخ بدء/);
});

test('E rooftop campaign propagates area and real campaign total, not a new quote',()=>{
 const {app,pkg}=makeApp(),{s}=app;
 s.data.campaigns[0]={id:'cam-1',customer_id:'cust-1',title:'أسطح',package_id:pkg('E').id,months:6,
  start_date:'2026-11-14',quantity:1,requested_area_m2:24,price:1400,currency:'USD',
  locations:'موقع سطح تجريبي'};
 s.data.campaign_sites=[];
 app.openForm('customer_contracts',{campaign_id:'cam-1'});
 assert.equal(s.modal.data.contract_type,'rooftop');
 assert.equal(s.modal.data.rented_area_m2,24);
 assert.equal(s.modal.data.amount,1400);
 assert.equal(s.modal.data.duration_months,6);
 assert.doesNotThrow(()=>app.formValidate('customer_contracts',s.modal.data));
});
