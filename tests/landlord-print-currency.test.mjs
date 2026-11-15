import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
const pdfSource=readFileSync(new URL('../contract-pdf.js',import.meta.url),'utf8');

class FakeFile {}
class FakeFormData {
 constructor(form){this.form=form}
 *entries(){for(const [name,value] of Object.entries(this.form.values||{}))yield [name,value]}
}
function setup(){
 const appRoot={innerHTML:''};
 const doc={baseURI:'https://example.test/raafatSys/',title:'',
  querySelector:q=>q==='#app'?appRoot:null,
  querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),
  body:{append(){}}};
 const win={};
 win.RaafatContractPdf=new Function('window','document','URL',
  pdfSource+'\nreturn window.RaafatContractPdf;')(win,doc,URL);
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File',
  appSource+'\nreturn {s,openLandlordPdfEditor,captureCustomerPdfEditor,landlordPdfEditorHtml};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=> 'test-id'},()=>{},win,FakeFormData,FakeFile);
 app.s.demo=true;
 app.s.staff={role:'admin'};
 app.s.settings.usd_iqd=1670;
 app.s.data.landlords=[{id:'owner',name:'صاحب السطح',phone:'07700000000'}];
 app.s.data.properties=[{id:'roof',landlord_id:'owner',title:'سطح البناية',width_m:4,height_m:6}];
 app.s.data.leases=[{id:'lease',landlord_id:'owner',property_id:'roof',contract_number:'RA-11',
  rent_total:500,advance_amount:100,currency:'USD',
  start_date:'2027-01-01',end_date:'2027-12-31',grace_days:14,
  payment_frequency:'annual',landlord_representative:'مالك العقار',
  company_representative:'ممثل رأفت',notes:''}];
 app.s.data.lease_installments=[
  {id:'installment',lease_id:'lease',due_date:'2027-01-01',amount:400,paid_amount:0}
 ];
 app.openLandlordPdfEditor('lease');
 assert.equal(app.s.modal.kind,'landlordPdfEditor');
 return {app,win};
}
function draftForm(draft,overrides={},manualClause={}){
 const values={currency:draft.currency,rentTotal:String(draft.rentTotal),
  advanceAmount:String(draft.advanceAmount),graceDays:String(draft.graceDays),
  quantity:String(draft.quantity),startDate:draft.startDate,endDate:draft.endDate,
  firstSignatureName:draft.firstSignatureName,secondSignatureName:draft.secondSignatureName,
  notes:draft.notes||'',...overrides};
 const termRows=draft.clauses.map((item,index)=>({
  querySelector(selector){
   if(selector!=='textarea')return null;
   return {value:manualClause[index]??item.text};
  }
 }));
 const installmentRows=draft.installments.map(item=>({
  querySelector(selector){
    const field=selector.startsWith('[data-print-installment-field="')?selector.split('"')[1]:null;
   return field?{value:String(item[field]??'')}:null;
  }
 }));
 return {values,querySelectorAll(selector){
  if(selector==='[data-print-clause]')return termRows;
  if(selector==='[data-print-installment]')return installmentRows;
  return [];
 }};
}

test('switching lease PDF draft USD to IQD converts rent, upfront payment, installment, balance and legal clause',()=>{
 const {app}=setup(),original=JSON.stringify(app.s.data.leases[0]),
  originalLedger=JSON.stringify(app.s.data.lease_installments);
 const start=app.s.modal.printDraft;
 assert.equal(start.currency,'USD');
 assert.match(start.clauses[0].text,/500 \$/);
 app.captureCustomerPdfEditor(draftForm(start,{currency:'IQD'}));
 const d=app.s.modal.printDraft;
 assert.equal(d.currency,'IQD');
 assert.equal(d.rentTotal,835000,'500 USD × stored exchange rate 1670');
 assert.equal(d.advanceAmount,167000);
 assert.equal(d.remainingAfterAdvance,668000);
 assert.equal(d.installments[0].amount,668000);
 assert.match(d.clauses[0].text,/835,000 د\.ع — ثمانمئة وخمسة وثلاثون ألف دينار عراقي لا غير/);
 assert.doesNotMatch(d.clauses[0].text,/500 \$/);
 const html=app.landlordPdfEditorHtml();
 assert.match(html,/سعر الصرف المعتمد/);
 assert.match(html,/1,670/);
 assert.match(html,/name="rentTotal"[^>]+value="835000"/);
 assert.match(html,/data-print-installment-field="amount"[^>]+value="668000"/);
 assert.equal(JSON.stringify(app.s.data.leases[0]),original,'the saved lease must not change');
 assert.equal(JSON.stringify(app.s.data.lease_installments),originalLedger,'the saved payment ledger must not change');
});

test('operator can enter one million Iraqi dinars as the exact print amount, updating the legal clause',()=>{
 const {app}=setup();
 app.captureCustomerPdfEditor(draftForm(app.s.modal.printDraft,{currency:'IQD'}));
 const draft=app.s.modal.printDraft;
 app.captureCustomerPdfEditor(draftForm(draft,{rentTotal:'1000000'}));
 const result=app.s.modal.printDraft;
 assert.equal(result.rentTotal,1000000);
 assert.equal(result.remainingAfterAdvance,833000);
 assert.match(result.clauses[0].text,/1,000,000 د\.ع — مليون دينار عراقي لا غير/);
 assert.match(result.clauses[0].text,/مليون دينار عراقي/);
 assert.doesNotMatch(result.clauses[0].text,/\$/);
 // A manually revised clause is respected even after later amount edits.
 app.captureCustomerPdfEditor(draftForm(result,{rentTotal:'1200000'},
  {0:'شرط متفق عليه يدوياً بمبلغ محدد.'}));
 assert.equal(app.s.modal.printDraft.clauses[0].text,'شرط متفق عليه يدوياً بمبلغ محدد.');
 assert.equal(app.s.modal.printDraft.rentTotal,1200000);
});

test('switching the unmodified print draft back IQD→USD restores original figures and wording',()=>{
 const {app}=setup();
 app.captureCustomerPdfEditor(draftForm(app.s.modal.printDraft,{currency:'IQD'}));
 app.captureCustomerPdfEditor(draftForm(app.s.modal.printDraft,{currency:'USD'}));
 const d=app.s.modal.printDraft;
 assert.equal(d.currency,'USD');
 assert.equal(d.rentTotal,500);
 assert.equal(d.advanceAmount,100);
 assert.equal(d.remainingAfterAdvance,400);
 assert.equal(d.installments[0].amount,400);
 assert.match(d.clauses[0].text,/500 \$/);
});
