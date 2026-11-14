import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function fixture(){
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const root={innerHTML:''};
 const doc={title:'',querySelector:x=>x==='#app'?root:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},textContent:'',remove(){}}),body:{append(){}}};
 let serial=1;
 class FakeFormData{constructor(form){this.map=form.values||{}} *entries(){yield* Object.entries(this.map)} get(k){return this.map[k]??null}}
 class FakeFile{}
 const api=new Function('localStorage','document','crypto','createClient','window','FormData','File','setTimeout',source+
  '\nreturn {s,render,listing,openForm,modalHtml,saveForm,persist,clean,leaseInstallmentPlan,generateInstallments,leaseInstallmentsOverview,leaseBalance,leasePlanSummary,numberedContract,campaignPaymentOverview,seededDemoPackages,seededDemoRates};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=>String(serial++)},()=>{},{},FakeFormData,FakeFile,()=>{});
 const s=api.s;
 s.demo=true;s.staff={role:'admin'};s.displayCurrency='USD';s.settings.usd_iqd=1500;
 s.data.landlords=[
  {id:'owner1',name:'مؤجر علي',phone:'07700112233',governorate:'صلاح الدين'},
  {id:'owner2',name:'مؤجر حسن',phone:'07700445566',governorate:'كركوك'}
 ];
 s.data.properties=[
  {id:'roof1',landlord_id:'owner1',title:'سطح العلوة'},
  {id:'roof2',landlord_id:'owner2',title:'بناية السوق'}
 ];
 s.data.leases=[
  {id:'lease1',contract_number:'RA-1',landlord_id:'owner1',property_id:'roof1',start_date:'2026-11-14',end_date:'2027-11-21',rent_total:1200,advance_amount:0,currency:'USD',grace_days:0,payment_frequency:'semiannual'},
  {id:'lease2',contract_number:'RA-2',landlord_id:'owner2',property_id:'roof2',start_date:'2026-11-14',end_date:'2027-11-13',rent_total:300000,advance_amount:0,currency:'IQD',grace_days:0,payment_frequency:'annual'}
 ];
 s.data.lease_installments=[
  {id:'installment1',lease_id:'lease1',due_date:'2026-11-14',amount:600,paid_amount:300},
  {id:'installment2',lease_id:'lease1',due_date:'2027-05-14',amount:600,paid_amount:0},
  {id:'installment3',lease_id:'lease2',due_date:'2026-11-14',amount:300000,paid_amount:150000}
 ];
 s.data.packages=api.seededDemoPackages();s.data.package_rates=api.seededDemoRates();
 s.data.customers=[{id:'customer1',name:'زبون حسين',phone:'07712345678'}];
 s.data.campaigns=[{id:'campaign1',customer_id:'customer1',title:'حملة الصيف',price:1000,currency:'USD',months:3}];
 s.data.campaign_payments=[
  {id:'payment1',campaign_id:'campaign1',receipt_number:'0001',paid_at:'2026-11-14',amount:200},
  {id:'payment2',campaign_id:'campaign1',receipt_number:'0002',paid_at:'2026-11-15',amount:100}
 ];
 return {api,s,root};
}

test('annual means one installment, semiannual means two, even slightly extended past one year',()=>{
 const {api}=fixture();
 const basis={id:'lease1',start_date:'2026-11-14',end_date:'2027-11-13',rent_total:1200,advance_amount:0,grace_days:0,payment_frequency:'annual'};
 assert.equal(api.leaseInstallmentPlan(basis).length,1);
 assert.equal(api.leaseInstallmentPlan(basis)[0].amount,1200);
 assert.equal(api.leaseInstallmentPlan({...basis,payment_frequency:'semiannual'}).length,2);
 for(const end of ['2027-11-14','2027-11-21']){
  const semi=api.leaseInstallmentPlan({...basis,payment_frequency:'semiannual',end_date:end});
  assert.equal(semi.length,2,'one-year contract ending '+end+' must not make a third installment');
  assert.equal(semi.reduce((s,row)=>s+row.amount,0),1200);
  assert.equal(api.leaseInstallmentPlan({...basis,payment_frequency:'annual',end_date:end}).length,1);
 }
 assert.equal(api.leaseInstallmentPlan({...basis,end_date:'2028-11-13'}).length,2,'two years yearly');
 assert.equal(api.leaseInstallmentPlan({...basis,end_date:'2028-11-13',payment_frequency:'semiannual'}).length,4,'two years half-yearly');
});

