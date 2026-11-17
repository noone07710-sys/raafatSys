import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
class TestFile {}
class TestFormData {
 constructor(form){this.values=form.values||{}}
 *entries(){yield* Object.entries(this.values)}
}
function fixture(){
 const el={innerHTML:''};
 const document={
  baseURI:'https://example.test/raafatSys/',
  querySelector:selector=>selector==='#app'?el:null,
  querySelectorAll:()=>[],
  createElement:()=>({remove(){},style:{},textContent:''}),
  body:{append(){}},
  title:''
 };
 const localStorage={getItem:()=>null,setItem(){}};
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File','setTimeout',
  source+'\nreturn {s,modalHtml,customerContractRowActions,leaseRowActions,contractDeleteAction,contractDeleteDialog,saveContractPdfDraft,clean};'
 )(localStorage,document,{randomUUID:()=> 'demo-id'},()=>{}, {},TestFormData,TestFile,()=>{});
 app.s.demo=true;
 app.s.staff={role:'admin',active:true};
 app.s.data.customers=[{id:'cust',name:'زبون'}];
 app.s.data.packages=[{id:'pkg',name:'باقة A',code:'A',package_type:'cabin',pricing_mode:'fixed_term'}];
 app.s.data.campaigns=[{id:'camp',title:'حملة أصلية',customer_id:'cust',package_id:'pkg',price:500,currency:'USD',months:3}];
 app.s.data.customer_contracts=[{
  id:'contract',contract_number:'RC-0004',campaign_id:'camp',
  customer_id:'cust',package_id:'pkg',contract_type:'cabin',duration_months:3,
  amount:500,currency:'USD',start_date:'2026-11-17',end_date:'2027-02-16',
  campaign_quantity_snapshot:2,campaign_sites_snapshot:[],notes:'ملاحظة قديمة'
 }];
 app.s.data.leases=[{
  id:'lease',contract_number:'RA-0003',landlord_id:'owner',property_id:'roof',
  rent_total:2000,advance_amount:500,currency:'IQD',start_date:'2026-11-17',
  end_date:'2027-11-16',payment_frequency:'semiannual',grace_days:0
 }];
 app.s.data.landlords=[{id:'owner',name:'مالك'}];
 app.s.data.properties=[{id:'roof',landlord_id:'owner',title:'سطح',width_m:10,height_m:20}];
 app.s.data.lease_installments=[{id:'paid',lease_id:'lease',due_date:'2026-11-17',amount:750,paid_amount:300},
  {id:'open',lease_id:'lease',due_date:'2027-05-17',amount:750,paid_amount:0}];
 return app;
}
test('editing a saved campaign-linked customer contract exposes all editable financial and print fields',()=>{
 const app=fixture(),record=app.s.data.customer_contracts[0];
 app.s.modal={kind:'edit',table:'customer_contracts',data:record,contractSiteIds:[]};
 const html=app.modalHtml();
 for(const field of ['customer_id','package_id','duration_months','amount','currency',
  'start_date','end_date','campaign_quantity_snapshot','campaign_title_snapshot',
  'package_specifications_snapshot','terms','notes'])
  assert.match(html,new RegExp('name="'+field+'"'),field);
 assert.match(html,/حفظ جميع تعديلات العقد/);
 assert.doesNotMatch(html,/name="campaign_id"/,'originating campaign remains historical');
 const cleaned=app.clean('customer_contracts',{...record,amount:900,notes:'جديد',campaign_quantity_snapshot:3});
 assert.equal(cleaned.amount,900);
 assert.equal(cleaned.campaign_quantity_snapshot,3);
 assert.equal(cleaned.notes,'جديد');
});
test('contract deletion is displayed only for superadmin and identifies affected records',()=>{
 const app=fixture();
 assert.match(app.customerContractRowActions(app.s.data.customer_contracts[0]),/data-delete-contract="customer_contracts:contract"/);
 assert.match(app.leaseRowActions(app.s.data.leases[0]),/data-delete-contract="leases:lease"/);
 app.s.modal={kind:'deleteContract',table:'leases',data:app.s.data.leases[0]};
 const html=app.contractDeleteDialog();
 assert.match(html,/حذف العقد نهائياً/);
 assert.match(html,/عدد الأقساط: 2/);
 assert.match(html,/data-action="close"/);
 app.s.demo=false;
 app.s.staff={role:'custom_admin',active:true,permissions:['leases.edit','customer_contracts.edit']};
 assert.doesNotMatch(app.leaseRowActions(app.s.data.leases[0]),/data-delete-contract/);
 assert.doesNotMatch(app.customerContractRowActions(app.s.data.customer_contracts[0]),/data-delete-contract/);
});
test('saved custom customer contract print draft persists custom clauses and details in demo state',async()=>{
 const app=fixture(),contract=app.s.data.customer_contracts[0];
 const original={number:'RC-0004',customerName:'زبون',campaignTitle:'حملة أصلية',
  amount:500,currency:'USD',notes:'ملاحظة قديمة',quantity:2,months:3,
  sites:[],clauses:[{number:'1',text:'شرط قديم'}]};
 app.s.modal={
  kind:'customerPdfEditor',table:'customer_contracts',data:contract,
  printDraft:{...original},printBase:JSON.parse(JSON.stringify(original))
 };
 const button={disabled:false,isConnected:true};
 const form={
  values:{notes:'ملاحظة في نسخة الطباعة'},
  querySelectorAll:selector=>selector==='[data-print-clause]'?
   [{querySelector:()=>({value:'شرط مخصص محفوظ'})}]:[],
  querySelector:selector=>selector==='[data-pdf-editor-save]'?button:null
 };
 await app.saveContractPdfDraft(form);
 assert.equal(contract.print_overrides.notes,'ملاحظة في نسخة الطباعة');
 assert.deepEqual(contract.print_overrides.clauses,[{number:'1',text:'شرط مخصص محفوظ'}]);
 assert.equal(contract.print_overrides.amount,undefined,'unchanged financial amount is not duplicated');
 assert.equal(button.disabled,false);
});