import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('collapsible sidebar isolates customers and rooftop landlords and preserves open page',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'')
  .replace(/\nbootstrap\(\);\s*$/,'');
 const app={innerHTML:''};
 const controls={};
 const fakeDoc={
  querySelector:selector=>selector==='#app'?app:null,
  querySelectorAll(selector){
   const attr=selector==='[data-nav]'?'nav':selector==='[data-nav-group]'?'nav-group':null;
   if(!attr)return [];
   const re=new RegExp('data-'+attr+'="([^"]+)"','g');
   const buttons=[...app.innerHTML.matchAll(re)].map(m=>({
    dataset:attr==='nav'?{nav:m[1]}:{navGroup:m[1]},
    onclick:null
   }));
   controls[selector]=buttons;
   return buttons;
  },
  createElement:()=>({style:{},remove(){}}),
  body:{append(){}}
 };
 const {s,nav,NAV_GROUPS,navGroupForView,render,changeNavGroup,openForm,seededDemoPackages,seededDemoRates}=
  new Function('localStorage','document','crypto','createClient','window',source+
   '\nreturn {s,nav,NAV_GROUPS,navGroupForView,render,changeNavGroup,openForm,seededDemoPackages,seededDemoRates};'
  )({getItem:()=>null,setItem:()=>{}},fakeDoc,{randomUUID:()=> 'test-id'},()=>{},{});
 s.demo=true;s.staff={role:'admin'};
 s.data.packages=seededDemoPackages();
 s.data.package_rates=seededDemoRates();

 assert.equal(NAV_GROUPS.length,3);
 assert.deepEqual(NAV_GROUPS[0].items.map(item=>item[0]),[
  'customers','packages','campaigns','customer_contracts','ad_sites','campaign_payments'
 ]);
 assert.deepEqual(NAV_GROUPS[1].items.map(item=>item[0]),[
  'landlords','properties','leases','lease_installments'
 ]);
 assert.equal(navGroupForView('customer_contracts'),'customers');
 assert.equal(navGroupForView('campaign_payments'),'customers');
 assert.equal(navGroupForView('leases'),'landlords');
 assert.equal(navGroupForView('lease_installments'),'landlords');
 assert.equal(navGroupForView('company_expenses'),'finance');
 assert.deepEqual(NAV_GROUPS[2].items.map(item=>item[0]),['company_expenses','employees']);
 assert.equal(navGroupForView('employees'),'finance');
 assert.equal(navGroupForView('dashboard'),null);

 s.view='dashboard';
 render();
 assert.equal(s.navExpanded,null);
 assert.match(app.innerHTML,/data-nav-group="customers" aria-expanded="false"/);
 assert.match(app.innerHTML,/data-nav-group="landlords" aria-expanded="false"/);
 assert.match(app.innerHTML,/id="nav-group-customers"[^>]*hidden/);
 assert.match(app.innerHTML,/id="nav-group-landlords"[^>]*hidden/);
 assert.match(app.innerHTML,/id="nav-group-finance"[^>]*hidden/);

 const customerToggle=controls['[data-nav-group]'].find(x=>x.dataset.navGroup==='customers');
 assert.equal(typeof customerToggle.onclick,'function');
 customerToggle.onclick();
 assert.equal(s.view,'dashboard','opening a group must not navigate');
 assert.equal(s.navExpanded,'customers');
 assert.match(app.innerHTML,/data-nav-group="customers" aria-expanded="true"/);
 assert.doesNotMatch(app.innerHTML,/id="nav-group-customers"[^>]*hidden/);
 assert.match(app.innerHTML,/id="nav-group-landlords"[^>]*hidden/);

 const campaignLink=controls['[data-nav]'].find(x=>x.dataset.nav==='campaigns');
 assert.equal(typeof campaignLink.onclick,'function');
 campaignLink.onclick();
 assert.equal(s.view,'campaigns');
 assert.equal(s.navExpanded,'customers');
 assert.match(app.innerHTML,/data-nav="campaigns" class="nav-link active" aria-current="page"/);
 assert.match(app.innerHTML,/المشاريع والحملات/);
 assert.doesNotThrow(()=>openForm('campaigns'),'new campaign form still works');
 assert.match(app.innerHTML,/إضافة حملة إعلانية/);

 const landlordToggle=controls['[data-nav-group]'].find(x=>x.dataset.navGroup==='landlords');
 landlordToggle.onclick();
 assert.equal(s.navExpanded,'landlords');
 assert.equal(s.view,'campaigns','switching sidebar group keeps the current page');
 assert.match(app.innerHTML,/id="nav-group-customers"[^>]*hidden/);
 assert.doesNotMatch(app.innerHTML,/id="nav-group-landlords"[^>]*hidden/);

 const leaseLink=controls['[data-nav]'].find(x=>x.dataset.nav==='leases');
 leaseLink.onclick();
 assert.equal(s.view,'leases');
 assert.equal(s.navExpanded,'landlords');
 assert.equal(s.modal,null,'navigation should close the old edit form');
 assert.match(app.innerHTML,/عقود مالكي البنايات/);

 controls['[data-nav-group]'].find(x=>x.dataset.navGroup==='landlords').onclick();
 assert.equal(s.navExpanded,null,'clicking an open group collapses it');
 assert.equal(s.view,'leases','collapsing must keep the content intact');
 assert.match(app.innerHTML,/id="nav-group-landlords"[^>]*hidden/);

 const settingsLink=controls['[data-nav]'].find(x=>x.dataset.nav==='settings');
 settingsLink.onclick();
 assert.equal(s.view,'settings');
 assert.equal(s.navExpanded,null);
 assert.match(app.innerHTML,/الإعدادات/);
});

test('sidebar layout has mobile and keyboard-visible group styling',()=>{
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/\.nav-group-items\[hidden\]\{display:none!important\}/);
 assert.match(css,/\.nav-group-list\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.nav button:focus-visible/);
});