test('upfront rent is already paid, reduces the installment total, and never adds a third installment',async()=>{
 const {api,s}=fixture();
 const base={id:'freshLease',start_date:'2026-11-14',end_date:'2027-11-21',rent_total:1200,advance_amount:200,grace_days:10,payment_frequency:'semiannual',currency:'USD'};
 const semi=api.leaseInstallmentPlan(base);
 assert.equal(semi.length,2);
 assert.deepEqual(semi.map(x=>x.amount),[500,500]);
 assert.equal(semi[0].due_date,'2026-11-24');
 assert.equal(api.leaseInstallmentPlan({...base,payment_frequency:'annual'}).length,1);
 assert.equal(api.leaseInstallmentPlan({...base,payment_frequency:'annual'})[0].amount,1000);
 assert.equal(api.leaseInstallmentPlan({...base,advance_amount:1200}).length,0,'full advance requires zero installments');
 await api.generateInstallments(base);
 assert.equal(s.data.lease_installments.filter(x=>x.lease_id==='freshLease').length,2);
 assert.throws(()=>api.generateInstallments(base),/أقساط.*موجودة/);
 assert.match(api.leasePlanSummary(base),/عدد الأقساط/);
 assert.match(api.leasePlanSummary(base),/200/);
 assert.match(api.leasePlanSummary(base),/500/);
});

test('landlord payment page lists owner names, amounts, statuses, and allows name searches',()=>{
 const {api,s}=fixture();
 s.view='lease_installments';
 let html=api.listing('lease_installments');
 assert.match(html,/مؤجر علي/);
 assert.match(html,/مؤجر حسن/);
 assert.match(html,/RA-0001/);
 assert.match(html,/RA-0002/);
 assert.match(html,/السطح|سطح العلوة/);
 assert.match(html,/المقدم المدفوع/);
 assert.match(html,/المتبقي/);
 assert.match(html,/قسط 0001/);
 assert.match(html,/data-edit="lease_installments:installment1"/);
 assert.doesNotMatch(html,/data-new="lease_installments"/,'staff should not create duplicate manual installments');
 s.search='حسن';
 html=api.listing('lease_installments');
 assert.match(html,/مؤجر حسن/);
 assert.doesNotMatch(html,/مؤجر علي/);
 s.search='RA-0001';
 assert.match(api.listing('lease_installments'),/مؤجر علي/);
 s.search='';
 s.displayCurrency='IQD';
 html=api.listing('lease_installments');
 assert.match(html,/1,800,000/,'USD landlord amounts convert to IQD');
 assert.match(html,/300,000/,'IQD landlord amounts remain unchanged');
});

test('all campaign account amounts and receipt rows follow USD/IQD display toggle',()=>{
 const {api,s}=fixture();
 s.displayCurrency='USD';
 let view=api.campaignPaymentOverview();
 assert.match(view,/1,000 \$/);
 assert.match(view,/300 \$/);
 assert.match(view,/700 \$/);
 assert.match(view,/0001/);
 assert.match(view,/0002/);
 s.displayCurrency='IQD';
 view=api.campaignPaymentOverview();
 assert.match(view,/1,500,000 د\.ع/,'original 1000 USD campaign displayed in IQD');
 assert.match(view,/450,000 د\.ع/,'received 300 USD displayed in IQD');
 assert.match(view,/1,050,000 د\.ع/,'remaining 700 USD displayed in IQD');
 assert.match(view,/300,000 د\.ع/,'individual USD 200 receipt displayed in IQD');
 assert.match(view,/150,000 د\.ع/,'individual USD 100 receipt displayed in IQD');
 assert.match(view,/الأصل/,'original currency should also be visible');
 s.displayCurrency='USD';
 assert.match(api.campaignPaymentOverview(),/1,000 \$/);
});

test('existing installment principal is never modified when entering its payment in different currency',async()=>{
 const {api,s}=fixture();
 s.view='lease_installments';
 api.openForm('lease_installments',s.data.lease_installments[0]);
 const dialog=api.modalHtml();
 assert.match(dialog,/مؤجر علي/);
 assert.match(dialog,/RA-0001/);
 assert.match(dialog,/name="paid_amount"/);
 assert.match(dialog,/name="amount" value="600"/);
 const mock={values:{
  lease_id:'lease1',due_date:'2026-11-14',amount:'600',entry_currency:'IQD',
  paid_amount:'600000',notes:'تسديد بالدينار'},querySelectorAll:()=>[]};
 await api.saveForm(mock);
 const saved=s.data.lease_installments.find(x=>x.id==='installment1');
 assert.equal(saved.amount,600,'scheduled principal must not be converted or changed');
 assert.equal(saved.paid_amount,400,'paid amount converted from IQD to USD');
 assert.equal(api.leaseBalance(s.data.leases[0]),800,'outstanding = 1200 - paid 400');
});

test('receipt and customer/lease contract labels pad to four figures',async()=>{
 const {api,s}=fixture();
 assert.equal(api.numberedContract('RC-1'),'RC-0001');
 assert.equal(api.numberedContract('RA-11'),'RA-0011');
 assert.equal(api.numberedContract('RC-10001'),'RC-10001');
 assert.equal(s.data.campaign_payments[0].receipt_number,'0001');
 const newReceipt=await api.persist('campaign_payments',{campaign_id:'campaign1',paid_at:'2026-11-16',amount:100});
 assert.equal(newReceipt.receipt_number,'0003');
 const newLease=await api.persist('leases',{
  landlord_id:'owner1',property_id:'roof1',rent_total:1200,currency:'USD',
  start_date:'2026-11-14',end_date:'2027-11-13',advance_amount:0,
  payment_frequency:'annual',grace_days:0
 });
 assert.equal(newLease.contract_number,'RA-0003');
});
