import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
const receiptSource=readFileSync(new URL('../payroll-receipt.js',import.meta.url),'utf8');
class FakeFile {}
class FakeFormData{
 constructor(form){this.values=form.values||{}}
 *entries(){yield* Object.entries(this.values)}
 get(name){return this.values[name]??null}
 getAll(name){return name==='permission'?this.values.permissions||[]:[]}
}
function fixture(role='admin'){
 const root={innerHTML:''},memory={};
 const doc={title:'',baseURI:'https://example.test/raafatSys/',
  querySelector:s=>s==='#app'?root:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},textContent:'',remove(){}}),body:{append(){}}};
 let nextId=0;
 const window={};
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File','setTimeout',
  source+'\nreturn {s,canAccess,adminRoleLabel,employeesOverview,employeePayrollPayments,'+
  'openPayrollPayment,payrollPaymentHtml,savePayrollPayment,payrollReceiptPayload,payrollReceiptReadyHtml,'+
  'expenseOverview,expenseInvoiceValidated,staffAdminView,openStaffRoleEditor,staffRoleEditorHtml,saveStaffRole,toAuthEmail,displayStaffLogin,render};'
 )({getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=v},doc,
  {randomUUID:()=> 'generated-'+(++nextId)},()=>{},window,FakeFormData,FakeFile,()=>{});
 app.s.demo=true;app.s.staff={role,active:true};
 app.s.data.employees=[{
  id:'employee-1',name:'أمل عبد',job_title:'عاملة تنظيف',
  department:'cleaning',salary_amount:400000,salary_currency:'IQD',active:true
 }];
 app.s.data.payroll_payments=[];
 app.s.data.company_expenses=[];
 return {app,root,window};
}
test('salary is paid from employee view, not expense category and amount appears in receipt history',async()=>{
 const {app}=fixture();
 const {s}=app;
 assert.match(app.employeesOverview(),/صرف راتب/);
 assert.match(app.employeesOverview(),/التنظيف/);
 app.openPayrollPayment('employee-1');
 assert.equal(s.modal.kind,'payrollPayment');
 assert.equal(s.modal.data.currency,'IQD');
 const formHtml=app.payrollPaymentHtml();
 assert.match(formHtml,/اسم الشخص الذي سلّم الراتب/);
 assert.match(formHtml,/راتب شهر/);
 assert.match(formHtml,/نصف A4/);
 const form={values:{
  employee_id:'employee-1',salary_month:'2026-11',paid_at:'2026-11-15',
  amount:'400000',paid_by:'مدير الحسابات',notes:'راتب شهر تشرين الثاني'
 },querySelector:()=>null};
 await app.savePayrollPayment(form);
 assert.equal(s.data.payroll_payments.length,1,'payroll recorded exactly once');
 assert.equal(s.data.company_expenses.length,0,'salary never produces general expense');
 assert.equal(s.data.payroll_payments[0].amount,400000);
 assert.equal(s.data.payroll_payments[0].paid_by,'مدير الحسابات');
 assert.equal(s.data.payroll_payments[0].salary_month,'2026-11-01');
 assert.equal(s.modal.kind,'payrollReceiptReady');
 assert.match(app.payrollReceiptReadyHtml(),/تحميل وصل استلام الراتب PDF/);
 const payload=app.payrollReceiptPayload(s.data.payroll_payments[0]);
 assert.equal(payload.employeeName,'أمل عبد');
 assert.equal(payload.department,'التنظيف');
 assert.equal(payload.paidBy,'مدير الحسابات');
 assert.equal(payload.currency,'IQD');
 assert.equal(payload.amount,400000);
 assert.match(app.employeesOverview(),/PR-0001/);
});
test('previous payroll expenses stay archived, and a salary line cannot be entered in new expense invoice',()=>{
 const {app}=fixture();
 const {s}=app;
 s.data.company_expenses=[{
  id:'legacy',employee_id:'employee-1',category:'salaries',expense_date:'2026-10-10',
  title:'راتب أقدم',amount:400000,paid_amount:400000,currency:'IQD',paid_by:'أحمد',
  expense_items:[{category:'salaries',description:'راتب شهر قديم',department:'cleaning',quantity:1,unit_price:400000}]
 }];
 s.employeeFocus='employee-1';
 assert.match(app.employeesOverview(),/راتب أقدم/);
 assert.doesNotMatch(app.expenseOverview(),/راتب أقدم/);
 assert.throws(()=>app.expenseInvoiceValidated({
  expense_date:'2026-11-15',currency:'IQD',paid_by:'أحمد',status:'paid',payment_method:'cash',
  employee_id:'employee-1'
 },[{category:'salaries',description:'راتب',department:'cleaning',quantity:1,unit_price:400000}]),/صرف الرواتب صار حصراً/);
});
test('permission labels are in Arabic and custom manager can see only explicitly assigned modules',()=>{
 const {app}=fixture('custom_admin');
 app.s.demo=false;
 app.s.staff={role:'custom_admin',active:true,permissions:['customers.read','payroll.edit','employees.read']};
 assert.equal(app.adminRoleLabel('custom_admin'),'مدير بصلاحيات مخصصة');
 assert.equal(app.adminRoleLabel('admin'),'المدير الرئيسي');
 assert.equal(app.adminRoleLabel('staff'),'موظف');
 assert.equal(app.canAccess('customers','read'),true);
 assert.equal(app.canAccess('customers','edit'),false);
 assert.equal(app.canAccess('payroll','create'),true);
 assert.equal(app.canAccess('payroll','edit'),true);
 assert.equal(app.canAccess('expenses','read'),false);
 assert.equal(app.canAccess('employees','read'),true);
 assert.equal(app.canAccess('employees','edit'),false);
});
test('superadmin creates internal @raafat accounts with independent read and edit toggles',()=>{
 const {app}=fixture();
 app.s.managedStaff=[{user_id:'primary',role:'admin',active:true,display_name:'مدير رئيسي',email:'admin@example.test',permissions:[]}];
 const view=app.staffAdminView();
 assert.match(view,/إضافة أدمن جديد/);
 app.openStaffRoleEditor();
 assert.equal(app.s.modal.kind,'staffRoleEditor');
 const editor=app.staffRoleEditorHtml();
 assert.match(editor,/value="employees.read"/);
 assert.match(editor,/value="payroll.edit"/);
 assert.match(editor,/value="customers.edit"/);
 assert.match(editor,/إضافة وتعديل/);
 assert.match(editor,/name="password"/);
 assert.match(editor,/name="email" dir="ltr"/);
 assert.match(editor,/12 حرفاً على الأقل/);
 assert.equal(app.toAuthEmail('ahmed@raafat'),'ahmed@raafat.example');
 assert.equal(app.displayStaffLogin('ahmed@raafat.example'),'ahmed@raafat');
 assert.equal(app.toAuthEmail('administrator@gmail.com'),'administrator@gmail.com');
});
test('half-A4 receipt is a real one-page A5 PDF with printable signature labels and payee',async()=>{
 const text=[],size=[];
 const ctx={
  scale(){},translate(){},fillRect(){},beginPath(){},roundRect(){},fill(){},
  moveTo(){},lineTo(){},stroke(){},fillText(value){text.push(String(value))},measureText:()=>({width:20})
 };
 const document={
  fonts:{load:async()=>[]},
  createElement(tag){if(tag==='canvas')return {width:0,height:0,getContext:()=>ctx,toDataURL:()=> 'data:image/png;base64,iVBORw0KGgo='};
   return {remove(){},style:{}};
  }
 };
 const pdfLib={PDFDocument:{create:async()=>({
  setTitle(){},setCreator(){},addPage(dim){size.push(dim);return {drawImage(){}}},
  embedPng:async()=>({}),save:async()=>new Uint8Array([37,80,68,70,45,49,46,55])
 })}};
 const window={PDFLib:pdfLib};
 const gen=new Function('window','document','fetch','Blob','URL','setTimeout',
  receiptSource+'\nreturn window.RaafatPayrollReceipt;'
 )(window,document,async()=>({arrayBuffer:async()=>new Uint8Array([137,80,78,71]).buffer}),
  Blob,URL,()=>{});
 const pdf=await gen.generate({
  receiptNumber:'PR-0024',employeeName:'أمل عبد',jobTitle:'عاملة تنظيف',
  department:'التنظيف',salaryMonth:'2026-11',paidAt:'2026-11-15',
  amount:400000,currency:'IQD',paidBy:'مدير الحسابات',companyName:'شركة رأفت'
 });
 assert.equal(pdf.type,'application/pdf');
 assert.ok(Math.abs(size[0][0]-420.94)<.1&&Math.abs(size[0][1]-595.28)<.1);
 for(const value of ['وصل استلام راتب','أمل عبد','عاملة تنظيف','مدير الحسابات','توقيع الموظف المستلم','توقيع مسؤول الصرف','PR-0024'])
  assert.ok(text.some(line=>line.includes(value)),'receipt must contain '+value);
});
