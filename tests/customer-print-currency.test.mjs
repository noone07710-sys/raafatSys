import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
const pdfSource=readFileSync(new URL('../contract-pdf.js',import.meta.url),'utf8');

class FakeFile {}
class FakeFormData{
 constructor(form){this.form=form}
 *entries(){for(const entry of Object.entries(this.form.values||{}))yield entry}
}
function setup(){
 const root={innerHTML:''};
 const doc={baseURI:'https://example.test/raafatSys/',title:'',
  querySelector:selector=>selector==='#app'?root:null,
  querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),body:{append(){}}};
 const win={};
 win.RaafatContractPdf=new Function('window','document','URL',
  pdfSource+'\nreturn window.RaafatContractPdf;')(win,doc,URL);
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File',
  appSource+'\nreturn {s,openCustomerPdfEditor,captureCustomerPdfEditor,customerPdfEditorHtml};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=> 'test'},()=>{},win,FakeFormData,FakeFile);
 app.s.demo=true;app.s.staff={role:'admin'};
 app.s.settings.usd_iqd=1670;
 app.s.data.customers=[{id:'client',name:'مكتبة حبر',phone:'07701234567'}];
 app.s.data.customer_contracts=[{
  id:'contract',contract_number:'RC-12',customer_id:'client',
  customer_name_snapshot:'مكتبة حبر',campaign_title_snapshot:'افتتاح المكتبة',
  package_specifications_snapshot:'إعلان ضوئي على وجهين',
  campaign_sites_snapshot:[{code:'A001',name:'الزهور',address:'شارع الزهور'}],
  duration_months:3,amount:500,currency:'USD',
  start_date:'2027-01-01',end_date:'2027-03-31'
 }];
 app.openCustomerPdfEditor('contract');
 assert.equal(app.s.modal.kind,'customerPdfEditor');
 return {app,win};
}
function formFor(draft,overrides={},revisedTerms={}){
 const values={
  currency:draft.currency,amount:String(draft.amount),specifications:draft.specifications,
  campaignTitle:draft.campaignTitle,customerName:draft.customerName,number:draft.number,
  ...overrides
 };
 const clauses=draft.clauses.map((term,index)=>({
  querySelector:selector=>selector==='textarea'?{value:revisedTerms[index]??term.text}:null
 }));
 const sites=draft.sites.map(item=>({
  querySelector(selector){
   const field=selector.startsWith('[data-print-site-field="')?selector.split('"')[1]:null;
   return field?{value:item[field]??''}:null;
  }
 }));
 return {values,querySelectorAll(selector){
  if(selector==='[data-print-clause]')return clauses;
  if(selector==='[data-print-site]')return sites;
  return [];
 }};
}

test('USD→IQD updates printable customer amount and untouched 25 USD clause without touching saved agreement',()=>{
 const {app}=setup();
 const original=JSON.stringify(app.s.data.customer_contracts[0]);
 const draft=app.s.modal.printDraft;
 assert.equal(draft.amount,500);
 assert.equal(draft.currency,'USD');
 assert.match(draft.clauses[3].text,/25\$/);
 app.captureCustomerPdfEditor(formFor(draft,{currency:'IQD'}));
 const revised=app.s.modal.printDraft;
 assert.equal(revised.amount,835000,'500 USD at 1670 IQD rate');
 assert.equal(revised.currency,'IQD');
 assert.match(revised.clauses[3].text,/41,750 دينار عراقي/);
 assert.doesNotMatch(revised.clauses[3].text,/25\$/);
 const html=app.customerPdfEditorHtml();
 assert.match(html,/name="amount"[^>]+value="835000"/);
 assert.match(html,/<option value="IQD" selected>/);
 assert.match(html,/سعر الصرف المعتمد/);
 assert.match(html,/1,670/);
 assert.ok(html.indexOf('name="specifications"')<html.indexOf('الشروط والملاحظات — الصفحة الثانية'));
 assert.equal(JSON.stringify(app.s.data.customer_contracts[0]),original,
  'changing the print-only amount must not update the saved contract');
});

test('manually replacing the converted amount is kept, even after another edit',()=>{
 const {app}=setup();
 app.captureCustomerPdfEditor(formFor(app.s.modal.printDraft,{currency:'IQD'}));
 const converted=app.s.modal.printDraft;
 app.captureCustomerPdfEditor(formFor(converted,{amount:'1000000',specifications:'طباعة جديدة ومواد مختلفة'}));
 const next=app.s.modal.printDraft;
 assert.equal(next.amount,1000000);
 assert.equal(next.specifications,'طباعة جديدة ومواد مختلفة');
 assert.equal(next.currency,'IQD');
 assert.match(next.clauses[3].text,/41,750 دينار عراقي/);
 app.captureCustomerPdfEditor(formFor(next,{customerPhone:'07709876543'},{
  3:'يتم الإعلان على الشاشة مجاناً لأغراض هذا العقد.'
 }));
 assert.equal(app.s.modal.printDraft.clauses[3].text,'يتم الإعلان على الشاشة مجاناً لأغراض هذا العقد.');
 assert.equal(app.s.modal.printDraft.amount,1000000);
});

test('reversing an unedited currency selection restores USD amount and original default promotional fee',()=>{
 const {app}=setup();
 app.captureCustomerPdfEditor(formFor(app.s.modal.printDraft,{currency:'IQD'}));
 app.captureCustomerPdfEditor(formFor(app.s.modal.printDraft,{currency:'USD'}));
 const draft=app.s.modal.printDraft;
 assert.equal(draft.amount,500);
 assert.equal(draft.currency,'USD');
 assert.match(draft.clauses[3].text,/25\$/);
 assert.doesNotMatch(draft.clauses[3].text,/41,750 دينار عراقي/);
});

test('a custom-edited 25 dollar term is never replaced by automatic conversion',()=>{
 const {app}=setup();
 const draft=app.s.modal.printDraft;
 app.captureCustomerPdfEditor(formFor(draft,{currency:'IQD'},{
  3:'البند الخاص بالإعلان الترويجي يتم الاتفاق عليه منفصلاً.'
 }));
 const updated=app.s.modal.printDraft;
 assert.equal(updated.currency,'IQD');
 assert.equal(updated.amount,835000);
 assert.equal(updated.clauses[3].text,'البند الخاص بالإعلان الترويجي يتم الاتفاق عليه منفصلاً.');
});
