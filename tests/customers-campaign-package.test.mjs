import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('customers are saved independent of advertising packages; campaign specifies each package',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'')
  .replace(/\nbootstrap\(\);\s*$/,'');
 const appNode={innerHTML:''};
 const document={
  title:'',
  querySelector:q=>q==='#app'?appNode:null,
  querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),
  body:{append(){}}
 };
 let serial=1;
 const app=new Function('localStorage','document','crypto','createClient','window',source+
   '\nreturn {s,render,openForm,defs,columns,clean,formValidate,seededDemoPackages,seededDemoRates,quoteCampaign};'
 )({getItem:()=>null,setItem:()=>{}},document,{randomUUID:()=> 'test-'+serial++},()=>{}, {});
 const {s,render,openForm,defs,columns,clean,formValidate,seededDemoPackages,seededDemoRates,quoteCampaign}=app;
 s.demo=true;s.staff={role:'admin'};
 s.data.packages=seededDemoPackages();
 s.data.package_rates=seededDemoRates();
 const codeToId=code=>s.data.packages.find(x=>x.code===code).id;
 assert.ok(!defs.customers.fields.some(x=>x[0]==='preferred_package_id'),'customer creation must not ask for package');
 assert.ok(!columns.customers.some(x=>x[0]==='preferred_package_id'),'customer table must not show an obsolete requested package');
 assert.equal(defs.campaigns.fields.find(x=>x[0]==='package_id')[3],true,'campaign package must be required');
 assert.match(defs.campaigns.fields.find(x=>x[0]==='package_id')[1],/نوع الإعلان/);
 const customer={
  id:'customer-1',name:'عميل تجريبي',phone:'07712345678',national_id:'123456789012',
  rental_address:'تكريت',status:'active',alternate_phone:'',notes:''
 };
 assert.doesNotThrow(()=>formValidate('customers',customer),'customer can be created without selecting ad type');
 const savedCustomer=clean('customers',customer);
 assert.ok(!Object.hasOwn(savedCustomer,'preferred_package_id'),'new customer record must not write package preference');
 s.data.customers=[customer];
 s.view='customers';
 render();
 assert.match(appNode.innerHTML,/data-new-linked="campaigns\|customer_id\|customer-1"/,'customer listing has direct campaign action');
 openForm('customers',customer);
 assert.doesNotMatch(appNode.innerHTML,/الباقة الإعلانية المطلوبة/);
 openForm('campaigns',{customer_id:customer.id});
 assert.equal(s.modal.data.customer_id,customer.id);
 assert.ok(!s.modal.data.package_id,'package selection must start empty');
 s.formStep=1;render();
 assert.match(appNode.innerHTML,/نوع الإعلان/);
 assert.match(appNode.innerHTML,/name="package_id"/);
 assert.doesNotThrow(()=>openForm('campaigns',{customer_id:customer.id,package_id:codeToId('C')}),'package context can preselect tier');
 assert.equal(s.modal.data.package_id,codeToId('C'));
 assert.equal(s.modal.data.months,3);
 assert.equal(quoteCampaign({package_id:codeToId('C'),months:6,quantity:1,currency:'USD'},[]).total,1100);

 s.modal.siteIds=[];
 assert.throws(()=>formValidate('campaigns',{customer_id:customer.id,title:'حملة غير محددة',start_date:'2026-11-14',months:3,locations:'تكريت',price:100,currency:'USD'}),/حدد نوع الإعلان/, 'ad type required for campaign');

 for(const [packageCode,title] of [['A','حملة لوحات'],['E','حملة أسطح']]){
  const adPackage=codeToId(packageCode);
  const data={
   customer_id:customer.id,title,package_id:adPackage,
   start_date:'2026-11-14',months:3,price:packageCode==='E'?180:280,currency:'USD',
   quantity:1,requested_area_m2:packageCode==='E'?5:null,locations:'تكريت'
  };
  assert.doesNotThrow(()=>formValidate('campaigns',data),'campaign with '+packageCode+' valid');
  const saved=clean('campaigns',data);
  assert.equal(saved.package_id,adPackage);
  assert.equal(saved.customer_id,customer.id);
  s.data.campaigns.push({id:'campaign-'+packageCode,...saved});
 }
 assert.equal(s.data.campaigns.filter(c=>c.customer_id===customer.id).length,2);
 assert.notEqual(s.data.campaigns[0].package_id,s.data.campaigns[1].package_id,'same customer can buy different ad types');
});
