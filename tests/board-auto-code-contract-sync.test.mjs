import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function fixture(){
 const js=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'').replace(/\nbootstrap\(\);\s*$/,'');
 const root={innerHTML:''},messages=[];
 const document={
  title:'',querySelector:q=>q==='#app'?root:null,querySelectorAll:()=>[],
  createElement:()=>({style:{},remove(){},set textContent(v){messages.push(v)}}),
  body:{append(){}}
 };
 class FormDataMock{
  constructor(form){this.values=form.values}
  *entries(){for(const entry of Object.entries(this.values))yield entry}
 }
 const app=new Function('localStorage','document','crypto','createClient','window','FormData','File','setTimeout',
  js+'\nreturn {s,fieldHtml,siteNumberFromCode,siteCodeForPackage,saveForm,contractCampaignDetails,customerContractPdfPayload,customerContractPreview,seededDemoPackages};'
 )({getItem:()=>null,setItem:()=>{}},document,{randomUUID:()=> 'new-uuid'},()=>{},{},FormDataMock,class FileMock{},()=>{});
 app.s.demo=true;app.s.staff={role:'admin'};
 app.s.data.packages=app.seededDemoPackages();
 return {app,root,messages};
}

test('board category supplies A prefix; saving 4 upgrades original site and linked contract PDF to A-4',async()=>{
 const {app,root}=fixture(),{s}=app;
 const pkg=s.data.packages.find(p=>p.code==='A');
 s.data.ad_sites=[{id:'board',package_id:pkg.id,code:'4',name:'الموقع القديم',site_type:'roadside',
  governorate:'صلاح الدين',address:'عنوان قديم',active:true}];
 s.data.campaigns=[{id:'cam',title:'حملة',package_id:pkg.id,customer_id:'customer'}];
 s.data.customers=[{id:'customer',name:'عميل'}];
 const contract={id:'contract',contract_number:'RC-0001',campaign_id:'cam',customer_id:'customer',
  package_id:pkg.id,campaign_sites_snapshot:[{id:'board',code:'4',name:'الموقع القديم',address:'عنوان قديم'}],
  amount:280,currency:'USD',duration_months:3,campaign_quantity_snapshot:1};
 assert.equal(app.siteNumberFromCode('A04'),'4');
 assert.equal(app.siteNumberFromCode('٤'),'4');
 assert.equal(app.siteCodeForPackage('4',pkg.id),'A-4');
 s.modal={kind:'edit',table:'ad_sites',data:{...s.data.ad_sites[0]}};
 const html=app.fieldHtml(['code','رمز','text',true],s.modal.data,s.modal.data);
 assert.match(html,/name="site_number"/);
 assert.match(html,/value="A-4"/);
 const form={values:{site_number:'4',code:'A-4',package_id:pkg.id,name:'الموقع الجديد',
  site_type:'roadside',governorate:'صلاح الدين',address:'عنوان جديد',active:'true'},
  querySelectorAll:()=>[]};
 await app.saveForm(form);
 assert.equal(s.data.ad_sites[0].code,'A-4');
 assert.equal(s.data.ad_sites[0].name,'الموقع الجديد');
 assert.match(root.innerHTML,/A-4/);
 const details=app.contractCampaignDetails(contract);
 assert.equal(details.sites[0].code,'A-4');
 assert.equal(details.sites[0].name,'الموقع الجديد');
 assert.equal(details.sites[0].address,'عنوان جديد');
 const pdf=app.customerContractPdfPayload(contract);
 assert.equal(pdf.sites[0].code,'A-4');
 assert.equal(pdf.amount,280,'historical contract value stays unchanged');
 assert.match(app.customerContractPreview(contract),/A-4/);
 assert.equal(contract.campaign_sites_snapshot[0].code,'4','stored snapshot is not destructively rewritten');
});

test('reusing another board numeric code in the same category is rejected',async()=>{
 const {app,messages}=fixture(),{s}=app;
 const pkg=s.data.packages.find(p=>p.code==='B');
 s.data.ad_sites=[{id:'existing',package_id:pkg.id,code:'B01',name:'موقع',site_type:'roadside',active:true}];
 s.modal={kind:'edit',table:'ad_sites',data:{name:'موقع جديد',code:'B-1',package_id:pkg.id}};
 const form={values:{site_number:'1',code:'B-1',package_id:pkg.id,name:'موقع جديد',
  site_type:'roadside',governorate:'كركوك',address:'عنوان',active:'true'},
  querySelectorAll:()=>[]};
 await app.saveForm(form);
 assert.equal(s.data.ad_sites.length,1);
 assert.ok(messages.some(m=>m.includes('موجود مسبقاً')));
});
