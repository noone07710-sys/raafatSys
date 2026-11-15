import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
const pdfSource=readFileSync(new URL('../contract-pdf.js',import.meta.url),'utf8');

function model(savedView=null){
 const root={innerHTML:''};
 const history={'raafat-last-view':savedView};
 const storage={getItem:key=>history[key]||null,setItem:(key,value)=>history[key]=value};
 const doc={baseURI:'https://example.test/raafatSys/',title:'',
  querySelector:key=>key==='#app'?root:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){}}),body:{append(){}}};
 const app=new Function('localStorage','document','crypto','createClient','window',
  source+'\nreturn {s,render,navGroupForView,employeesOverview,employeeSalaryExpenses,openSalaryExpense,'+
   'expenseInvoiceForm,expenseInvoiceValidated,activityLogsView,siteDeleteLinks,openSiteDelete,deleteSiteDialog};'
 )(storage,doc,{randomUUID:()=> 'fake-id'},()=>{},{});
 app.s.staff={role:'admin'};app.s.demo=true;
 app.s.data.employees=[
  {id:'employee-1',name:'حسين علاء',job_title:'المدير التنفيذي',department:'general',
   salary_amount:500000,salary_currency:'IQD',active:true,created_at:'2026-11-01'},
  {id:'employee-2',name:'موظف آخر',job_title:'مصمم',department:'graphic_design',
   salary_amount:300, salary_currency:'USD',active:false,created_at:'2026-11-01'}
 ];
 return {app,root,history};
}
test('the current page and expanded sidebar are restored from a previous refresh',()=>{
 const {app,history}=model('leases');
 assert.equal(app.s.view,'leases');
 assert.equal(app.s.navExpanded,'landlords');
 app.render();
 assert.equal(history['raafat-last-view'],'leases');
 assert.equal(app.navGroupForView('employees'),'finance');
 const invalid=model('untrusted-unknown-table');
 invalid.app.render();
 assert.equal(invalid.app.s.view,'dashboard');
});
test('HR employees register is linked to salary expense records without confusing cashier and recipient',()=>{
 const {app}=model();
 const {s}=app;
 s.data.company_expenses=[{
  id:'salary-1',employee_id:'employee-1',expense_date:'2026-11-15',
  title:'راتب حسين',amount:500000,paid_amount:250000,currency:'IQD',
  category:'salaries',paid_by:'احمد اسماعيل',
  expense_items:[{category:'salaries',department:'general',quantity:1,
   unit_price:500000,description:'راتب شهر تشرين الثاني'}]
 }];
 const history=app.employeeSalaryExpenses('employee-1');
 assert.equal(history.length,1);
 assert.equal(app.employeeSalaryExpenses('employee-2').length,0);
 assert.match(app.employeesOverview(),/250,000/,'previous payroll stays as a read-only archive');
 app.openSalaryExpense('employee-1');
 assert.equal(s.modal.kind,'payrollPayment','salary must open in HR, not in general expenses');
 assert.equal(s.modal.data.employee_id,'employee-1');
 assert.equal(s.modal.data.amount,500000);
 const html=app.employeesOverview();
 assert.match(html,/صرف راتب/);
 assert.match(html,/أرشيف/);
 const expenseRows=app.expenseInvoiceForm({id:null,title:'ورق الطباعة',currency:'IQD',
  expense_date:'2026-11-15',paid_by:'حسين علاء'});
 assert.doesNotMatch(expenseRows,/<option value="salaries"/);
 const salary=[{category:'salaries',department:'general',description:'راتب',quantity:1,unit_price:500000}];
 const values={expense_date:'2026-11-15',currency:'IQD',paid_by:'حسين علاء',
  employee_id:'employee-1',status:'paid',payment_method:'cash',receipt_number:''};
 assert.throws(()=>app.expenseInvoiceValidated(values,salary),/صرف الرواتب صار حصراً/);
});
test('admin audit log describes source record changes, actor and recent operations',()=>{
 const {app}=model();
 app.s.activityLogs=[{id:'event-1',table_name:'employees',record_label:'حسين علاء',
  action:'UPDATE',record_id:'employee-1',actor_email:'office@example.test',
  occurred_at:'2026-11-15T09:00:00Z',
  changes:{salary_amount:{old:400000,new:500000}}}];
 const html=app.activityLogsView();
 assert.ok(html.includes('حسين علاء'));
 assert.ok(html.includes('office@example.test'));
 assert.ok(html.includes('400000'));
 assert.ok(html.includes('500000'));
 assert.ok(html.includes('تعديل'));
 assert.ok(html.includes('data-activity-refresh'));
});
test('ad-site deletion offers disable on booked sites and typed delete on unlinked sites',()=>{
 const {app}=model();
 const site={id:'site-a',code:'A001',name:'لوحة الزهور'};
 app.s.data.ad_sites=[site];
 app.s.data.customer_contracts=[{id:'contract',campaign_sites_snapshot:[{id:'site-a',code:'A001'}]}];
 assert.equal(app.siteDeleteLinks(site).blocked,true);
 const blocked=app.deleteSiteDialog(site);
 assert.match(blocked,/تعطيل الموقع/);
 assert.doesNotMatch(blocked,/id="deleteSiteSubmit"/);
 app.s.data.customer_contracts=[];
 app.s.data.campaign_sites=[];
 assert.equal(app.siteDeleteLinks(site).blocked,false);
 const allowed=app.deleteSiteDialog(site);
 assert.match(allowed,/id="deleteSiteSubmit"/);
 assert.match(allowed,/اكتب/);
 app.openSiteDelete(site.id);
 assert.equal(app.s.modal.kind,'deleteSite');
});
test('generated contract filenames include the Arabic customer or landlord name plus contract reference',()=>{
 const win={},doc={baseURI:'https://example.test/raafatSys/'};
 const pdf=new Function('window','document','URL',
  pdfSource+';\nreturn window.RaafatContractPdf;')(win,doc,URL);
 const customer=pdf.contractFileName({number:'RC-0024',customerName:'مكتبة حبر',customerPhone:'07701234567'});
 const landlord=pdf.contractFileName({kind:'landlord',number:'RA-0032',landlordName:'حسين علي',landlordPhone:'07801234567'});
 assert.ok(customer.includes('مكتبة-حبر'));
 assert.ok(customer.includes('RC-0024'));
 assert.ok(customer.includes('07701234567'));
 assert.ok(landlord.includes('حسين-علي'));
 assert.ok(landlord.includes('07801234567'));
 assert.ok(landlord.includes('RA-0032'));
 assert.ok(landlord.endsWith('.pdf'));
 assert.ok(!landlord.includes('/'));
});
