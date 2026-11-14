import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function createHarness({demo=true,admin=true}={}){
 const code=readFileSync(new URL('../app.js',import.meta.url),'utf8')
  .replace(/^import[^\n]*\n/,'')
  .replace(/\nbootstrap\(\);\s*$/,'');
 const page={innerHTML:''};
 const doc={
  title:'',
  querySelector(selector){return selector==='#app'?page:null},
  querySelectorAll(){return []},
  createElement(){return {style:{},textContent:'',remove(){}}},
  body:{append(){}}
 };
 const files={};
 class FakeURL extends URL {
  static createObjectURL(){return 'blob:logo-preview'}
  static revokeObjectURL(){}
 }
 const FakeFormData=class {
  constructor(form){this.values=form.values}
  get(k){return this.values[k]??null}
 };
 const env=new Function('localStorage','document','crypto','createClient','window','FormData','URL','setTimeout',
  code+'\nreturn {s,render,settings,saveSettings,companyValue,companyLogoUrl,companyLogoHtml,customerContractPreview,previewHtml,seededDemoPackages,seededDemoRates};'
 )({getItem:()=>null,setItem:()=>{}},doc,{randomUUID:()=> 'unique-image-2026'},()=>{}, {},FakeFormData,FakeURL,()=>{});
 const {s}=env;
 s.demo=demo;
 s.staff={role:admin?'admin':'staff',active:true};
 s.view='settings';
 s.data.packages=env.seededDemoPackages();
 s.data.package_rates=env.seededDemoRates();
 const values={
  company_name:'شركة رأفت للدعاية والإعلان والتجارة العامة',
  company_short_name:'رأفت',
  company_tagline:'الإعلانات والطباعة',
  company_phone:'07706633479',
  company_whatsapp:'9647706633479',
  company_email:'info@example.com',
  company_website:'https://example.com',
  company_governorate:'صلاح الدين',
  company_city:'تكريت',
  company_address:'شارع تجريبي',
  company_registration:'123456',
  usd_iqd:'1500',
  remove_logo:'false'
 };
 const form={values,elements:{namedItem(name){return name==='company_logo_file'?{files:files.logo?[files.logo]:[]}:null}}};
 return {env,page,doc,form,values,files};
}

test('company branding settings render and save together with FX',async()=>{
 const {env,page,form,values}=createHarness();
 env.render();
 for(const key of ['company_name','company_short_name','company_tagline','company_phone','company_whatsapp','company_email',
  'company_governorate','company_city','company_address','company_registration','company_logo_file','usd_iqd']){
  assert.match(page.innerHTML,new RegExp('name="'+key+'"'),key);
 }
 assert.match(page.innerHTML,/هوية الشركة وإعدادات النظام/);
 assert.match(page.innerHTML,/معاينة هوية الشركة/);
 assert.match(page.innerHTML,/اختيار ملف الشعار/);
 values.company_name='شركة اختبار للدعاية';
 values.company_short_name='اختبار';
 values.company_tagline='خدمات الدعاية';
 values.usd_iqd='1540';
 await env.saveSettings(form);
 assert.equal(env.s.settings.company_name,'شركة اختبار للدعاية');
 assert.equal(env.s.settings.company_short_name,'اختبار');
 assert.equal(env.s.settings.usd_iqd,1540);
 assert.match(page.innerHTML,/شركة اختبار للدعاية/);
 assert.match(page.innerHTML,/<strong>اختبار<\/strong>/);
 assert.doesNotMatch(page.innerHTML,/<span class="brand-sys">SYS<\/span>/);
 assert.match(page.innerHTML,/شركة اختبار للدعاية/);
 const ownerContract={id:'lease1',property_id:'prop1',landlord_id:'owner1',rent_total:1000,currency:'USD',payment_frequency:'annual',grace_days:0,start_date:'2026-11-14',end_date:'2027-11-13'};
 assert.doesNotMatch(env.previewHtml(ownerContract),/شركة اختبار للدعاية/);
 assert.match(env.previewHtml(ownerContract),/بين الشركة ومالك البناية/);
 const customerContract={id:'cc1',package_id:env.s.data.packages[0].id,customer_id:'unknown',contract_type:'cabin',duration_months:3,start_date:'2026-11-14',end_date:'2027-02-13',contract_number:'RC-1',amount:280,currency:'USD'};
 assert.doesNotMatch(env.customerContractPreview(customerContract),/شركة اختبار للدعاية/);
 assert.match(env.customerContractPreview(customerContract),/الطرف الأول<\/small><strong>الشركة/);
});

