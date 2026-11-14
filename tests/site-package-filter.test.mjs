import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('A-E billboard categories filter sites and reject cross-package bookings',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const appNode={innerHTML:''};
 const document={
  title:'',
  querySelector:query=>query==='#app'?appNode:null,
  querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),
  body:{append(){}}
 };
 const {
  s,defs,columns,codedSitePackage,sitePackageId,siteMatchesPackage,
  selectedSiteCards,fieldHtml,openForm,formValidate,seededDemoPackages,seededDemoRates,showVal
 }=new Function('localStorage','document','crypto','createClient','window',source+
  '\nreturn {s,defs,columns,codedSitePackage,sitePackageId,siteMatchesPackage,selectedSiteCards,fieldHtml,openForm,formValidate,seededDemoPackages,seededDemoRates,showVal};'
 )({getItem:()=>null,setItem:()=>{}},document,{randomUUID:()=> 'test-uid'},()=>{}, {});
 s.demo=true;s.staff={role:'admin'};
 s.data.packages=seededDemoPackages();s.data.package_rates=seededDemoRates();
 const pkg=letter=>s.data.packages.find(p=>p.code===letter);
 const id=letter=>pkg(letter).id;
 const site=(name,code,packageId,siteType='roadside')=>({id:name,name,code,package_id:packageId,site_type:siteType,governorate:'صلاح الدين',address:'تكريت',active:true});
 s.data.ad_sites=[
  site('siteA','A01',id('A')),
  site('siteB','B-12',id('B')),
  site('siteC','C_03',id('C')),
  site('siteD','D.4',id('D')),
  site('siteE','E/8',id('E'),'rooftop'),
  site('legacyA','A-09',null),
  site('legacyE','E10',null),
  site('notA','ALAM-15',null),
  site('conflict','A-22',id('B')),
 ];
 s.data.customers=[{id:'customer-1',name:'عميل',phone:'07712345678'}];
 assert.equal(codedSitePackage('A01'),'A');
 assert.equal(codedSitePackage('a - 12'),'A');
 assert.equal(codedSitePackage('B-12'),'B');
 assert.equal(codedSitePackage('E/8'),'E');
 assert.equal(codedSitePackage('ALAM-15'),'');
 assert.equal(codedSitePackage('X-03'),'');
 assert.equal(sitePackageId(s.data.ad_sites.find(x=>x.id==='legacyA')),id('A'));
 assert.equal(sitePackageId(s.data.ad_sites.find(x=>x.id==='conflict')),null);
 assert.equal(siteMatchesPackage(s.data.ad_sites.find(x=>x.id==='siteA'),id('B')),false);
 assert.equal(siteMatchesPackage(s.data.ad_sites.find(x=>x.id==='legacyA'),id('A')),true);

 assert.ok(defs.ad_sites.fields.some(f=>f[0]==='package_id'&&f[3]===true));
 assert.ok(columns.ad_sites.some(f=>f[0]==='package_id'));
 assert.match(showVal('ad_sites',s.data.ad_sites[0],'package_id'),/الباقة A/);
 assert.match(showVal('ad_sites',s.data.ad_sites[7],'package_id'),/غير مصنّف/);
 const selected={siteIds:[],table:'campaigns'};
 s.modal=selected;
 for(const letter of ['A','B','C','D','E']){
  const html=selectedSiteCards({package_id:id(letter)});
  assert.match(html,new RegExp('القطع التابعة للباقة '+letter));
  for(const other of ['A','B','C','D','E']){
   assert.equal(html.includes('data-site-id="site'+other+'"'),letter===other,
    letter+' should show only its own '+other+' registered site');
  }
 }
 assert.match(selectedSiteCards({package_id:id('A')}),/data-site-id="legacyA"/);
 assert.doesNotMatch(selectedSiteCards({package_id:id('A')}),/data-site-id="notA"/);
 assert.doesNotMatch(selectedSiteCards({package_id:id('A')}),/data-site-id="conflict"/);
 assert.match(selectedSiteCards({package_id:id('E')}),/data-site-id="legacyE"/);
 assert.doesNotMatch(selectedSiteCards({package_id:''}),/data-site-id=/);

 s.modal.siteIds=['siteB'];
 assert.match(selectedSiteCards({package_id:id('A')}),/قطع مرتبطة سابقاً/);
 assert.doesNotMatch(selectedSiteCards({package_id:id('A')}),/data-site-id="siteB"/);

 assert.doesNotThrow(()=>formValidate('ad_sites', {code:'A01',name:'جديدة A',package_id:id('A'),site_type:'roadside'}));
 assert.throws(()=>formValidate('ad_sites',{code:'A01',package_id:id('B'),site_type:'roadside'}),/لا يطابق الباقة/);
 assert.throws(()=>formValidate('ad_sites',{code:'A01',package_id:'',site_type:'roadside'}),/حدد باقة/);
 assert.throws(()=>formValidate('ad_sites',{code:'E-10',package_id:id('E'),site_type:'rooftop'}),/عقار/);

 const campaign={customer_id:'customer-1',package_id:id('A'),months:3,locations:'تكريت',price:280,currency:'USD'};
 assert.throws(()=>formValidate('campaigns',campaign),/لا تتبع الباقة/);
 s.modal.siteIds=['siteA','legacyA'];
 assert.doesNotThrow(()=>formValidate('campaigns',campaign));
 s.modal.siteIds=['siteE'];
 assert.throws(()=>formValidate('campaigns',campaign),/لا تتبع الباقة/);
 s.modal.siteIds=[];

 assert.throws(()=>formValidate('customer_contracts',{
  customer_id:'customer-1',package_id:id('A'),contract_type:'cabin',
  site_id:'siteB',duration_months:3,start_date:'2026-11-14',end_date:'2027-02-13',amount:280
 }),/لا يتبع الباقة/);
 assert.doesNotThrow(()=>formValidate('customer_contracts',{
  customer_id:'customer-1',package_id:id('A'),contract_type:'cabin',
  site_id:'siteA',duration_months:3,start_date:'2026-11-14',end_date:'2027-02-13',amount:280
 }));

 s.modal={table:'customer_contracts'};
 const siteField=defs.customer_contracts.fields.find(f=>f[0]==='site_id');
 const dropdown=fieldHtml(siteField,{package_id:id('A')},{package_id:id('A')});
 assert.match(dropdown,/value="siteA"/);
 assert.match(dropdown,/value="legacyA"/);
 assert.doesNotMatch(dropdown,/value="siteB"/);
 assert.doesNotMatch(dropdown,/value="siteE"/);

 openForm('ad_sites',{id:'legacyA',name:'قديمة',code:'A-09',site_type:'roadside',active:true});
 assert.equal(s.modal.data.package_id,id('A'),'legacy code automatically selects category when site is edited');
});
