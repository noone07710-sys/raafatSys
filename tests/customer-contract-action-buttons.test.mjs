import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');

function fixture(){
 const app=new Function('localStorage','document','crypto','createClient','window',
  source+'\nreturn {s,listing,modalHtml,customerContractRowActions,customerContractEditTools,customerContractPreview,campaignPaymentOverview};'
 )({getItem:()=>null,setItem:()=>{}},{baseURI:'https://example.test/raafatSys/'},
  {randomUUID:()=> 'fixture-id'},()=>{},{});
 app.s.demo=true;app.s.staff={role:'admin',active:true};app.s.search='';app.s.filter='all';
 app.s.data.customers=[{id:'cust',name:'زبون تجريبي',phone:'07701111111'}];
 app.s.data.packages=[{id:'package',name:'باقة A',code:'A',width_m:2,height_m:3}];
 app.s.data.campaigns=[
  {id:'campaign-a',title:'نفس عنوان الحملة',customer_id:'cust',package_id:'package',price:280,currency:'USD',months:3},
  {id:'campaign-b',title:'نفس عنوان الحملة',customer_id:'cust',package_id:'package',price:520,currency:'USD',months:6}
 ];
 app.s.data.campaign_payments=[
  {id:'pay-a',campaign_id:'campaign-a',amount:100,paid_at:'2026-11-01'},
  {id:'pay-b',campaign_id:'campaign-b',amount:80,paid_at:'2026-11-02'}
 ];
 app.s.data.customer_contracts=[
  {id:'contract-new',contract_number:11,customer_id:'cust',campaign_id:'campaign-a',package_id:'package',
   start_date:'2026-11-01',end_date:'2027-02-01',duration_months:3,amount:280,currency:'USD'},
  {id:'contract-legacy',contract_number:12,customer_id:'cust',package_id:'package',
   start_date:'2025-01-01',end_date:'2025-04-01',duration_months:3,amount:150,currency:'USD'}
 ];
 return app;
}

test('customer contracts have the same four clearly separated buttons as rooftop contracts',()=>{
 const a=fixture(),html=a.listing('customer_contracts');
 const controls=a.customerContractRowActions(a.s.data.customer_contracts[0]);
 assert.equal((controls.match(/<button/g)||[]).length,4);
 for(const term of ['التفاصيل','تعديل العقد','مراجعة وطباعة','دفعات الحملة'])assert.match(controls,new RegExp(term));
 for(const tag of ['data-customer-preview="contract-new"','data-edit="customer_contracts:contract-new"',
  'data-customer-pdf="contract-new"','data-customer-payments="contract-new"'])assert.ok(controls.includes(tag),tag);
 assert.match(html,/class="lease-row-actions-cell"/);
 assert.doesNotMatch(html,/data-print-record="customer_contracts/);
 assert.match(css,/\.lease-row-actions\{/);
 assert.match(css,/\.lease-row-action-primary\{/);
});

test('old contracts retain edit, details and PDF while unavailable campaign payments are safely disabled',()=>{
 const a=fixture(),old=a.s.data.customer_contracts[1];
 const controls=a.customerContractRowActions(old);
 assert.equal((controls.match(/<button/g)||[]).length,4);
 assert.match(controls,/data-customer-payments="contract-legacy" disabled/);
 assert.match(controls,/العقد غير مرتبط بحملة محفوظة/);
 a.s.modal={table:'customer_contracts',kind:'edit',data:old};
 const editor=a.modalHtml();
 assert.match(editor,/class="lease-form-tools"/);
 assert.match(editor,/data-customer-pdf="contract-legacy"/);
 assert.match(editor,/data-customer-payments="contract-legacy" disabled/);
});

test('modern contract edit and preview display organized PDF, details, edit and payment controls',()=>{
 const a=fixture(),contract=a.s.data.customer_contracts[0];
 a.s.modal={table:'customer_contracts',kind:'edit',data:contract};
 assert.match(a.modalHtml(),/lease-form-tools/);
 const preview=a.customerContractPreview(contract);
 assert.match(preview,/lease-preview-actions/);
 assert.match(preview,/data-customer-pdf="contract-new" data-pdf-mode="preview"/);
 assert.match(preview,/data-edit="customer_contracts:contract-new"/);
 assert.match(preview,/data-customer-payments="contract-new"/);
 assert.doesNotMatch(preview,/data-pdf-mode="download"/);
 assert.match(css,/\.campaign-payments-focus\{/);
});

test('campaign payments focus an exact campaign ID even when two campaigns have identical names',()=>{
 const a=fixture();
 a.s.campaignPaymentFocusId='campaign-a';
 const html=a.campaignPaymentOverview();
 assert.match(html,/data-new-linked="campaign_payments\|campaign_id\|campaign-a"/);
 assert.doesNotMatch(html,/data-new-linked="campaign_payments\|campaign_id\|campaign-b"/);
 assert.match(html,/data-clear-campaign-payment-focus/);
 assert.match(html,/دفعات الحملة: نفس عنوان الحملة/);
 a.s.campaignPaymentFocusId=null;
 assert.match(a.campaignPaymentOverview(),/data-new-linked="campaign_payments\|campaign_id\|campaign-b"/);
 assert.match(source,/data-customer-payments/);
 assert.match(source,/s\.campaignPaymentFocusId=campaign\.id/);
});

test('permissions cannot expose campaign payments from customer contracts without access',()=>{
 const a=fixture();
 a.s.demo=false;a.s.staff={role:'custom_admin',active:true,permissions:['customer_contracts.read']};
 const controls=a.customerContractRowActions(a.s.data.customer_contracts[0]);
 assert.match(controls,/data-customer-payments="contract-new" disabled/);
 assert.match(controls,/ما عندك صلاحية/);
});