test('demo logo is previewable, removable, and image formats are validated',async()=>{
 const {env,form,files,values}=createHarness();
 files.logo={name:'logo.png',type:'image/png',size:1000};
 await env.saveSettings(form);
 assert.equal(env.s.demoLogoUrl,'blob:logo-preview');
 assert.match(env.companyLogoHtml('sidebar'),/blob:logo-preview/);
 const customerContract={id:'demo',contract_number:'RC-1',amount:280,currency:'USD',contract_type:'cabin',start_date:'2026-11-14',end_date:'2027-02-13'};
 assert.doesNotMatch(env.customerContractPreview(customerContract),/blob:logo-preview/);
 files.logo=null;values.remove_logo='true';
 await env.saveSettings(form);
 assert.equal(env.s.settings.logo_path,null);
 assert.equal(env.s.demoLogoUrl,null);
 files.logo={name:'unsafe.svg',type:'image/svg+xml',size:500};
 await env.saveSettings(form);
 assert.equal(env.s.demoLogoUrl,null,'SVG must not enter branding URL');
});

test('real admin settings save uses private authorized write and public media URL',async()=>{
 const {env,form,files,values}=createHarness({demo:false});
 const uploads=[],updates=[];
 files.logo={name:'brand.webp',type:'image/webp',size:2000};
 env.s.client={
  storage:{
   from(bucket){
    assert.equal(bucket,'raafat-branding');
    return {
     async upload(path,file,options){uploads.push({path,file,options});return {error:null}},
     getPublicUrl(path){return {data:{publicUrl:'https://assets.example.test/'+path}}},
     async remove(paths){return {data:paths,error:null}}
    };
   }
  },
  from(table){
   assert.equal(table,'settings');
   return {
    update(record){
     updates.push(record);
     return {
      eq(field,id){
       assert.equal(field,'id');
       assert.equal(id,1);
       return {
        select(){
         return {single:async()=>({data:{id:1,...record},error:null})};
        }
       };
      }
     };
    }
   };
  }
 };
 values.company_name='شركة مدارة';
 await env.saveSettings(form);
 assert.equal(uploads.length,1);
 assert.match(uploads[0].path,/^company\/logos\/unique-image-2026\.webp$/);
 assert.equal(uploads[0].options.contentType,'image/webp');
 assert.equal(updates.length,1);
 assert.equal(updates[0].company_name,'شركة مدارة');
 assert.equal(updates[0].logo_path,uploads[0].path);
 assert.equal(env.s.settings.usd_iqd,1500);
 assert.match(env.companyLogoHtml('sidebar'),/assets\.example\.test/);
 assert.doesNotMatch(env.previewHtml({id:'lease1',property_id:'p',landlord_id:'l',rent_total:1000,currency:'USD',payment_frequency:'annual',grace_days:0,start_date:'2026-11-14',end_date:'2027-11-13'}),/assets\.example\.test/);
});

test('non-admin cannot write company settings',async()=>{
 const {env,page,form,values}=createHarness({demo:false,admin:false});
 env.render();
 assert.doesNotMatch(page.innerHTML,/حفظ كل الإعدادات/);
 values.company_name='اسم غير مصرح';
 await env.saveSettings(form);
 assert.notEqual(env.s.settings.company_name,'اسم غير مصرح');
});
