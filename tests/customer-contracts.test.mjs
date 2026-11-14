import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('package dimensions, client contract print and landlord individual rooftops',async()=>{
 const code=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 let count=0;
 const app=new Function('localStorage','document','crypto','createClient','window',
   code+'\nreturn {s,defs,formValidate,clean,persist,customerContractPreview,previewHtml,landlordRoofMarkup,listing,relatedDetails};'
 )({getItem:()=>null,setItem:()=>{}},{}, {randomUUID:()=>String(++count)},()=>{},{});
 const {s,defs,formValidate,clean,persist,customerContractPreview,previewHtml,landlordRoofMarkup,listing,relatedDetails}=app;
 s.demo=true;
 s.data.packages=[{
  id:'pkg1',name:'كابينة قياسية',code:'CAB-1',package_type:'cabin',width_m:2.5,height_m:3.5,area_m2:8.75,
  price:280,currency:'USD',default_months:3,specifications:'مضيئة وجهين'
 }];
 s.data.customers=[{
  id:'client1',name:'زبون الاختبار',phone:'07701234567',national_id:'123456789012',preferred_package_id:'pkg1'
 }];
 assert.equal(defs.customers.fields.some(f=>f[0]==='preferred_package_id'),false);
 assert.equal(defs.packages.fields.some(f=>f[0]==='area_m2'&&f[2]==='computed'),true);
 assert.equal(defs.properties.fields.some(f=>f[0]==='area_m2'&&f[2]==='computed'),true);
 assert.doesNotThrow(()=>formValidate('packages',{width_m:2.5,height_m:3.5}));
 assert.throws(()=>formValidate('packages',{width_m:0,height_m:3}),/طول وعرض/);
 assert.doesNotThrow(()=>formValidate('customers',{name:'زبون الاختبار',phone:'07701234567',national_id:'123456789012'}));
 assert.doesNotThrow(()=>formValidate('customers',{name:'زبون الاختبار',phone:'07701234567',national_id:'123456789012'}));
 assert.equal(clean('packages',{name:'باقة',code:'A',width_m:2,height_m:4,area_m2:8}).area_m2,undefined);
 assert.equal(clean('properties',{title:'سطح',width_m:10,height_m:8}).dimensions,'10 × 8 m');
 s.data.campaigns=[{id:'cam1',customer_id:'client1',title:'حملة الزبون',package_id:'pkg1',start_date:'2026-11-14',months:3,quantity:2,locations:'تكريت',price:280,currency:'USD'}];
 const contract={campaign_id:'cam1',customer_id:'client1',package_id:'pkg1',contract_type:'cabin',duration_months:3,site_id:'',rented_area_m2:null,start_date:'2026-11-14',end_date:'2027-02-13',amount:280,currency:'USD'};
 assert.doesNotThrow(()=>formValidate('customer_contracts',contract));
 const saved=await persist('customer_contracts',clean('customer_contracts',contract));
 assert.equal(saved.contract_number,'RC-0001');
 assert.match(customerContractPreview(saved),/عقد حجز وتأجير مساحة إعلانية للزبون/);
 assert.match(customerContractPreview(saved),/طباعة \/ حفظ PDF/);
 assert.match(listing('customer_contracts'),/طباعة العقد/);
 assert.match(relatedDetails('customers',s.data.customers[0]),/RC-0001/);
 const roofContract={id:'lease1',contract_number:'RA-1',landlord_id:'owner',property_id:'roof',rent_total:500,
  currency:'USD',payment_frequency:'annual',grace_days:5,start_date:'2026-11-14',end_date:'2027-11-13'};
 s.data.landlords=[{id:'owner',name:'مالك البناية'}];
 s.data.properties=[{id:'roof',title:'سطح البناية',landlord_id:'owner',dimensions:'10 × 8 m',width_m:10,height_m:8,area_m2:80}];
 assert.match(previewHtml(roofContract),/مالك البناية/);
 assert.match(previewHtml(roofContract),/10 × 8 m/);
 assert.match(previewHtml(roofContract),/طباعة العقد/);
 s.modal={kind:'edit',table:'landlords',data:{},roofs:[
  {title:'سطح أول',width_m:10,height_m:8,quantity:1},
  {title:'سطح ثاني',width_m:4,height_m:7,quantity:1}
 ]};
 const roofs=landlordRoofMarkup();
 assert.equal((roofs.match(/data-roof-row=/g)||[]).length,2);
 assert.match(roofs,/80 م²/);
 assert.match(roofs,/28 م²/);
});
