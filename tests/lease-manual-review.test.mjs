import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
const pdfSource=readFileSync(new URL('../contract-pdf.js',import.meta.url),'utf8');
class FakeFile {}
class FakeFormData{
 constructor(form){this.form=form}
 *entries(){yield* Object.entries(this.form.values||{})}
 get(key){return this.form.values?.[key]??null}
}
function fixture(){
 const root={innerHTML:''};
 const doc={title:'',baseURI:'https://example.test/raafatSys/',
  querySelector:q=>q==='#app'?root:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},textContent:'',remove(){}}),body:{append(){}}};
 const win={};
 win.RaafatContractPdf=new Function('window','document','URL',
  pdfSource+'\nreturn window.RaafatContractPdf;')(win,doc,URL);
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File','setTimeout',
  source+'\nreturn {s,openForm,modalHtml,listing,previewHtml,saveForm,leasePlanControls,'+
  'validateManualLeasePlan,generateInstallments,saveLeaseDueDate,openLandlordPdfEditor,landlordPdfEditorHtml};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=> 'id-'+(++fixture.serial)},()=>{},win,
  FakeFormData,FakeFile,()=>{});
 app.s.demo=true;app.s.staff={role:'admin'};
 app.s.data.landlords=[{id:'landlord',name:'مالك السطح',phone:'07705554444'}];
 app.s.data.properties=[{id:'roof',landlord_id:'landlord',title:'سطح الزهور',
  width_m:5,height_m:4,quantity:2}];
 app.s.data.leases=[];
 app.s.data.lease_installments=[];
 return {app,doc,win};
}
fixture.serial=0;
function lease(){
 return {landlord_id:'landlord',property_id:'roof',start_date:'2027-01-01',end_date:'2027-12-31',
  rent_total:1000000,advance_amount:200000,currency:'IQD',grace_days:0,
  payment_frequency:'semiannual',company_representative:'مندوب رأفت',landlord_representative:'مندوب المالك'};
}
function mockForm(v,plan){
 const rows=plan.map(item=>({
  querySelector(selector){
   if(selector==='[data-lease-due]')return {value:item.due_date};
   if(selector==='[data-lease-amount]')return {value:String(item.amount)};
   return null;
  }
 }));
 return {values:Object.fromEntries(Object.entries(v).map(([k,val])=>[k,String(val)])),
  querySelectorAll(selector){
   if(selector==='[data-lease-draft-row]')return rows;
   if(selector==='[data-site-id]')return [];
   return [];
  },elements:{}};
}
test('new rooftop lease offers manual installments and direct contract review entry points',()=>{
 const {app}=fixture();
 app.openForm('leases',lease());
 let html=app.modalHtml();
 assert.match(html,/data-lease-mode="manual"/);
 assert.match(html,/data-lease-mode="auto"/);
 assert.match(html,/تحديد موعد|مواعيد الأقساط/);
 app.s.modal.leasePlanMode='manual';
 app.s.modal.leaseDraft=[{due_date:'2027-03-15',amount:300000},{due_date:'2027-09-15',amount:500000}];
 html=app.modalHtml();
 assert.match(html,/data-lease-due/);
 assert.match(html,/data-lease-amount/);
 assert.match(html,/2027-03-15/);
 assert.match(html,/2027-09-15/);
 assert.match(html,/data-lease-add-row/);
 assert.match(html,/data-lease-remove-row/);
});
test('custom installment amounts must add to rent minus advance, and dates must be valid',()=>{
 const {app}=fixture(),v=lease();
 const valid=[{due_date:'2027-09-15',amount:500000},{due_date:'2027-03-15',amount:300000}];
 assert.deepEqual(app.validateManualLeasePlan(v,valid),[
  {due_date:'2027-03-15',amount:300000},{due_date:'2027-09-15',amount:500000}
 ]);
 assert.throws(()=>app.validateManualLeasePlan(v,[{due_date:'2027-05-15',amount:900000}]),/مجموع الأقساط/);
 assert.throws(()=>app.validateManualLeasePlan(v,[{due_date:'bad-date',amount:800000}]),/تاريخاً صحيحاً/);
 assert.throws(()=>app.validateManualLeasePlan({...v,advance_amount:1000000},valid),/المقدم/);
 assert.deepEqual(app.validateManualLeasePlan({...v,advance_amount:1000000},[]),[]);
});
test('saving a new lease with manual plan commits the selected dates into real installments; no auto rows added',async()=>{
 const {app}=fixture(),v=lease();
 app.openForm('leases',v);
 app.s.modal.leasePlanMode='manual';
 const plan=[{due_date:'2027-03-15',amount:300000},{due_date:'2027-09-15',amount:500000}];
 app.s.modal.leaseDraft=plan;
 await app.saveForm(mockForm(v,plan));
 assert.equal(app.s.data.leases.length,1);
 assert.equal(app.s.data.lease_installments.length,2);
 const saved=app.s.data.lease_installments.sort((a,b)=>a.due_date.localeCompare(b.due_date));
 assert.deepEqual(saved.map(r=>[r.due_date,Number(r.amount)]),[
  ['2027-03-15',300000],['2027-09-15',500000]
 ]);
 assert.ok(saved.every(r=>r.lease_id===app.s.data.leases[0].id&&Number(r.paid_amount)===0));
 const id=app.s.data.leases[0].id;
 app.openForm('leases',app.s.data.leases[0]);
 const html=app.modalHtml();
 assert.match(html,/data-lease-saved-due=/);
 assert.match(html,/2027-03-15/);
 assert.match(html,/مراجعة العقد|مراجعة العقد وإضافة بنود/);
 assert.match(app.listing('leases'),/data-landlord-pdf=/);
 assert.match(app.previewHtml(app.s.data.leases[0]),/مراجعة البنود وتجهيز PDF/);
 app.openLandlordPdfEditor(id);
 const editor=app.landlordPdfEditorHtml();
 assert.match(editor,/data-print-clause-add/);
 assert.match(editor,/data-print-clause-remove/);
 assert.match(editor,/data-print-installment-add/);
 assert.match(editor,/2027-03-15/);
});
test('a partially paid scheduled installment is protected from rescheduling',async()=>{
 const {app}=fixture();
 const v=lease();
 const id='lease-paid',row={id:'installment-paid',lease_id:id,due_date:'2027-01-10',
  amount:500000,paid_amount:10000};
 app.s.data.leases=[{...v,id,contract_number:'RA-7'}];
 app.s.data.lease_installments=[row];
 app.openForm('leases',app.s.data.leases[0]);
 const html=app.leasePlanControls(app.s.modal.data);
 assert.match(html,/disabled/);
 assert.doesNotMatch(html,/data-lease-save-due="installment-paid"/);
 await app.saveLeaseDueDate(row.id,{querySelector:()=>({value:'2027-06-01'})});
 assert.equal(app.s.data.lease_installments[0].due_date,'2027-01-10');
});
