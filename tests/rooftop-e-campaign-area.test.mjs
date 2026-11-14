import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function harness(){
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const page={innerHTML:''};
 const document={
  title:'',
  querySelector:q=>q==='#app'?page:null,
  querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){},textContent:''}),
  body:{append(){}}
 };
 let serial=1;
 class FileMock{}
 class FormDataMock{
  constructor(form){this.data=form?.values||{}}
  *entries(){for(const entry of Object.entries(this.data))yield entry}
 }
 const api=new Function('localStorage','document','crypto','createClient','window','FormData','File','setTimeout',
  source+'\nreturn {s,render,openForm,clean,saveForm,formValidate,fieldHtml,quoteCampaign,selectedRooftopAreas,packagePricingInfo,seededDemoPackages,seededDemoRates};'
 )({getItem:()=>null,setItem:()=>{}},document,{randomUUID:()=>String(serial++)},()=>{},{},FormDataMock,FileMock,()=>{});
 const s=api.s;
 s.demo=true;
 s.staff={role:'admin',active:true};
 s.data.packages=api.seededDemoPackages();
 s.data.package_rates=api.seededDemoRates();
 const pkg=code=>s.data.packages.find(row=>row.code===code);
 s.data.customers=[{id:'customer-1',name:'عميل تجريبي',phone:'07712345678',national_id:'123456789012'}];
 s.data.properties=[
  {id:'roof-24',title:'سطح 24 متر',area_m2:24,width_m:4,height_m:6},
  {id:'roof-12',title:'سطح 12 متر',area_m2:null,width_m:2,height_m:6}
 ];
 s.data.ad_sites=[
  {id:'site-E1',code:'E01',name:'سطح أول',package_id:pkg('E').id,site_type:'rooftop',rooftop_property_id:'roof-24',governorate:'صلاح الدين',address:'تكريت',active:true},
  {id:'site-E2',code:'E02',name:'سطح ثاني',package_id:pkg('E').id,site_type:'rooftop',rooftop_property_id:'roof-12',governorate:'صلاح الدين',address:'سامراء',active:true},
  {id:'site-bad',code:'E03',name:'بدون قياس',package_id:pkg('E').id,site_type:'rooftop',rooftop_property_id:null,governorate:'صلاح الدين',address:'كركوك',active:true}
 ];
 return {api,s,pkg,page};
}

test('E billboards pull rooftop areas automatically and never offer an editable meters field',()=>{
 const {api,s,pkg,page}=harness();
 const ids=['site-E1','site-E2'];
 assert.deepEqual(api.selectedRooftopAreas(ids).area,36);
 assert.deepEqual(api.selectedRooftopAreas(ids).invalid,[]);
 const value={package_id:pkg('E').id,months:6,quantity:1,requested_area_m2:9999,currency:'USD'};
 assert.equal(api.quoteCampaign(value,ids).area,36);
 assert.equal(api.quoteCampaign(value,ids).total,1944,'36m² * $9/m²/month * 6');
 assert.equal(api.quoteCampaign(value,[]),null,'manually typed meters alone cannot generate E quote');

 api.openForm('campaigns',{customer_id:'customer-1',package_id:pkg('E').id,months:6,price:0});
 s.modal.siteIds=ids;
 s.formStep=1;
 api.render();
 assert.doesNotMatch(page.innerHTML,/name="requested_area_m2"/);
 assert.match(page.innerHTML,/المساحة المحتسبة تلقائياً/);
 assert.match(page.innerHTML,/36/);
 assert.match(page.innerHTML,/سطح أول/);
 assert.match(page.innerHTML,/سطح ثاني/);
 assert.match(page.innerHTML,/24 م²/);
 assert.match(page.innerHTML,/12 م²/);
 assert.doesNotMatch(api.fieldHtml(['requested_area_m2','مساحة الإعلان بالمتر','number'],s.modal.data,s.modal.data),/<input/);
});

test('E final save derives meters from assigned rooftops and stores clean numbers',async()=>{
 const {api,s,pkg}=harness();
 api.openForm('campaigns',{
  customer_id:'customer-1',title:'حملة أسطح',
  package_id:pkg('E').id,months:6,start_date:'2026-11-14',
  quantity:1,price:1944,currency:'USD',requested_area_m2:''
 });
 s.modal.siteIds=['site-E1','site-E2'];
 s.formStep=4;
 await api.saveForm({values:{},querySelectorAll:()=>[]});
 assert.equal(s.data.campaigns.length,1,'campaign should save successfully');
 const saved=s.data.campaigns[0];
 assert.equal(saved.requested_area_m2,36);
 assert.equal(saved.quantity,2);
 assert.equal(saved.price,1944);
 assert.equal(s.data.campaign_sites.length,2);
 assert.deepEqual(s.data.campaign_sites.map(x=>x.site_id).sort(),['site-E1','site-E2']);
});

test('unused optional numeric area is null for A-D; no blank SQL numeric payload',async()=>{
 const {api,s,pkg}=harness();
 assert.equal(api.clean('campaigns',{
  requested_area_m2:'',package_id:pkg('A').id,months:3
 }).requested_area_m2,null);
 assert.equal(api.clean('campaigns',{
  requested_area_m2:null,package_id:pkg('A').id,months:3
 }).requested_area_m2,null);
 assert.throws(()=>api.clean('campaigns',{
  requested_area_m2:'abc',package_id:pkg('A').id
 }),/قيمة رقمية غير صالحة/);
 api.openForm('campaigns',{
  customer_id:'customer-1',title:'لوحات A',package_id:pkg('A').id,
  start_date:'2026-11-14',months:3,quantity:1,requested_area_m2:'',price:280,currency:'USD',locations:'تكريت'
 });
 s.formStep=4;
 await api.saveForm({values:{},querySelectorAll:()=>[]});
 assert.equal(s.data.campaigns.length,1);
 assert.equal(s.data.campaigns[0].requested_area_m2,null);
 assert.equal(s.data.campaigns[0].price,280);
});

test('E refuses unmeasured/unlinked surfaces instead of silently billing wrong meters',()=>{
 const {api,s,pkg}=harness();
 const campaign={
  customer_id:'customer-1',title:'E مشكلة',package_id:pkg('E').id,
  start_date:'2026-11-14',months:3,price:864,currency:'USD'
 };
 s.modal={table:'campaigns',data:campaign,siteIds:[]};
 assert.throws(()=>api.formValidate('campaigns',campaign),/اختَر سطحاً/);
 s.modal.siteIds=['site-E1','site-bad'];
 assert.deepEqual(api.selectedRooftopAreas(s.modal.siteIds).invalid,['E03']);
 assert.throws(()=>api.formValidate('campaigns',campaign),/E03/);
 s.modal.siteIds=['site-E1'];
 assert.doesNotThrow(()=>api.formValidate('campaigns',campaign));
});
