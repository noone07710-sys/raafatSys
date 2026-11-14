import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('campaigns navigation and five-step create/edit wizard do not crash',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'')
  .replace(/\nbootstrap\(\);\s*$/,'');
 const app={innerHTML:''};
 const document={
  querySelector:query=>query==='#app'?app:null,
  querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),
  body:{append(){}}
 };
 const api=new Function('localStorage','document','crypto','createClient','window',
  source+'\nreturn {s,render,openForm,seededDemoPackages,seededDemoRates};'
 )({getItem:()=>null,setItem:()=>{}},document,{randomUUID:()=> 'uuid'},()=>{},{});
 const {s,render,openForm,seededDemoPackages,seededDemoRates}=api;
 s.demo=true;s.staff={role:'admin'};
 s.data.packages=seededDemoPackages();
 s.data.package_rates=seededDemoRates();
 s.data.customers=[{id:'customer-1',name:'عميل تجريبي',phone:'07700000000',preferred_package_id:'demo-package-A',rental_address:'تكريت'}];
 s.data.ad_sites=[{id:'site-1',name:'موقع تجريبي',code:'A-1',governorate:'صلاح الدين',address:'تكريت',active:true}];
 s.view='campaigns';
 assert.doesNotThrow(()=>render(),'campaigns tab itself must render');
 assert.match(app.innerHTML,/المشاريع والحملات/);
 assert.match(app.innerHTML,/data-new="campaigns"/);
 assert.doesNotThrow(()=>openForm('campaigns'),'Add campaign button should open');
 assert.match(app.innerHTML,/إضافة حملة إعلانية/);
 Object.assign(s.modal.data,{
  customer_id:'customer-1',title:'حملة تجريبية',package_id:'demo-package-A',
  currency:'USD',months:3,price:280,quantity:1
 });
 s.modal.siteIds=['site-1'];
 for(let step=0;step<5;step++){
  s.formStep=step;
  assert.doesNotThrow(()=>render(),'create wizard must render step '+step);
  assert.match(app.innerHTML,/إضافة حملة إعلانية/);
 }
 const campaign={
  id:'campaign-1',title:'حملة عميل',customer_id:'customer-1',
  package_id:'demo-package-A',price:280,currency:'USD',months:3,quantity:1
 };
 s.data.campaigns=[campaign];
 s.data.campaign_payments=[{id:'payment-1',campaign_id:campaign.id,amount:80,paid_at:'2026-11-14'}];
 assert.doesNotThrow(()=>{s.modal=null;render();},'listing existing campaigns must work');
 assert.match(app.innerHTML,/حملة عميل/);
 assert.doesNotThrow(()=>openForm('campaigns',campaign),'edit existing campaign must open');
 for(let step=0;step<5;step++){
  s.formStep=step;
  assert.doesNotThrow(()=>render(),'edit wizard must render step '+step);
  assert.match(app.innerHTML,/تعديل حملة إعلانية/);
 }
});
