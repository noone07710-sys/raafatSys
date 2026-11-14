import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('official Raafat Map package rates and A-E calculation',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 let serial=0;
 const app=new Function('localStorage','document','crypto','createClient','window',
   source+'\nreturn {s,seededDemoPackages,seededDemoRates,packageRate,quotePackageUSD,quoteCampaign,quoteCustomerContract,packageCatalog,convert,formValidate};'
 )({getItem:()=>null,setItem:()=>{}},{},{randomUUID:()=>String(++serial)},()=>{},{});
 const {s,seededDemoPackages,seededDemoRates,packageRate,quotePackageUSD,quoteCampaign,quoteCustomerContract,packageCatalog,convert,formValidate}=app;
 s.demo=true;s.data.packages=seededDemoPackages();s.data.package_rates=seededDemoRates();
 const pkg=code=>s.data.packages.find(x=>x.code===code);
 assert.equal(s.data.packages.length,5);
 assert.equal(s.data.package_rates.length,16);
 for(const [code,m,price] of [
  ['A',3,280],['A',6,430],['A',12,670],
  ['B',3,520],['B',6,760],['B',12,1120],
  ['C',3,760],['C',6,1100],['C',12,1800],
  ['D',3,800],['D',6,1300],['D',12,2100]
 ])assert.equal(quotePackageUSD(pkg(code),m),price,code+' '+m+'m');
 for(const [m,unit] of [[1,15],[3,12],[6,9],[12,6]]){
  assert.equal(Number(packageRate(pkg('E'),m).usd_price),unit);
  assert.equal(quotePackageUSD(pkg('E'),m,1,24),24*m*unit);
 }
 assert.equal(quotePackageUSD(pkg('E'),3,1,0),null,'no roof area must not be charged flat $12');
 assert.equal(quotePackageUSD(pkg('A'),5),null,'no interpolation between official durations');
 assert.equal(quoteCampaign({package_id:pkg('C').id,months:6,quantity:2,currency:'USD'},[]).total,2200);
 assert.equal(quoteCampaign({package_id:pkg('E').id,months:6,requested_area_m2:24,currency:'USD'},[]).total,1296);
 assert.equal(convert(1296,'USD','IQD'),1944000);
 assert.equal(quoteCustomerContract({package_id:pkg('E').id,duration_months:6,rented_area_m2:24,currency:'USD'}).amount,1296);
 s.data.customers=[{id:'customer1',name:'Tester',preferred_package_id:pkg('E').id}];
 s.modal={table:'campaigns',siteIds:[]};
 assert.doesNotThrow(()=>formValidate('campaigns',{customer_id:'customer1',package_id:pkg('E').id,months:3,requested_area_m2:24,locations:'تجريبي',price:864,currency:'USD'}));
 assert.throws(()=>formValidate('campaigns',{customer_id:'customer1',package_id:pkg('E').id,months:3,locations:'تجريبي',price:0,currency:'USD'}),/مساحة/);
 assert.match(packageCatalog(),/الباقة E/);
});
