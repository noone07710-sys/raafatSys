import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Raafat Sys linked financial and currency rules',async()=>{
 const code=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'')
  .replace(/\nbootstrap\(\);\s*$/,'');
 const mockStorage={getItem:()=>null,setItem:()=>{}};
 let counter=0;
 const mockCrypto={randomUUID:()=>String(++counter)};
 const app=new Function('localStorage','document','crypto','createClient','window',
  code+'\nreturn {s,convert,roundAmount,formValidate,generateInstallments,syncCampaignSites,linkedSites,campaignBalance,clean,displayMoney};'
 )(mockStorage,{},mockCrypto,()=>{},{});
 const {s,convert,roundAmount,formValidate,generateInstallments,syncCampaignSites,linkedSites,campaignBalance,clean,displayMoney}=app;
 s.demo=true;
 assert.equal(convert(280,'USD','IQD'),420000);
 assert.equal(convert(420000,'IQD','USD'),280);
 assert.equal(roundAmount(convert(200000,'IQD','USD')),133.33);
 s.displayCurrency='IQD';
 assert.match(displayMoney(280,'USD'),/420,000/);
 s.data.customers=[{id:'customer1',name:'Test User'}];
 s.data.ad_sites=[{id:'site1',name:'Central Board',code:'A01',active:true}];
 s.data.campaigns=[{id:'campaign1',customer_id:'customer1',title:'Launch',price:400,currency:'USD',months:3}];
 s.modal={table:'campaigns',siteIds:['site1']};
 assert.doesNotThrow(()=>formValidate('campaigns',{customer_id:'customer1',title:'Launch',price:400,months:3,currency:'USD'}));
 await syncCampaignSites('campaign1',['site1']);
 assert.equal(linkedSites('campaign1').length,1);
 await syncCampaignSites('campaign1',[]);
 assert.equal(linkedSites('campaign1').length,0);
 s.data.campaign_payments=[{id:'payment1',campaign_id:'campaign1',amount:100}];
 assert.equal(campaignBalance(s.data.campaigns[0]),300);
 assert.throws(()=>formValidate('campaign_payments',{campaign_id:'campaign1',amount:301}),/أكبر/);
 assert.doesNotThrow(()=>formValidate('campaign_payments',{campaign_id:'campaign1',amount:roundAmount(convert(420000,'IQD','USD'))}));
 assert.throws(()=>formValidate('ad_sites',{site_type:'rooftop'}),/عقار/);
 assert.deepEqual(clean('campaign_payments',{campaign_id:'campaign1',entry_currency:'IQD',amount:280,paid_at:'2026-11-14'}),{
  campaign_id:'campaign1',paid_at:'2026-11-14',amount:280
 });
 await generateInstallments({id:'lease1',rent_total:1200,payment_frequency:'annual',start_date:'2026-01-01',end_date:'2027-12-31',grace_days:10});
 const installments=s.data.lease_installments.filter(x=>x.lease_id==='lease1');
 assert.equal(installments.length,2);
 assert.equal(installments.reduce((total,i)=>total+i.amount,0),1200);
 assert.equal(installments[0].due_date,'2026-01-11');
});
