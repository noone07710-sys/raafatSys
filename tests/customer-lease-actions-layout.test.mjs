import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');

function fixture(){
 const app=new Function('localStorage','document','crypto','createClient','window',
  source+'\nreturn {s,defs,clean,listing,modalHtml,previewHtml,leaseRowActions};'
 )({getItem:()=>null,setItem:()=>{}},
  {baseURI:'https://example.test/raafatSys/'},
  {randomUUID:()=> 'fixture-id'},()=>{},{});
 app.s.demo=true;app.s.staff={role:'admin',active:true};
 app.s.search='';app.s.filter='all';
 app.s.data.landlords=[{id:'owner-1',name:'مالك متعدد القطع',phone:'07701111111'}];
 app.s.data.properties=[{id:'roof-1',landlord_id:'owner-1',title:'سطح شارع الزهور',width_m:5,height_m:4,area_m2:20,quantity:1}];
 app.s.data.leases=[{id:'lease-1',contract_number:'RA-0001',landlord_id:'owner-1',property_id:'roof-1',
  rent_total:1000000,advance_amount:200000,currency:'IQD',start_date:'2026-11-15',
  end_date:'2031-11-14',grace_days:0,payment_frequency:'annual'}];
 app.s.data.lease_installments=[{id:'i-1',lease_id:'lease-1',due_date:'2027-11-15',amount:800000,paid_amount:0}];
 return app;
}

test('customer creation never asks for a rental address; records keep locations on campaigns',()=>{
 const app=fixture();
 assert.equal(app.defs.customers.fields.some(f=>f[0]==='rental_address'),false);
 const customer={name:'زبون جديد',phone:'07701234567',national_id:'123456789012',status:'inquiry'};
 const cleanCustomer=app.clean('customers',customer);
 assert.equal(Object.hasOwn(cleanCustomer,'rental_address'),false);
 app.s.modal={kind:'edit',table:'customers',data:customer};
 assert.doesNotMatch(app.modalHtml(),/name="rental_address"|عنوان الاستئجار/);
 assert.doesNotMatch(app.listing('customers'),/عنوان الاستئجار/);
});

test('rooftop lease actions are four separate controls, with property dimensions visible',()=>{
 const app=fixture(),html=app.listing('leases');
 assert.match(html,/class="lease-row-actions-cell"/);
 for(const name of ['data-preview="lease-1"','data-edit="leases:lease-1"',
  'data-landlord-pdf="lease-1"','data-lease-payments="lease-1"']){
  assert.ok(html.includes(name),'Missing '+name);
 }
 assert.match(html,/التفاصيل/);
 assert.match(html,/مراجعة وطباعة/);
 assert.match(html,/الأقساط والدفعات/);
 assert.match(html,/5 × 4 م/);
 assert.match(html,/20 م²/);
 const controls=app.leaseRowActions(app.s.data.leases[0]);
 assert.equal((controls.match(/<button/g)||[]).length,4);
});

test('lease editor and preview expose structured review, installment and edit actions',()=>{
 const app=fixture(),lease=app.s.data.leases[0];
 app.s.modal={kind:'edit',table:'leases',data:{...lease},siteIds:[],leasePlanMode:'auto',leaseDraft:[]};
 const editor=app.modalHtml(),details=app.previewHtml(lease);
 assert.match(editor,/lease-form-tools/);
 assert.match(editor,/data-lease-payments="lease-1"/);
 assert.match(editor,/data-renew="lease-1"/);
 assert.match(details,/lease-preview-actions/);
 assert.match(details,/data-edit="leases:lease-1"/);
 assert.match(details,/data-lease-payments="lease-1"/);
 assert.match(css,/\.lease-row-actions\{/);
 assert.match(css,/\.lease-preview-actions\{/);
});
