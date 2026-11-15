import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8')
 .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
const pdfSource=readFileSync(new URL('../contract-pdf.js',import.meta.url),'utf8');
function setup(){
 const a=new Function('localStorage','document','crypto','createClient','window','FormData','File',
  source+'\nreturn {s,seededDemoPackages,seededDemoRates,quoteCampaign,refreshCampaignQuote,campaignFaces,formValidate,campaignContractData,quoteCustomerContract,customerContractPdfPayload,fieldHtml,clean};'
 )({getItem:()=>null,setItem:()=>{}},{baseURI:'https://example.test/raafatSys/'},
  {randomUUID:()=> 'example-uuid'},()=>{},{},class {},class {});
 a.s.demo=true;a.s.staff={role:'admin'};
 a.s.data.packages=a.seededDemoPackages();a.s.data.package_rates=a.seededDemoRates();
 const pkg=code=>a.s.data.packages.find(p=>p.code===code);
 return {a,pkg};
}

test('face selection applies a strict 50 percent discount only to A B C D',()=>{
 const {a,pkg}=setup();
 const base={A:280,B:520,C:760,D:800};
 for(const code of ['A','B','C','D']){
  for(const faces of [1,2]){
   const quote=a.quoteCampaign({package_id:pkg(code).id,months:3,quantity:1,
    currency:'USD',ad_faces:faces});
   assert.equal(quote.total,base[code]*(faces===1?0.5:1),code+' '+faces);
  }
 }
 assert.equal(a.quoteCampaign({package_id:pkg('A').id,months:6,quantity:3,
  currency:'USD',ad_faces:1}).total,645);
 assert.equal(a.quoteCampaign({package_id:pkg('A').id,months:3,quantity:1,
  currency:'IQD',ad_faces:1}).total,210000);
 // Legacy campaigns had no ad_faces field and keep their previous full price.
 assert.equal(a.quoteCampaign({package_id:pkg('A').id,months:3,quantity:1,
  currency:'USD'}).total,280);
});

test('changing face count recalculates the current campaign price',()=>{
 const {a,pkg}=setup();
 const campaign={package_id:pkg('A').id,months:3,quantity:1,currency:'USD',ad_faces:2,price:280};
 a.s.modal={table:'campaigns',data:campaign,siteIds:[],autoPrice:true};
 campaign.ad_faces=1;
 a.refreshCampaignQuote();
 assert.equal(campaign.price,140);
 campaign.ad_faces=2;
 a.refreshCampaignQuote();
 assert.equal(campaign.price,280);
});

test('E remains on the unchanged square-meter pricing regardless of face input',()=>{
 const {a,pkg}=setup();
 a.s.data.properties=[{id:'roof-24',width_m:4,height_m:6,area_m2:24}];
 a.s.data.ad_sites=[{id:'e-1',package_id:pkg('E').id,rooftop_property_id:'roof-24'}];
 for(const faces of [1,2]){
  const value={package_id:pkg('E').id,months:3,quantity:1,currency:'USD',ad_faces:faces};
  assert.equal(a.quoteCampaign(value,['e-1']).total,864);
  assert.equal(a.campaignFaces(value),1);
 }
});

test('campaign form shows a two-face selector and preserves faces in contract snapshots',()=>{
 const {a,pkg}=setup();
 const camp={id:'camp-1',package_id:pkg('B').id,customer_id:'customer-1',
  title:'حملة تجريبية',start_date:'2026-11-15',months:3,quantity:1,ad_faces:1,
  price:260,currency:'USD'};
 a.s.modal={table:'campaigns',data:camp,siteIds:[]};
 const html=a.fieldHtml(['ad_faces','عدد الأوجه','select',true,[1,2]],camp,camp);
 assert.match(html,/name="ad_faces"/);
 assert.match(html,/وجه واحد — خصم 50%/);
 assert.match(html,/value="1" selected/);
 assert.equal(a.clean('campaigns',camp).ad_faces,1);
 const snap=a.campaignContractData(camp);
 assert.equal(snap.ad_faces,1);
 assert.equal(snap.amount,260);
 a.s.data.customers=[{id:'customer-1',name:'زبون',phone:'07701234567'}];
 const payload=a.customerContractPdfPayload({id:'contract-1',contract_number:'RC-0001',
  ...snap,customer_name_snapshot:'زبون',package_name_snapshot:'الباقة B'});
 assert.equal(payload.adFaces,1);
 assert.match(pdfSource,/painter\.field\('عدد الأوجه'/);
 const e={package_id:pkg('E').id,ad_faces:1};
 assert.doesNotMatch(a.fieldHtml(['ad_faces','عدد الأوجه','select',true,[1,2]],e,e),/name="ad_faces"/);
});

test('legacy contracts default to two faces without repricing saved amounts',()=>{
 const {a,pkg}=setup();
 const old={id:'contract-old',package_id:pkg('A').id,customer_id:'old-customer',
  amount:280,currency:'USD',start_date:'2026-01-01',duration_months:3};
 assert.equal(a.campaignFaces(old),2);
 assert.equal(a.quoteCustomerContract({...old,ad_faces:1}).amount,140);
 assert.equal(old.amount,280);
});
