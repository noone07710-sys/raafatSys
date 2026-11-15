import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function setup(){
 const src=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const root={innerHTML:''};
 const doc={title:'',querySelector:q=>q==='#app'?root:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),body:{append(){}}};
 class MockFile{};
 class MockFormData{
  constructor(form){this.form=form}
  *entries(){yield* Object.entries(this.form.values||{})}
 }
 let counter=0;
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File','setTimeout',
  src+'\nreturn {s,openForm,saveForm,expenseLineItems,expensePaymentStatus,expenseInvoiceTotal,expenseInvoiceValidated,expenseOverview,expenseInvoiceForm,expenseCurrentItems,updateExpenseInvoiceTotals};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=> 'item-'+(++counter)},()=>{},
  {},MockFormData,MockFile,()=>{});
 app.s.demo=true;app.s.staff={role:'admin'};app.s.displayCurrency='IQD';app.s.settings.usd_iqd=1500;
 app.s.view='company_expenses';return {app,root};
}
const product=(description,category,department,quantity,unit_price)=>({
 description,category,department,quantity,unit_price
});
function fakeForm(values,items,file=null){
 const rows=items.map(item=>({
  querySelector:selector=>{
   const match=selector.match(/data-expense-field="([^"]+)"/);
   return match?{value:String(item[match[1]]??'')}:null;
  }
 }));
 const elements={namedItem:key=>key==='transfer_image'?{files:file?[file]:[]}:
  Object.prototype.hasOwnProperty.call(values,key)?{value:String(values[key])}:null};
 return {values,elements,
  querySelectorAll:sel=>sel==='[data-expense-item]'?rows:[],
  querySelector:sel=>sel==='button[type="submit"]'?{disabled:false,isConnected:false}:null};
}
test('multi-item receipt is saved once with exact department/category allocation and a partial balance',async()=>{
 const {app}=setup();
 app.openForm('company_expenses');
 const items=[
  product('ورق تصوير', 'stationery','graphic_design',3,1500),
  product('اشتراك أداة تصميم','design_subscriptions','graphic_design',1,6000),
  product('مياه ضيافة','hospitality_misc','shared',2,750)
 ];
 const form=fakeForm({
  expense_date:'2026-11-15',receipt_number:'INV-339',
  paid_by:'احمد اسماعيل',currency:'IQD',title:'فاتورة مستلزمات المكتب',
  notes:'فاتورة مجمعة',expense_payment_status:'partial',payment_method:'cash',paid_amount:'4500'
 },items);
 await app.saveForm(form);
 assert.equal(app.s.data.company_expenses.length,1,'one invoice, not one record per item');
 const saved=app.s.data.company_expenses[0];
 assert.equal(saved.amount,12000);
 assert.equal(saved.paid_amount,4500);
 assert.equal(saved.receipt_number,'INV-339');
 assert.equal(saved.expense_items.length,3);
 assert.equal(saved.expense_items[1].category,'design_subscriptions');
 assert.equal(saved.expense_items[2].department,'shared');
 assert.equal(saved.paid_by,'احمد اسماعيل');
 assert.equal(app.expensePaymentStatus(saved),'partial');
 assert.match(app.expenseOverview(),/7,500/);
 app.s.expenseCategory='stationery';
 assert.match(app.expenseOverview(),/فاتورة مستلزمات المكتب/);
 assert.match(app.expenseOverview(),/ورق تصوير/);
 app.s.expenseCategory='internet_telecom';
 assert.doesNotMatch(app.expenseOverview(),/فاتورة مستلزمات المكتب/);
});
test('cash full payment stores total, unpaid stores zero, master card transfers require a private image',async()=>{
 const {app}=setup();
 const productList=[product('أجور خدمة إنترنت','internet_telecom','shared',1,25000)];
 const common={expense_date:'2026-11-15',paid_by:'حسين علاء',
  currency:'IQD',title:'فاتورة الإنترنت',receipt_number:'',paid_amount:'',notes:''};
 app.openForm('company_expenses');
 await app.saveForm(fakeForm({...common,expense_payment_status:'paid',payment_method:'cash'},productList));
 assert.equal(app.s.data.company_expenses.length,1);
 assert.equal(app.s.data.company_expenses[0].paid_amount,25000);

 app.openForm('company_expenses');
 await app.saveForm(fakeForm({...common,title:'فاتورة قيد السداد',expense_payment_status:'unpaid',
  payment_method:'mastercard'},productList));
 assert.equal(app.s.data.company_expenses[0].paid_amount,0);

 app.openForm('company_expenses');
 await app.saveForm(fakeForm({...common,expense_payment_status:'partial',paid_amount:'10000',
  payment_method:'mastercard'},productList));
 assert.equal(app.s.data.company_expenses.length,2,'cannot record paid MasterCard transfer without image');

 await app.saveForm(fakeForm({...common,expense_payment_status:'partial',paid_amount:'10000',
  payment_method:'mastercard'},productList,{type:'image/png',size:1280,name:'transfer.png'}));
 assert.equal(app.s.data.company_expenses.length,3);
 assert.equal(app.s.data.company_expenses[0].payment_method,'mastercard');
 assert.equal(app.s.data.company_expenses[0].transfer_proof_path,'preview-only','demo image is never published');
});
test('old expenses remain as one fully-paid item without altering legacy category or value',()=>{
 const {app}=setup();
 app.s.data.company_expenses=[{id:'old',title:'قرطاسية محفوظة',expense_date:'2026-11-01',
  category:'office',amount:17000,currency:'IQD',paid_by:'موظف سابق'}];
 const old=app.s.data.company_expenses[0];
 assert.equal(app.expensePaymentStatus(old),'paid');
 assert.equal(app.expenseLineItems(old).length,1);
 assert.equal(app.expenseInvoiceTotal(app.expenseLineItems(old)),17000);
 app.openForm('company_expenses',old);
 assert.match(app.expenseInvoiceForm(app.s.modal.data),/قرطاسية محفوظة/);
 assert.match(app.expenseOverview(),/17,000/);
});
test('invoice validation prevents incorrect partial payments and missing item allocation',()=>{
 const {app}=setup();
 const base={expense_date:'2026-11-15',currency:'IQD',paid_by:'حسين علاء',
  payment_method:'cash',status:'partial',paid_amount:5000,receipt_number:''};
 const items=[product('اشتراك', 'design_subscriptions','development',1,5000)];
 assert.throws(()=>app.expenseInvoiceValidated(base,items),/أقل من إجمالي/);
 assert.throws(()=>app.expenseInvoiceValidated({...base,paid_amount:1000},
  [product('اشتراك','design_subscriptions','',1,5000)]),/القسم المستفيد/);
 assert.throws(()=>app.expenseInvoiceValidated({...base,paid_amount:1000},
  [product('اشتراك','invalid','development',1,5000)]),/التصنيف/);
 assert.deepEqual(app.expenseInvoiceValidated({...base,paid_amount:1000},items),
  {amount:5000,paid_amount:1000});
});


test('browser validation: hidden partial-paid input cannot silently block paid/unpaid invoice submit',()=>{
 const {app}=setup();
 app.s.modal={table:'company_expenses',data:{paid_amount:0,transfer_proof_path:null},expenseItems:[],transferFile:null};
 const entries=[
  product('اشتراك برنامج','design_subscriptions','graphic_design',1,15000)
 ];
 const inputs={
  currency:{value:'IQD'},expense_payment_status:{value:'paid'},
  payment_method:{value:'cash'},paid_amount:{value:'0',min:'0.01',required:false,disabled:false},
  transfer_image:{value:'',required:false,disabled:false},
  amount:{value:''}
 };
 const display={expenseInvoiceTotal:{},expenseInvoicePaid:{},
  expenseInvoiceBalance:{},expensePartialField:{hidden:false},
  expenseTransferField:{hidden:false}};
 const item={querySelector:sel=>{
  const field=sel.match(/data-expense-field="([^"]+)"/)?.[1];
  return field?{value:String(entries[0][field]??'')}:null;
 }};
 const form={
  elements:{namedItem:k=>inputs[k]||null},
  querySelectorAll:sel=>sel==='[data-expense-item]'?[item]:
   sel==='[data-expense-subtotal]'?[{textContent:''}]:[],
  querySelector:sel=>display[sel.slice(1)]||null
 };
 app.updateExpenseInvoiceTotals(form);
 assert.equal(inputs.paid_amount.disabled,true,'paid field must be disabled, not just hidden');
 assert.equal(inputs.paid_amount.required,false);
 assert.equal(display.expensePartialField.hidden,true);
 assert.equal(inputs.transfer_image.disabled,true,'hidden upload should not participate in native validation');
 assert.equal(display.expenseInvoicePaid.textContent,'15,000 د.ع');
 inputs.expense_payment_status.value='unpaid';
 app.updateExpenseInvoiceTotals(form);
 assert.equal(inputs.paid_amount.disabled,true);
 assert.equal(display.expenseInvoicePaid.textContent,'0 د.ع');
 inputs.expense_payment_status.value='partial';inputs.paid_amount.value='3000';
 inputs.payment_method.value='mastercard';
 app.updateExpenseInvoiceTotals(form);
 assert.equal(inputs.paid_amount.disabled,false);
 assert.equal(inputs.paid_amount.required,true);
 assert.equal(display.expensePartialField.hidden,false);
 assert.equal(inputs.transfer_image.disabled,false);
 assert.equal(inputs.transfer_image.required,true);
 assert.equal(display.expenseInvoiceBalance.textContent,'12,000 د.ع');
});
