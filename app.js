import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const $=(q,root=document)=>root.querySelector(q);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n)||0);
const money=(n,c)=>fmt(n)+' '+(c==='USD'?'$':'د.ع');
const today=()=>new Date().toISOString().slice(0,10);
const uid=()=>crypto.randomUUID();
const PUBLIC_CONFIG={url:'https://gxredstctzkuwgsegykd.supabase.co',key:'sb_publishable_UtbrZOAMhrbBq3eeNaXf2Q_lrRT4K1s'};
const keys=['customers','packages','package_rates','landlords','properties','ad_sites','campaigns','campaign_sites','leases','lease_installments','campaign_payments','customer_contracts'];
const defs={
 customers:{title:'العملاء',icon:'♟',fields:[['name','اسم العميل','text',true],['phone','رقم الهاتف الأساسي (11 رقم)','tel',true],['alternate_phone','الهاتف البديل','tel'],['national_id','رقم البطاقة الموحدة (12 رقم)','text',true],['rental_address','عنوان الاستئجار','text',true],['preferred_package_id','الباقة الإعلانية المطلوبة','lookup:packages',true],['status','الحالة','select',true,['active','inactive','inquiry']],['notes','الملاحظات','textarea']]},
 packages:{title:'الباقات الإعلانية',icon:'◈',fields:[['name','اسم الباقة','text',true],['code','رمز الباقة','text',true],['package_type','نوع الباقة','select',true,['cabin','rooftop']],['pricing_mode','طريقة التسعير','select',true,['fixed_term','sqm_month']],['width_m','العرض بالمتر','number',true],['height_m','الطول بالمتر','number',true],['area_m2','المساحة الإجمالية م²','computed'],['sides','عدد الأوجه','number',true],['specifications','مواصفات الباقة','textarea'],['default_months','عدد الأشهر الافتراضي','number',true],['price','السعر الافتراضي للباقة','number',true],['currency','العملة','select',true,['IQD','USD']],['notes','ملاحظات','textarea']]},
 landlords:{title:'مالكو المواقع — الأسطح',icon:'▣',fields:[['name','اسم المالك','text',true],['phone','الهاتف (11 رقم)','tel',true],['alternate_phone','الهاتف البديل','tel'],['national_id','رقم البطاقة الموحدة','text'],['governorate','المحافظة','text',true],['residential_address','عنوان السكن','text',true],['landmark','أقرب نقطة دالة','text'],['notes','الملاحظات','textarea'],['card_image','صورة البطاقة الموحدة','file']]},
 properties:{title:'عقارات ومساحات الأسطح',icon:'▤',fields:[['landlord_id','صاحب العقار','lookup:landlords',true],['title','اسم السطح / العقار','text',true],['width_m','عرض السطح بالمتر','number',true],['height_m','طول السطح بالمتر','number',true],['area_m2','إجمالي مساحة السطح م²','computed'],['quantity','العدد','number',true],['notes','الملاحظات','textarea']]},
 leases:{title:'عقود مالكي البنايات — الأسطح',icon:'▧',fields:[['landlord_id','اسم المالك','lookup:landlords',true],['property_id','عقار المالك','lookup:properties',true],['rent_total','إجمالي الإيجار المتفق عليه','number',true],['currency','عملة العقد','select',true,['IQD','USD']],['start_date','تاريخ البداية','date',true],['end_date','تاريخ النهاية','date',true],['grace_days','فترة السماح بالأيام','number',true],['payment_frequency','دورية الدفع','select',true,['annual','semiannual']],['company_representative','ممثل الشركة','text'],['landlord_representative','ممثل المالك','text'],['notes','الملاحظات','textarea']]},
 ad_sites:{title:'المواقع الإعلانية',icon:'⌖',fields:[['code','رمز الموقع','text',true],['name','اسم الموقع','text',true],['site_type','نوع الموقع','select',true,['roadside','rooftop','building','other']],['governorate','المحافظة','text',true],['address','الموقع والعنوان','text',true],['rooftop_property_id','العقار المرتبط (إذا كان سطحاً)','lookup:properties'],['active','حالة الموقع','select',true,['true','false']],['notes','الملاحظات','textarea']]},
 campaigns:{title:'المشاريع والحملات',icon:'✦',fields:[['customer_id','العميل','lookup:customers',true],['title','اسم الحملة','text',true],['package_id','الباقة الإعلانية','lookup:packages'],['months','عدد الأشهر','number',true],['quantity','عدد القطع','number',true],['requested_area_m2','مساحة الإعلان بالمتر المربع (لباقة E)','number'],['locations','المواقع الإعلانية (أسماء أو رموز المواقع)','textarea'],['price','السعر الإجمالي','number',true],['currency','العملة','select',true,['IQD','USD']],['notes','الملاحظات','textarea']]},
 lease_installments:{title:'دفعات عقود الإيجار',icon:'◉',fields:[]},
 campaign_payments:{title:'دفعات الحملات',icon:'◉',fields:[]},
 campaign_sites:{title:'مواقع الحملات',icon:'⌖',fields:[]},
 package_rates:{title:'أسعار مدد الباقات',icon:'$',fields:[]},
 customer_contracts:{title:'عقود الزبائن — الكابينات والأسطح',icon:'▣',fields:[['customer_id','الزبون','lookup:customers',true],['package_id','الباقة الإعلانية','lookup:packages',true],['contract_type','نوع العقد','select',true,['cabin','rooftop']],['duration_months','مدة العقد بالأشهر','number',true],['rented_area_m2','مساحة الإعلان المتفق عليها م² (لباقة E)','number'],['campaign_id','الحملة المرتبطة (اختياري)','lookup:campaigns'],['site_id','الموقع الإعلاني (اختياري)','lookup:ad_sites'],['start_date','تاريخ بداية العقد','date',true],['end_date','تاريخ نهاية العقد','date',true],['amount','قيمة عقد الزبون','number',true],['currency','العملة','select',true,['IQD','USD']],['company_representative','ممثل شركة رأفت','text'],['customer_representative','ممثل الزبون','text'],['terms','شروط الاتفاق','textarea'],['notes','ملاحظات','textarea']]}
};
const labels={active:'فعال',inactive:'غير فعال',inquiry:'استفسار',IQD:'دينار عراقي',USD:'دولار أمريكي',annual:'سنوي',semiannual:'نصف سنوي',cabin:'كابينة إعلانية',fixed_term:'سعر كامل المدة للقطعة',sqm_month:'سعر المتر المربع شهرياً',roadside:'شارع / رصيف',rooftop:'سطح',building:'واجهة بناية',other:'أخرى',true:'متاح للحملات',false:'غير متاح'};
const COMPANY_DEFAULTS=Object.freeze({
 company_name:'شركة رأفت للدعاية والإعلان والتجارة العامة',
 company_short_name:'رأفت',
 company_tagline:'للدعاية والإعلان والتجارة العامة',
 company_phone:'',company_whatsapp:'',company_email:'',company_website:'',
 company_address:'',company_governorate:'',company_city:'',company_registration:'',
 logo_path:null
});
function companyValue(key){return s.settings?.[key]||COMPANY_DEFAULTS[key]||'';}
function companyLogoUrl(path=s.settings?.logo_path){
 if(!path||!/^company\/logos\/[a-zA-Z0-9_-]+\.(?:png|jpg|webp)$/.test(String(path)))return '';
 if(!s.client||s.demo)return '';
 return s.client.storage.from('raafat-branding').getPublicUrl(path).data?.publicUrl||'';
}
function companyLogoHtml(kind='sidebar'){
 const url=companyLogoUrl();
 return url?'<img class="company-logo company-logo-'+kind+'" src="'+E(url)+'" alt="شعار '+E(companyValue('company_short_name'))+'" loading="lazy">':
 '<span class="company-logo-fallback" aria-hidden="true">'+E(String(companyValue('company_short_name')).trim().slice(0,1)||'ر')+'</span>';
}
function companyDocumentHeader(){
 const address=[companyValue('company_governorate'),companyValue('company_city'),companyValue('company_address')].filter(Boolean).join(' — ');
 const contacts=[companyValue('company_phone'),companyValue('company_email'),companyValue('company_website')].filter(Boolean).join(' | ');
 return '<div class="contract-company-head">'+companyLogoHtml('contract')+'<div class="contract-company-copy"><h2>'+E(companyValue('company_name'))+'</h2><small>'+E([address,contacts].filter(Boolean).join(' · '))+'</small></div></div>';
}

const s={client:null,session:null,staff:null,realtimeChannel:null,config:PUBLIC_CONFIG,demo:false,resetRequest:false,passwordRecovery:false,view:'dashboard',navExpanded:null,data:Object.fromEntries(keys.map(k=>[k,[]])),settings:{...COMPANY_DEFAULTS,usd_iqd:1500},displayCurrency:localStorage.getItem('raafat-display-currency')==='USD'?'USD':'IQD',search:'',filter:'all',editing:null,modal:null,formStep:0,error:'',loading:false};

// Demo data matches the official price matrix; real staff load rows from Supabase.
const OFFICIAL_PACKAGES=[
 {code:'A',name:'الباقة A',package_type:'cabin',pricing_mode:'fixed_term',width_m:1.2,height_m:2,sides:2,default_months:3,price:280,months:{3:280,6:430,12:670}},
 {code:'B',name:'الباقة B',package_type:'cabin',pricing_mode:'fixed_term',width_m:2,height_m:3,sides:2,default_months:3,price:520,months:{3:520,6:760,12:1120}},
 {code:'C',name:'الباقة C',package_type:'cabin',pricing_mode:'fixed_term',width_m:2.5,height_m:3.5,sides:2,default_months:3,price:760,months:{3:760,6:1100,12:1800}},
 {code:'D',name:'الباقة D',package_type:'cabin',pricing_mode:'fixed_term',width_m:3,height_m:4,sides:2,default_months:3,price:800,months:{3:800,6:1300,12:2100}},
 {code:'E',name:'الباقة E — إعلانات الأسطح',package_type:'rooftop',pricing_mode:'sqm_month',width_m:null,height_m:null,sides:1,default_months:3,price:12,months:{1:15,3:12,6:9,12:6}}
];
function seededDemoPackages(){return OFFICIAL_PACKAGES.map(p=>({id:'demo-package-'+p.code,name:p.name,code:p.code,package_type:p.package_type,pricing_mode:p.pricing_mode,width_m:p.width_m,height_m:p.height_m,area_m2:p.width_m&&p.height_m?p.width_m*p.height_m:null,sides:p.sides,default_months:p.default_months,price:p.price,currency:'USD',specifications:p.pricing_mode==='sqm_month'?'تسعير أسطح بالمتر المربع شهرياً':'لوحات ضوئية بوجهين تشمل الإيجار والتصميم والطباعة والتبديل والصيانة',notes:'التعرفة الأصلية من Raafat Map'}));}
function seededDemoRates(){return OFFICIAL_PACKAGES.flatMap(p=>Object.entries(p.months).map(([months,usd_price])=>({id:'demo-rate-'+p.code+'-'+months,package_id:'demo-package-'+p.code,months:Number(months),usd_price})));}

const lookup=(table,id)=>s.data[table].find(x=>x.id===id);
const nameOf=(table,id)=>lookup(table,id)?.name||lookup(table,id)?.title||'—';
const convert=(v,from,to)=>from===to?Number(v):Number(v)*(from==='USD'?Number(s.settings.usd_iqd):1/Number(s.settings.usd_iqd));
const roundAmount=(n)=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const equivalent=(n,source,to=s.displayCurrency)=>roundAmount(convert(n,source,to));
const displayMoneyText=(n,source)=>money(equivalent(n,source),s.displayCurrency)+(s.displayCurrency!==source?' (الأصل '+money(n,source)+')':'');
const displayMoney=(n,source)=>'<strong class="amount">'+E(money(equivalent(n,source),s.displayCurrency))+'</strong>'+(s.displayCurrency!==source?'<small class="original-amount">الأصل: '+E(money(n,source))+'</small>':'');
const originalCurrency=(k,v)=>v?.currency||((k==='lease_installments')?lookup('leases',v?.lease_id)?.currency:(k==='campaign_payments')?lookup('campaigns',v?.campaign_id)?.currency:null)||'IQD';
const linkedSites=(campaignId)=>s.data.campaign_sites.filter(x=>x.campaign_id===campaignId).map(x=>lookup('ad_sites',x.site_id)).filter(Boolean);
const campaignPaid=(id)=>s.data.campaign_payments.filter(x=>x.campaign_id===id).reduce((a,b)=>a+Number(b.amount||0),0);
const campaignBalance=(v)=>Math.max(0,roundAmount(Number(v.price||0)-campaignPaid(v.id)));
const leaseBalance=(v)=>s.data.lease_installments.filter(x=>x.lease_id===v.id).reduce((a,x)=>a+Math.max(0,Number(x.amount)-Number(x.paid_amount)),0);

function packageRates(pkg){return s.data.package_rates.filter(x=>x.package_id===pkg?.id).sort((a,b)=>a.months-b.months);}
function packageRate(pkg,months){return packageRates(pkg).find(x=>Number(x.months)===Number(months));}
function packageMonths(pkg){
 const rates=packageRates(pkg);
 return rates.length?rates.map(x=>Number(x.months)):[Number(pkg?.default_months||3)];
}
function quotePackageUSD(pkg,months,quantity=1,areaM2=0){
 if(!pkg)return null;
 const rate=packageRate(pkg,months);
 if(rate){
  const unit=Number(rate.usd_price);
  if(pkg.pricing_mode==='sqm_month'){
   if(!(Number(areaM2)>0))return null;
   return roundAmount(unit*Number(months)*Number(areaM2));
  }
  return roundAmount(unit*Math.max(1,Number(quantity)||1));
 }
 if(packageRates(pkg).length)return null; // no invented interpolation for official tiers
 if(Number(months)!==Number(pkg.default_months))return null;
 const base=convert(pkg.price,pkg.currency||'USD','USD');
 return pkg.pricing_mode==='sqm_month'?
  (Number(areaM2)>0?roundAmount(base*Number(months)*Number(areaM2)):null):
  roundAmount(base*Math.max(1,Number(quantity)||1));
}
function campaignSiteArea(ids){
 return (ids||[]).reduce((sum,id)=>{
  const site=lookup('ad_sites',id),roof=lookup('properties',site?.rooftop_property_id);
  return sum+Number(roof?.area_m2||0);
 },0);
}
function quoteCampaign(v,ids=[]){
 const pkg=lookup('packages',v.package_id);if(!pkg)return null;
 const count=Math.max(1,Number(v.quantity)||1,(ids||[]).length);
 const area=Number(v.requested_area_m2)>0?Number(v.requested_area_m2):campaignSiteArea(ids);
 const usd=quotePackageUSD(pkg,Number(v.months),count,area);
 return usd===null?null:{usd,total:roundAmount(convert(usd,'USD',v.currency||'USD')),quantity:count,area};
}
function refreshCampaignQuote(){
 if(s.modal?.table!=='campaigns'||!s.modal.autoPrice)return;
 const v=s.modal.data;
 const quoted=quoteCampaign(v,s.modal.siteIds);
 v.price=quoted?quoted.total:0;
}
function packageRatesMarkup(pkg,currency=s.displayCurrency){
 const tiers=packageRates(pkg);
 const mode=pkg.pricing_mode==='sqm_month';
 return '<div class="rate-line">'+tiers.map(t=>
  '<div class="rate-tile"><small>'+t.months+' '+(t.months===1?'شهر':'أشهر')+'</small><strong>'+E(money(roundAmount(convert(t.usd_price,'USD',currency)),currency))+'</strong><small>'+(mode?'للمتر² شهرياً':'للقطعة / كامل المدة')+'</small></div>'
 ).join('')+'</div>';
}
function packageCatalog(){
 const rows=s.data.packages.filter(p=>['A','B','C','D','E'].includes(p.code)).sort((a,b)=>a.code.localeCompare(b.code));
 return '<div class="package-catalog">'+rows.map(p=>'<article class="box package-card"><div class="package-heading"><span class="package-symbol">'+E(p.code)+'</span><div><b>'+E(p.name)+'</b><small>'+E(p.pricing_mode==='sqm_month'?'قياس مخصص لكل سطح • تسعير مساحة':'قياس '+fmt(p.width_m)+' × '+fmt(p.height_m)+' متر • '+fmt(p.area_m2)+' م² • وجهان')+'</small></div></div>'+packageRatesMarkup(p)+'<div class="inline" style="margin-top:10px"><button class="btn secondary mini" data-edit="packages:'+p.id+'">عرض وتعديل الباقة</button></div></article>').join('')+'</div>';
}

function toast(text,bad=false){let x=document.createElement('div');x.className=bad?'error toast':'notice toast';x.textContent=text;document.body.append(x);Object.assign(x.style,{position:'fixed',bottom:'20px',left:'20px',zIndex:20,maxWidth:'min(90vw,500px)',boxShadow:'0 5px 30px #1113'});setTimeout(()=>x.remove(),4500)}

function subscribeToExchangeRate(){
 if(s.demo||!s.staff||!s.client||s.realtimeChannel)return;
 s.realtimeChannel=s.client.channel('raafat-sys-exchange-rate')
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'settings',filter:'id=eq.1'},payload=>{
   if(payload.new?.usd_iqd&&Number(payload.new.usd_iqd)>0){
    if($('#recordForm'))captureForm($('#recordForm'));
    s.settings=payload.new;render();
   }
  })
  .subscribe();
}

async function load(){
 if(s.demo)return render();
 if(!s.client||!s.session)return render();
 s.loading=true;render();
 try{
  const {data:staff,error:se}=await s.client.from('staff_members').select('*').eq('user_id',s.session.user.id).maybeSingle();
  if(se)throw se;
  s.staff=staff?.active?staff:null;
  if(!s.staff){s.error='هذا الحساب لا يملك صلاحية استخدام النظام. أضف المستخدم إلى staff_members كموظف مفعل.';s.loading=false;render();return;}
  const fetchAll=async table=>{
   const all=[];
   for(let start=0;start<100000;start+=1000){
    const {data,error}=await s.client.from(table).select('*').order('created_at',{ascending:false}).range(start,start+999);
    if(error)throw error;
    all.push(...(data||[]));
    if(!data||data.length<1000)return all;
   }
   throw Error('تجاوز عدد سجلات '+table+' حد التحميل المسموح؛ يلزم ترحيل عرض القائمة إلى صفحات.');
  };
  const requests=await Promise.all([...keys.map(fetchAll),s.client.from('settings').select('*').eq('id',1).maybeSingle()]);
  for(let i=0;i<keys.length;i++)s.data[keys[i]]=requests[i]||[];
  if(requests[keys.length].error)throw requests[keys.length].error;
  s.settings=requests[keys.length].data||s.settings;s.error='';
  subscribeToExchangeRate();
 }catch(e){s.error=e.message||String(e)}
 s.loading=false;render();
}
function demo(){
 s.demo=true;s.session=null;s.staff={role:'admin'};s.config=PUBLIC_CONFIG;if(s.demoLogoUrl){URL.revokeObjectURL(s.demoLogoUrl);s.demoLogoUrl=null;}s.data=Object.fromEntries(keys.map(k=>[k,[]]));s.data.packages=seededDemoPackages();s.data.package_rates=seededDemoRates();s.settings={...COMPANY_DEFAULTS,usd_iqd:1500};
 s.view='dashboard';s.error='';render();
}
async function connect(){
 const url=$('#url').value.trim(),key=$('#key').value.trim(),email=$('#email').value.trim(),password=$('#password').value;
 if(!url.startsWith('https://')||!key){toast('أدخل رابط Supabase ومفتاح publishable الصحيح',true);return}
 try{
 s.client=createClient(url,key);s.config={url,key};localStorage.setItem('raafat-config',JSON.stringify(s.config));
 const {data,error}=await s.client.auth.signInWithPassword({email,password});if(error)throw error;
 s.session=data.session;s.demo=false;await load();
 }catch(e){toast(e.message,true)}
}
async function bootstrap(){
 if(s.config){
  try{
   s.client=createClient(s.config.url,s.config.key);
   s.passwordRecovery=Boolean(window.location?.hash?.includes('type=recovery')||window.location?.search?.includes('type=recovery'));
   s.client.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){s.session=session;s.passwordRecovery=true;s.resetRequest=false;render();}
   });
   const {data,error}=await s.client.auth.getSession();
   if(error)throw error;
   s.session=data.session;
   if(s.passwordRecovery){render();}
   else if(s.session)await load();
   else render();
  }catch(e){s.error=e.message;render()}
 }else render();
}
function passwordResetRequestPage(){
 return '<div class="welcome"><div class="authbox"><h1>استعادة كلمة المرور</h1><p class="muted">نرسل رابطاً إلى بريد الحساب لتختار كلمة مرور جديدة بنفسك، بدون مشاركتها مع أحد.</p><form id="passwordResetRequestForm"><label class="field"><span>البريد الإلكتروني</span><input id="recoverEmail" type="email" autocomplete="email" required></label><button class="btn" type="submit">إرسال رابط الاستعادة</button></form><hr><button class="btn secondary" style="width:100%" data-action="cancelPasswordReset">العودة إلى تسجيل الدخول</button></div></div>';
}
function passwordRecoveryPage(){
 return '<div class="welcome"><div class="authbox"><h1>إنشاء كلمة مرور جديدة</h1><p class="muted">استعمل كلمة قوية من 12 حرفاً على الأقل. لن تُرسل الكلمة إلى GitHub ولا تُعرض في المحادثة.</p>'+(s.session?'<form id="passwordChangeForm"><label class="field"><span>كلمة المرور الجديدة</span><input id="newPassword" type="password" minlength="12" required autocomplete="new-password"></label><label class="field"><span>تأكيد كلمة المرور</span><input id="confirmPassword" type="password" minlength="12" required autocomplete="new-password"></label><button class="btn" type="submit">حفظ كلمة المرور الجديدة</button></form>':'<div class="error">رابط الاستعادة غير صالح أو انتهت صلاحيته. ارجع إلى شاشة الدخول واطلب رابطاً جديداً.</div><button class="btn secondary" data-action="cancelPasswordReset">العودة إلى الدخول</button>')+'</div></div>';
}
async function sendPasswordReset(){
 const email=$('#recoverEmail')?.value?.trim();
 if(!email||!s.client)return;
 try{
  const {error}=await s.client.auth.resetPasswordForEmail(email,{
   redirectTo:'https://noone07710-sys.github.io/raafatSys/'
  });
  if(error)throw error;
  toast('إذا كان البريد مسجلاً، سيصلك رابط استعادة كلمة المرور. افحص الوارد والرسائل غير المرغوبة.');
  s.resetRequest=false;render();
 }catch(e){toast('تعذر إرسال رابط الاستعادة: '+e.message,true)}
}
async function saveNewPassword(){
 const password=$('#newPassword')?.value||'',confirm=$('#confirmPassword')?.value||'';
 if(password.length<12)return toast('اختَر كلمة مرور لا تقل عن 12 حرفاً',true);
 if(password!==confirm)return toast('تأكيد كلمة المرور غير متطابق',true);
 if(!s.client||!s.session)return toast('جلسة الاستعادة غير صالحة، اطلب رابطاً جديداً',true);
 try{
  const {error}=await s.client.auth.updateUser({password});
  if(error)throw error;
  s.passwordRecovery=false;s.resetRequest=false;
  if(window.history?.replaceState)window.history.replaceState(null,'',window.location.pathname);
  toast('تم تعيين كلمة المرور الجديدة بنجاح');
  await load();
 }catch(e){toast(e.message,true)}
}
function authPage(){return '<div class="welcome"><div class="authbox"><h1>رأفت <span style="color:#167683">Sys.</span></h1><p class="muted">نظام الإدارة المتكامل للدعاية والإعلان</p><p class="subtle">ربط قاعدة البيانات الخاصة بالشركة وتسجيل دخول الموظفين</p>'+ (s.error?'<div class="error">'+E(s.error)+'</div>':'')+
 '<form id="connectForm"><input type="hidden" id="url" value="'+E(s.config?.url||'')+'"><input type="hidden" id="key" value="'+E(s.config?.key||'')+'"><label class="field"><span>البريد الإلكتروني</span><input id="email" type="email" autocomplete="username" required></label><label class="field"><span>كلمة المرور</span><input id="password" type="password" autocomplete="current-password" required></label><button class="btn" type="submit">دخول النظام</button></form><button class="linkbtn" data-action="forgotPassword" type="button">نسيت كلمة المرور؟</button><hr><button class="btn secondary" style="width:100%" data-action="demo">تجربة الواجهة بدون حفظ البيانات</button><p class="subtle" style="margin-top:14px">المعاينة مؤقتة وتُمحى بياناتها بمجرد تحديث الصفحة. لا تدخل معلومات حقيقية فيها.</p></div></div>';}

const NAV_GROUPS=[
 {id:'customers',title:'الزبائن والإعلانات',subtitle:'العملاء والحجوزات والعقود',icon:'♙',items:[
  ['customers','العملاء','♟'],
  ['packages','الباقات الإعلانية','◈'],
  ['campaigns','المشاريع والحملات','✦'],
  ['customer_contracts','عقود الزبائن','▣'],
  ['ad_sites','المواقع الإعلانية','⌖'],
  ['campaign_payments','دفعات الحملات','◉']
 ]},
 {id:'landlords',title:'مؤجّرو الأسطح والبنايات',subtitle:'المالكون والعقارات والإيجارات',icon:'▥',items:[
  ['landlords','مالكو الأسطح والبنايات','▣'],
  ['properties','الأسطح والعقارات','▤'],
  ['leases','عقود مالكي الأسطح','▧'],
  ['lease_installments','دفعات إيجار الأسطح','◉']
 ]}
];
function navGroupForView(view){return NAV_GROUPS.find(group=>group.items.some(item=>item[0]===view))?.id||null;}
function navLink(id,label,icon){
 const active=id===s.view;
 return '<button type="button" data-nav="'+id+'" class="nav-link'+(active?' active':'')+'"'+(active?' aria-current="page"':'')+'><span class="nav-link-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span></button>';
}
function navGroup(group){
 const expanded=s.navExpanded===group.id,contains=navGroupForView(s.view)===group.id;
 return '<div class="nav-group'+(contains?' has-active':'')+'"><button type="button" class="nav-group-toggle'+(expanded?' expanded':'')+'" data-nav-group="'+group.id+'" aria-expanded="'+expanded+'" aria-controls="nav-group-'+group.id+'"><span class="nav-group-icon" aria-hidden="true">'+group.icon+'</span><span class="nav-group-copy"><strong>'+group.title+'</strong><small>'+group.subtitle+'</small></span><span class="nav-group-chevron" aria-hidden="true">⌄</span></button><div class="nav-group-items" id="nav-group-'+group.id+'" role="group" aria-label="'+group.title+'"'+(expanded?'':' hidden')+'>'+group.items.map(([id,label,icon])=>navLink(id,label,icon)).join('')+'</div></div>';
}
function nav(){
 return navLink('dashboard','الرئيسية','◫')+
  '<div class="nav-group-list">'+NAV_GROUPS.map(navGroup).join('')+'</div>'+
  '<div class="nav-utility"><small class="nav-utility-label">الإدارة العامة</small>'+
  navLink('reports','التقارير','▥')+navLink('settings','الإعدادات','⚙')+'</div>';
}
function changeNavGroup(id){
 if(!NAV_GROUPS.some(x=>x.id===id))return;
 s.navExpanded=s.navExpanded===id?null:id;
 // Keep the selected page and its inputs as-is; update only the sidebar.
 const sidebar=$('.nav');
 if(sidebar){sidebar.innerHTML=nav();bindNav();}else render();
}
function bindNav(){
 document.querySelectorAll('[data-nav]').forEach(x=>x.onclick=()=>{
  s.view=x.dataset.nav;
  s.navExpanded=navGroupForView(s.view);
  s.search='';s.filter='all';s.modal=null;
  render();
 });
 document.querySelectorAll('[data-nav-group]').forEach(x=>x.onclick=()=>changeNavGroup(x.dataset.navGroup));
}
function shell(content){
 return '<div class="shell"><aside class="sidebar"><div class="brand">رأفت <span style="color:#8fd6c8">SYS</span><small>الدعاية والإعلان والتجارة العامة</small></div><div class="nav">'+nav()+'</div><div class="asidefoot">'+(s.demo?'وضع المعاينة — لا يتم حفظ أي معلومات':'اتصال آمن — حساب موظف')+'</div></aside><main class="main"><header class="top"><div><h1>'+E(s.view==='dashboard'?'لوحة التحكم':s.view==='reports'?'التقارير':s.view==='settings'?'الإعدادات':defs[s.view]?.title||'النظام')+'</h1><small>نظام إدارة شركة رأفت</small></div><div class="inline"><label class="currency-switch">عرض الأسعار <select id="globalCurrency"><option value="IQD" '+(s.displayCurrency==='IQD'?'selected':'')+'>IQD — دينار</option><option value="USD" '+(s.displayCurrency==='USD'?'selected':'')+'>USD — دولار</option></select></label><span class="pill">'+(s.demo?'تجريبي':'متصل')+'</span><button class="btn secondary mini" data-action="logout">'+(s.demo?'خروج':'تسجيل خروج')+'</button></div></header><section class="content">'+(s.error?'<div class="error">'+E(s.error)+'</div>':'')+(s.demo?'<div class="notice">وضع تجربة مؤقت — بيانات المعاينة غير محفوظة. لا تدخل معلومات حساسة هنا.</div>':'')+(s.loading?'<p>جارٍ تحميل البيانات...</p>':content)+'</section></main></div>';
}
const visibleTable=(k)=>s.data[k]||[];
function dashboard(){
 let due=s.data.lease_installments.filter(x=>Number(x.paid_amount)<Number(x.amount)&&x.due_date<=today()).length;
 let paid=s.data.campaign_payments.reduce((a,x)=>a+convert(x.amount,originalCurrency('campaign_payments',x),s.displayCurrency),0);
 const active=s.data.customers.filter(x=>x.status==='active').length;
 return '<div class="cards">'+[['العملاء',s.data.customers.length],['الحملات',s.data.campaigns.length],['عقود الزبائن',s.data.customer_contracts.length],['عقود مالكي الأسطح',s.data.leases.length]].map(([t,n])=>'<div class="box stat"><small>'+t+'</small><b>'+fmt(n)+'</b></div>').join('')+'</div><div class="box"><h2>ملخص النشاط المرتبط</h2><div class="summary"><div><small>العملاء الفعالون</small><b>'+active+'</b></div><div><small>مالكو الأسطح / العقارات</small><b>'+s.data.landlords.length+' / '+s.data.properties.length+'</b></div><div><small>إجمالي دفعات الحملات المحوّل</small><b>'+E(money(paid,s.displayCurrency))+'</b></div><div><small>سعر الدولار المحدد في الإعدادات</small><b>'+fmt(s.settings.usd_iqd)+' د.ع</b></div></div><p class="subtle" style="margin-top:15px">جميع مبالغ العرض تتبدّل فوراً من قائمة العملة بالأعلى؛ المبالغ الأصلية للعقود والدفعات لا تتغير.</p></div>';
}
const columns={
 customers:[['name','العميل'],['phone','الهاتف'],['preferred_package_id','الباقة المطلوبة'],['rental_address','العنوان'],['status','الحالة'],['campaign_count','الحملات']],
 packages:[['code','الرمز'],['name','الباقة'],['package_type','النوع'],['width_m','العرض م'],['height_m','الطول م'],['area_m2','م²'],['default_months','الأشهر'],['price','السعر']],
 landlords:[['name','المالك'],['phone','الهاتف'],['governorate','المحافظة'],['properties_count','العقارات']],
 properties:[['title','السطح'],['landlord_id','المالك'],['width_m','العرض م'],['height_m','الطول م'],['area_m2','المساحة م²'],['quantity','العدد']],
 ad_sites:[['code','الرمز'],['name','الموقع'],['site_type','النوع'],['governorate','المحافظة'],['active','الحالة'],['rooftop_property_id','العقار المرتبط']],
 leases:[['contract_number','رقم العقد'],['landlord_id','المالك'],['property_id','العقار'],['rent_total','الإيجار'],['lease_balance','المتبقي'],['end_date','النهاية']],
 campaigns:[['title','الحملة'],['customer_id','العميل'],['package_id','الباقة'],['sites','المواقع'],['price','السعر'],['campaign_balance','المتبقي']],
 campaign_payments:[['campaign_id','الحملة'],['paid_at','التاريخ'],['amount','الدفعة']],
 customer_contracts:[['contract_number','رقم العقد'],['customer_id','الزبون'],['package_id','الباقة'],['contract_type','النوع'],['start_date','من'],['end_date','إلى'],['amount','القيمة']],
 lease_installments:[['lease_id','العقد'],['due_date','تاريخ الاستحقاق'],['amount','المبلغ'],['paid_amount','المدفوع']]
};
function showVal(k,row,f){
 let v=row[f];
 if(f==='status')return '<span class="pill '+E(v)+'">'+E(labels[v]||v)+'</span>';
 if(f==='site_type'||f==='contract_type'||f==='package_type')return E(labels[v]||v);
 if(f==='area_m2')return v==null?'—':E(fmt(v))+' م²';
 if(f==='preferred_package_id')return E(nameOf('packages',v));
 if(f==='active')return '<span class="pill '+(v?'active':'inactive')+'">'+E(v?'متاح':'غير متاح')+'</span>';
 if(f==='campaign_count')return fmt(s.data.campaigns.filter(x=>x.customer_id===row.id).length);
 if(f==='properties_count')return fmt(s.data.properties.filter(x=>x.landlord_id===row.id).length);
 if(f==='sites')return E(linkedSites(row.id).map(x=>x.code+' — '+x.name).join('، ')||row.locations||'—');
 if(f==='campaign_balance')return displayMoney(campaignBalance(row),row.currency);
 if(f==='lease_balance')return displayMoney(leaseBalance(row),row.currency);
 if(f==='landlord_id')return E(nameOf('landlords',v));
 if(f==='customer_id')return E(nameOf('customers',v));
 if(f==='property_id')return E(nameOf('properties',v));
 if(f==='rooftop_property_id')return E(v?nameOf('properties',v):'—');
 if(f==='package_id')return E(nameOf('packages',v));
 if(f==='site_id')return E(nameOf('ad_sites',v));
 if(f==='campaign_id')return E(nameOf('campaigns',v));
 if(f==='lease_id')return E(lookup('leases',v)?.contract_number||'—');
 if(f==='price'&&k==='packages')return displayMoney(v,originalCurrency(k,row))+(row.pricing_mode==='sqm_month'?'<small class="original-amount">للمتر المربع شهرياً (حسب المدة الافتراضية)</small>':'<small class="original-amount">للقطعة / كامل المدة الافتراضية</small>');
 if(['price','rent_total','amount','paid_amount'].includes(f))return displayMoney(v,originalCurrency(k,row));
 return E(v);
}
function listing(k){
 const rows=visibleTable(k).filter(x=>{
  let q=s.search.trim().toLocaleLowerCase(),match=!q||JSON.stringify(x).toLocaleLowerCase().includes(q)||
   (x.landlord_id&&nameOf('landlords',x.landlord_id).toLocaleLowerCase().includes(q))||
   (x.customer_id&&nameOf('customers',x.customer_id).toLocaleLowerCase().includes(q));
  return match&&(k!=='customers'||s.filter==='all'||x.status===s.filter);
 });
 let labelsBy={lease_installments:'إضافة دفعة يدوية',campaign_payments:'تسجيل دفعة'};
 return (k==='packages'?packageCatalog():'')+(k==='leases'?'<div class="notice">هذه العقود بين شركة رأفت ومالكي البنايات لاستئجار الأسطح فقط، وليست عقود الزبائن.</div>':k==='customer_contracts'?'<div class="notice">عقود الزبائن للكابينات أو الأسطح تُنشأ من الباقات الإعلانية، وهي مستقلة عن عقود ملاك البنايات.</div>':'')+'<div class="toolbar"><div class="filters"><input class="search" style="width:min(320px,85vw)" id="search" placeholder="بحث في السجلات..." value="'+E(s.search)+'">'+(k==='customers'?'<select id="statusfilter" class="search" style="width:150px">'+[['all','جميع الحالات'],['active','فعال'],['inactive','غير فعال'],['inquiry','استفسار']].map(([v,t])=>'<option value="'+v+'" '+(s.filter===v?'selected':'')+'>'+t+'</option>').join('')+'</select>':'')+'</div><button class="btn" data-new="'+k+'">+ '+(labelsBy[k]||'إضافة جديد')+'</button></div><div class="box tablewrap"><table class="table"><thead><tr>'+columns[k].map(x=>'<th>'+x[1]+'</th>').join('')+'<th>إجراءات</th></tr></thead><tbody>'+ (rows.length?rows.map(row=>'<tr>'+columns[k].map(([f])=>'<td>'+showVal(k,row,f)+'</td>').join('')+'<td><button class="linkbtn" data-edit="'+k+':'+row.id+'">تفاصيل / تعديل</button>'+(k==='leases'||k==='customer_contracts'?'<button class="linkbtn" data-print-record="'+k+'|'+row.id+'">🖨 طباعة العقد</button>':'')+'</td></tr>').join(''):'<tr><td colspan="9" class="empty">لا توجد سجلات مطابقة</td></tr>')+'</tbody></table></div><p class="subtle" style="margin-top:13px">عدد السجلات الظاهرة: '+rows.length+'. يتم تحميل كل السجلات الموجودة حالياً بالقاعدة.</p>';
}

function reports(){
 const counts=[['جميع العملاء',s.data.customers.length],['فعال',s.data.customers.filter(x=>x.status==='active').length],['غير فعال',s.data.customers.filter(x=>x.status==='inactive').length],['استفسار',s.data.customers.filter(x=>x.status==='inquiry').length]];
 const receipts=s.data.campaign_payments.reduce((total,p)=>total+convert(p.amount,originalCurrency('campaign_payments',p),s.displayCurrency),0);
 const outstanding=s.data.campaigns.reduce((total,v)=>total+convert(campaignBalance(v),v.currency,s.displayCurrency),0);
 const rents=s.data.lease_installments.reduce((total,v)=>total+convert(Math.max(0,Number(v.amount)-Number(v.paid_amount)),originalCurrency('lease_installments',v),s.displayCurrency),0);
 const late=s.data.lease_installments.filter(x=>x.due_date<=today()&&Number(x.paid_amount)<Number(x.amount));
 return '<div class="cards">'+counts.map(([a,b])=>'<div class="box stat"><small>'+a+'</small><b>'+b+'</b></div>').join('')+'</div><div class="box"><h2>التقرير المالي المترابط</h2><div class="summary"><div><small>الدفعات المستلمة من الحملات</small><b>'+E(money(receipts,s.displayCurrency))+'</b></div><div><small>الذمم المتبقية على العملاء</small><b>'+E(money(outstanding,s.displayCurrency))+'</b></div><div><small>أقساط الإيجار غير المسددة</small><b>'+E(money(rents,s.displayCurrency))+'</b></div><div><small>أقساط إيجار مستحقة حتى اليوم</small><b>'+late.length+'</b></div></div><p class="subtle" style="margin-top:12px">التقرير يعرض بالعملة المختارة بالأعلى وبسعر الصرف المحدد في الإعدادات؛ العقود والدفعات تبقى بعملتها الأصلية.</p><hr><h2>تقرير العملاء</h2><p class="muted">تصدير CSV يتضمن بيانات هوية حساسة — احفظ التقرير بشكل آمن.</p><button class="btn" data-action="exportCustomers">تصدير العملاء CSV</button><hr><h2>التقارير المالية</h2><div class="inline"><button class="btn secondary" data-action="exportCampaigns">تصدير الحملات</button><button class="btn secondary" data-action="exportInstallments">تصدير أقساط الإيجار</button></div></div>';
}

function settings(){
 const editable=s.demo||s.staff?.role==='admin';
 const val=key=>E(s.settings?.[key]??COMPANY_DEFAULTS[key]??'');
 const field=(name,label,type='text',placeholder='',required=false)=>
  '<label class="field"><span>'+label+(required?' *':'')+'</span><input name="'+name+'" type="'+type+'" maxlength="250" '+(required?'required':'')+' value="'+val(name)+'" placeholder="'+E(placeholder)+'"></label>';
 const logo=companyLogoUrl();
 return '<div class="settings-page">'+
  '<div class="settings-intro"><div><span class="settings-eyebrow">RAAFAT SYS · CONFIGURATION</span><h2>هوية الشركة وإعدادات النظام</h2><p>عدّل بيانات الشركة مرة واحدة، وتظهر في القائمة الرئيسية والعقود المطبوعة تلقائياً.</p></div><span class="settings-state">'+(s.demo?'وضع تجريبي':editable?'صلاحية المدير':'عرض فقط')+'</span></div>'+
  '<div class="settings-layout"><div class="settings-main"><form id="settingsForm">'+
   '<section class="settings-panel"><div class="settings-section-title"><span class="settings-section-icon">◈</span><div><h3>الهوية والعلامة التجارية</h3><p>الاسم الرسمي المختص بالعقود والاسم المختصر الظاهر بالقائمة</p></div></div>'+
    '<div class="formgrid">'+field('company_name','اسم الشركة الرسمي','text','اسم الشركة كما يظهر على العقد',true)+field('company_short_name','الاسم المختصر','text','مثال: رأفت',true)+
    '<label class="field full"><span>الوصف المختصر / الشعار النصي</span><input name="company_tagline" maxlength="250" type="text" value="'+val('company_tagline')+'" placeholder="للدعاية والإعلان والتجارة العامة"></label></div>'+
    '<div class="settings-logo-row"><div class="settings-logo-visual" id="settingsLogoPreview">'+(logo?'<img id="settingsLogoImage" src="'+E(logo)+'" alt="شعار الشركة الحالي"><span id="settingsLogoFallback" hidden>'+E(String(companyValue('company_short_name')).trim().slice(0,1))+'</span>':'<img id="settingsLogoImage" alt="معاينة الشعار" hidden><span id="settingsLogoFallback">'+E(String(companyValue('company_short_name')).trim().slice(0,1))+'</span>')+'</div>'+
    '<div class="settings-logo-fields"><h4>شعار الشركة</h4><p>ارفع شعار PNG أو JPG أو WebP بحجم حتى 4MB. يُفضّل شعار واضح بخلفية شفافة؛ سيظهر داخل النظام والعقود.</p>'+
    '<label class="settings-file-button" for="companyLogoFile">اختيار ملف الشعار</label><input type="file" id="companyLogoFile" name="company_logo_file" accept="image/png,image/jpeg,image/webp" class="settings-file-input"'+(editable?'':' disabled')+'>'+
    '<small id="settingsLogoFilename">'+(logo?'الشعار الحالي محفوظ':'لم يُرفع شعار بعد')+'</small>'+
    (logo?'<button type="button" class="settings-remove-logo" data-action="removeCompanyLogo">إزالة الشعار</button>':'')+
    '<input type="hidden" name="remove_logo" id="removeCompanyLogo" value="false"></div></div>'+
   '</section>'+
   '<section class="settings-panel"><div class="settings-section-title"><span class="settings-section-icon">⌖</span><div><h3>التواصل والموقع</h3><p>معلومات التواصل الرسمية التي تظهر في ترويسة العقد</p></div></div>'+
    '<div class="formgrid">'+field('company_phone','رقم الهاتف','tel','07XXXXXXXXX')+field('company_whatsapp','رقم واتساب','tel','9647XXXXXXXXX')+
    field('company_email','البريد الإلكتروني','email','company@example.com')+field('company_website','الموقع الإلكتروني','url','https://example.com')+
    field('company_governorate','المحافظة','text','صلاح الدين')+field('company_city','المدينة','text','تكريت')+
    '<label class="field full"><span>العنوان التفصيلي</span><textarea name="company_address" maxlength="500" rows="2" placeholder="الشارع، المنطقة، أقرب نقطة دالة">'+val('company_address')+'</textarea></label>'+
    '<label class="field full"><span>رقم التسجيل / السجل التجاري (اختياري)</span><input name="company_registration" maxlength="250" type="text" value="'+val('company_registration')+'"></label></div>'+
   '</section>'+
   '<section class="settings-panel"><div class="settings-section-title"><span class="settings-section-icon">$</span><div><h3>المالية وسعر الصرف</h3><p>تحويل الدولار والدينار في الباقات والحملات والدفعات دون تغيير أصل المبلغ</p></div></div>'+
    '<div class="formgrid"><label class="field"><span>سعر الدولار: 1 USD = كم IQD؟</span><input name="usd_iqd" type="number" min=".0001" step="any" required value="'+E(s.settings.usd_iqd)+'"></label><div class="settings-rate-note"><small>سعر الصرف المعتمد حالياً</small><strong>1 USD = '+E(fmt(s.settings.usd_iqd))+' IQD</strong></div></div>'+
   '</section>'+
   (editable?'<div class="settings-savebar"><div><strong>حفظ إعدادات الشركة</strong><small>التغييرات تُحدَّث على الواجهة والعقود بعد الحفظ.</small></div><button class="btn" type="submit">حفظ كل الإعدادات</button></div>':
    '<div class="notice">عرض فقط: تعديل معلومات الشركة والشعار وسعر الصرف متاح للمدير الرئيسي.</div>')+
  '</form></div>'+
  '<aside class="settings-preview-column"><div class="settings-preview-card"><small class="settings-preview-kicker">LIVE PREVIEW</small><h3>معاينة هوية الشركة</h3><div class="settings-preview-logo" id="settingsBrandPreview">'+companyLogoHtml('preview')+'</div><b id="settingsPreviewName">'+E(companyValue('company_name'))+'</b><p id="settingsPreviewTagline">'+E(companyValue('company_tagline'))+'</p><div class="settings-preview-contact" id="settingsPreviewContact">'+E([companyValue('company_governorate'),companyValue('company_city'),companyValue('company_phone')].filter(Boolean).join(' • ')||'بيانات التواصل تظهر هنا بعد إضافتها')+'</div><hr><span class="settings-preview-note">تظهر الهوية عند الطباعة وفي القائمة الرئيسية.</span></div></aside>'+
  '</div></div>';
}
function accessDenied(){return '<div class="welcome"><div class="authbox"><h1>الصلاحية غير مفعلة</h1><p class="muted">تم تسجيل الدخول، لكن حسابك غير مضاف إلى موظفي نظام رأفت.</p><div class="notice">يجب إضافة معرّف حسابك إلى جدول staff_members من لوحة Supabase بدور admin أو staff، ثم تسجيل الدخول مجدداً.</div><button class="btn" data-action="logout">تسجيل خروج</button></div></div>'}
function render(){
 let target=$('#app');
 let content=s.view==='dashboard'?dashboard():s.view==='reports'?reports():s.view==='settings'?settings():listing(s.view);
 if(s.passwordRecovery){target.innerHTML=passwordRecoveryPage();}
 else if(s.resetRequest){target.innerHTML=passwordResetRequestPage();}
 else if(!s.demo&&!s.session){target.innerHTML=authPage();}
 else if(!s.demo&&!s.staff&&!s.loading){target.innerHTML=accessDenied();}
 else{target.innerHTML=shell(content)+(s.modal?modalHtml():'');}
 bind();
}
function optionText(k,x){return k==='landlords'||k==='customers'?x.name:k==='properties'?x.title+' — '+nameOf('landlords',x.landlord_id):k==='packages'?x.name+' ('+x.code+' / '+(labels[x.package_type]||x.package_type||'')+')':k==='ad_sites'?x.code+' — '+x.name:k==='leases'||k==='customer_contracts'?x.contract_number:k==='campaigns'?x.title+' — '+nameOf('customers',x.customer_id):'—';}

function fieldCurrency(k,v){
 if(k==='campaign_payments')return v.entry_currency||lookup('campaigns',v.campaign_id)?.currency||s.displayCurrency;
 if(k==='lease_installments')return v.entry_currency||lookup('leases',v.lease_id)?.currency||s.displayCurrency;
 return v.currency||s.displayCurrency;
}
function moneyHint(n,currency){
 if(n===''||n===null||n===undefined||!Number.isFinite(Number(n)))return 'سيظهر المبلغ المقابل هنا';
 let other=currency==='USD'?'IQD':'USD';
 return 'يعادل '+money(roundAmount(convert(n,currency,other)),other)+' • السعر: 1$ = '+fmt(s.settings.usd_iqd)+' د.ع';
}

function packageRatesEditor(){
 const pkg=s.modal?.data||{},mode=pkg.pricing_mode||'fixed_term',cur=pkg.currency||'USD';
 const months=mode==='sqm_month'?[1,3,6,12]:[3,6,12];
 return '<div class="full tier-editor"><h3>تعرفة الباقة حسب مدة الحجز</h3><p class="subtle">'+(mode==='sqm_month'?'السعر هنا للمتر المربع الواحد شهرياً؛ الناتج النهائي يضرب بالمساحة وعدد الأشهر.':'السعر هنا للقطعة الواحدة وللمدة كاملة، ولا يُقسم أو يُضرب بالأشهر.')+' جميع الأسعار تُحفظ مرجعياً بالدولار، ويمكن إدخالها بالعملة المختارة.</p><div class="formgrid">'+months.map(m=>{
  const rate=packageRate(lookup('packages',pkg.id),m);
  const original=s.modal.rateDraft?.[m]??(rate?roundAmount(convert(rate.usd_price,'USD',cur)):m===Number(pkg.default_months)?pkg.price:'');
  return '<label class="field"><span>'+m+' '+(m===1?'شهر':'أشهر')+' — '+(mode==='sqm_month'?'لكل م² شهرياً':'للإعلان كامل المدة')+'</span><input type="number" min="0" step="0.01" data-package-rate-month="'+m+'" value="'+E(original)+'" placeholder="أدخل السعر"><small class="conversion-hint" data-rate-hint="'+m+'">'+E(moneyHint(original,cur))+'</small></label>';
 }).join('')+'</div></div>';
}
function packagePricingInfo(v){
 const pkg=lookup('packages',v.package_id);
 if(!pkg)return '<div class="notice full">اختر الباقة أولاً لعرض مددها وأسعارها.</div>';
 let q=quoteCampaign(v,s.modal?.siteIds||[]);
 let formula=pkg.pricing_mode==='sqm_month'?
  'المساحة ('+fmt(q?.area||Number(v.requested_area_m2)||campaignSiteArea(s.modal?.siteIds||[]))+' م²) × سعر المتر الشهري × '+Number(v.months||0)+' أشهر':
  'سعر القطعة لمدة '+Number(v.months||0)+' أشهر × '+Math.max(1,Number(v.quantity)||1,s.modal?.siteIds?.length||0)+' قطعة';
 return '<div class="notice full"><b>'+E(pkg.name)+'</b> · '+E(formula)+'<div style="margin-top:6px">'+(q?'<strong>'+E(money(q.total,v.currency||'USD'))+'</strong> <small>('+E(money(q.usd,'USD'))+')</small>':'<b>الرجاء اختيار مدة صحيحة'+(pkg.pricing_mode==='sqm_month'?' وإدخال مساحة الإعلان':'')+'</b>')+'</div></div>';
}


function quoteCustomerContract(v){
 const pkg=lookup('packages',v.package_id);
 if(!pkg)return null;
 const months=Number(v.duration_months||pkg.default_months||3);
 const area=Number(v.rented_area_m2)>0?Number(v.rented_area_m2):0;
 const usd=quotePackageUSD(pkg,months,1,area);
 return usd===null?null:{usd,amount:roundAmount(convert(usd,'USD',v.currency||'USD')),area,months};
}
function refreshCustomerContractQuote(){
 if(s.modal?.table!=='customer_contracts'||s.modal?.data?.id||s.modal?.data?.campaign_id)return;
 const v=s.modal.data;
 const quote=quoteCustomerContract(v);
 v.amount=quote?quote.amount:0;
 if(v.start_date&&v.duration_months)v.end_date=addDays(plusMonths(v.start_date,Number(v.duration_months)),-1);
}
function customerPricingInfo(v){
 const pkg=lookup('packages',v.package_id);
 if(!pkg)return '<p class="notice">حدد باقة إعلان حتى يظهر سعر عقد الزبون.</p>';
 const quote=quoteCustomerContract(v);
 return '<div class="notice"><b>تسعيرة الباقة:</b> '+E(pkg.pricing_mode==='sqm_month'?'سعر المتر الشهري × المساحة × الأشهر':'سعر القطعة لكامل المدة')+' · '+E(v.duration_months||pkg.default_months)+' أشهر'+(pkg.pricing_mode==='sqm_month'?' · '+E(v.rented_area_m2||'—')+' م²':'')+'<div>'+E(quote?money(quote.amount,v.currency||'USD'):'أدخل مساحة الإعلان المطلوبة كي يظهر السعر')+'</div></div>';
}

function fieldHtml(f,v,all){
 let [id,label,type,required,opts]=f, val=v?.[id]??'',req=required?'required':'',k=s.modal?.table;
 if(k==='packages'&&v.pricing_mode==='sqm_month'&&['width_m','height_m','area_m2'].includes(id))return '';
 if(k==='customer_contracts'&&id==='rented_area_m2'&&lookup('packages',v.package_id)?.pricing_mode!=='sqm_month')return '';
 if(k==='customer_contracts'&&id==='duration_months'&&v.package_id){const pack=lookup('packages',v.package_id);return '<label class="field"><span>مدة عقد الزبون</span><select name="duration_months" required>'+packageMonths(pack).map(m=>'<option value="'+m+'" '+(Number(val)===m?'selected':'')+'>'+m+' '+(m===1?'شهر':'أشهر')+'</option>').join('')+'</select></label>';}
 if(k==='campaigns'&&id==='quantity'&&lookup('packages',v.package_id)?.pricing_mode==='sqm_month')return '';
 if(k==='campaigns'&&id==='requested_area_m2'&&lookup('packages',v.package_id)?.pricing_mode!=='sqm_month')return '';
 if(k==='campaigns'&&id==='months'&&v.package_id){const pack=lookup('packages',v.package_id);return '<label class="field"><span>مدة الإعلان بالأشهر</span><select name="months" required>'+packageMonths(pack).map(m=>'<option value="'+m+'" '+(Number(val)===m?'selected':'')+'>'+m+' '+(m===1?'شهر':'أشهر')+'</option>').join('')+'</select></label>';}
 if(type==='computed')return '<label class="field"><span>'+E(label)+'</span><output class="computed-area" data-area-output>'+E(fmt(Number(v?.width_m||0)*Number(v?.height_m||0)))+' م²</output><small class="subtle">تُحسب تلقائياً: الطول × العرض</small></label>';
 if(k==='customer_contracts'&&id==='contract_type'){const type=lookup('packages',v.package_id)?.package_type||v.contract_type||'cabin';return '<label class="field"><span>نوع العقد من الباقة الإعلانية</span><output class="computed-area">'+E(labels[type]||type)+'</output><input type="hidden" name="contract_type" value="'+E(type)+'"></label>';}
 if(type==='file')return '<label class="field full"><span>'+E(label)+' — PNG/JPEG/WebP حتى 5MB</span><input name="'+id+'" type="file" accept="image/png,image/jpeg,image/webp"><span class="subtle">'+(v?.card_image_path?'صورة محفوظة خاصة':'ترفع إلى مساحة خاصة بعد الحفظ')+'</span></label>';
 if(type==='textarea')return '<label class="field full"><span>'+E(label)+'</span><textarea name="'+id+'">'+E(val)+'</textarea></label>';
 if(type.startsWith('lookup:')){
  let table=type.slice(7),rows=s.data[table].filter(x=>{
   if(id==='property_id'&&all?.landlord_id)return x.landlord_id===all.landlord_id;
   if(k==='customer_contracts'&&id==='campaign_id'&&all?.customer_id)return x.customer_id===all.customer_id;
   if(k==='customer_contracts'&&id==='site_id'&&all?.campaign_id){
    const ids=s.data.campaign_sites.filter(link=>link.campaign_id===all.campaign_id).map(link=>link.site_id);
    return !ids.length||ids.includes(x.id)||x.id===all.site_id;
   }
   return true;
  });
  return '<label class="field"><span>'+E(label)+(required?' *':'')+'</span><select name="'+id+'" '+req+'><option value="">— اختر —</option>'+rows.map(x=>'<option value="'+E(x.id)+'" '+(val===x.id?'selected':'')+'>'+E(optionText(table,x))+'</option>').join('')+'</select></label>';
 }
 if(type==='select')return '<label class="field"><span>'+E(label)+'</span><select name="'+id+'" '+req+'>'+opts.map(x=>'<option value="'+x+'" '+(String(val)===String(x)?'selected':'')+'>'+E(labels[x]||x)+'</option>').join('')+'</select></label>';
 let monetary=['price','rent_total','amount','paid_amount','initial_payment_amount'].includes(id);
 let extra=type==='number'?'min="0" step="'+(['months','default_months','quantity','grace_days'].includes(id)?'1':'0.01')+'"':type==='tel'?'inputmode="numeric" pattern="[0-9]{11}" maxlength="11"':id==='national_id'?'inputmode="numeric" pattern="[0-9]{12}" maxlength="12"':'';
 return '<label class="field"><span>'+E(label)+(required?' *':'')+'</span><input name="'+id+'" type="'+type+'" '+req+' '+extra+' value="'+E(val)+'">'+(monetary?'<small class="conversion-hint" data-money-hint="'+id+'">'+E(moneyHint(val,fieldCurrency(k,v)))+'</small>':'')+'</label>';
}
function selectedSiteCards(v){
 const selected=s.modal?.siteIds||[];
 const rows=s.data.ad_sites.filter(x=>x.active!==false||selected.includes(x.id));
 if(!rows.length)return '<div class="notice full">لا توجد مواقع مسجلة بعد. أضف المواقع من قسم «المواقع الإعلانية» أولاً، ثم اربطها بهذه الحملة.</div>';
 return '<div class="full"><strong>اختيار المواقع الإعلانية المرتبطة بالحملة</strong><p class="subtle">حدد موقعاً واحداً أو أكثر؛ كل موقع مرتبط بسجله ومعلوماته.</p><div class="site-picker">'+rows.map(x=>'<label class="site-option"><input type="checkbox" data-site-id="'+E(x.id)+'" '+(selected.includes(x.id)?'checked':'')+'><span><b>'+E(x.code)+' — '+E(x.name)+'</b><small>'+E(labels[x.site_type]||x.site_type)+' · '+E(x.governorate)+' · '+E(x.address)+(x.rooftop_property_id?' · '+E(nameOf('properties',x.rooftop_property_id)):'')+'</small></span></label>').join('')+'</div></div>';
}


function relatedDetails(k,v){
 if(!v?.id)return '';
 const list=(label,rows,table,title)=>rows.length?'<div class="related-group"><strong>'+E(label)+' <span class="pill">'+rows.length+'</span></strong>'+rows.map(x=>'<div class="related-item"><span>'+E(title(x))+'</span><button type="button" class="linkbtn" data-edit="'+table+':'+x.id+'">فتح</button></div>').join('')+'</div>':'';
 let parts='';
 if(k==='customers'){
  parts+=list('حملات هذا العميل',s.data.campaigns.filter(x=>x.customer_id===v.id),'campaigns',x=>x.title+' — '+displayMoneyText(x.price,x.currency));
  parts+=list('عقود هذا الزبون',s.data.customer_contracts.filter(x=>x.customer_id===v.id),'customer_contracts',x=>x.contract_number+' — '+(labels[x.contract_type]||x.contract_type));
  parts+='<div class="inline"><button type="button" class="btn secondary mini" data-new-linked="campaigns|customer_id|'+v.id+'">+ حملة لهذا العميل</button><button type="button" class="btn secondary mini" data-new-linked="customer_contracts|customer_id|'+v.id+'">+ عقد زبون</button></div>';
 }
 if(k==='landlords'){
  parts+=list('الأسطح وأبعاد كل واحد',s.data.properties.filter(x=>x.landlord_id===v.id),'properties',x=>x.title+' / '+(x.width_m&&x.height_m?fmt(x.width_m)+' × '+fmt(x.height_m)+' م = '+fmt(x.area_m2)+' م²':x.dimensions));
  parts+=list('عقود المالك',s.data.leases.filter(x=>x.landlord_id===v.id),'leases',x=>x.contract_number+' — '+displayMoneyText(x.rent_total,x.currency));
  parts+='<button type="button" class="btn secondary mini" data-new-linked="properties|landlord_id|'+v.id+'">+ إضافة عقار للمالك</button>';
 }
 if(k==='properties'){
  parts+=list('مواقع هذا العقار',s.data.ad_sites.filter(x=>x.rooftop_property_id===v.id),'ad_sites',x=>x.code+' — '+x.name);
  parts+=list('عقود هذا العقار',s.data.leases.filter(x=>x.property_id===v.id),'leases',x=>x.contract_number);
  parts+='<button type="button" class="btn secondary mini" data-new-linked="leases|property_id|'+v.id+'">+ عقد للعقار</button>';
 }
 if(k==='packages'){
  parts+=list('الزبائن الراغبون بهذه الباقة',s.data.customers.filter(x=>x.preferred_package_id===v.id),'customers',x=>x.name+' — '+x.phone);
  parts+=list('حملات الباقة',s.data.campaigns.filter(x=>x.package_id===v.id),'campaigns',x=>x.title);
  parts+=list('عقود الزبائن على الباقة',s.data.customer_contracts.filter(x=>x.package_id===v.id),'customer_contracts',x=>x.contract_number);
  parts+='<button type="button" class="btn secondary mini" data-new-linked="customers|preferred_package_id|'+v.id+'">+ إضافة زبون لهذه الباقة</button>';
 }
 if(k==='ad_sites')parts+=list('حملات هذا الموقع',s.data.campaign_sites.filter(x=>x.site_id===v.id).map(x=>lookup('campaigns',x.campaign_id)).filter(Boolean),'campaigns',x=>x.title);
 if(k==='campaigns'){
  parts+=list('عقود الزبائن التابعة للحملة',s.data.customer_contracts.filter(x=>x.campaign_id===v.id),'customer_contracts',x=>x.contract_number);
  parts+=list('دفعات الحملة',s.data.campaign_payments.filter(x=>x.campaign_id===v.id),'campaign_payments',x=>x.paid_at+' — '+displayMoneyText(x.amount,v.currency));
  parts+='<div class="notice">المدفوع: '+E(money(campaignPaid(v.id),v.currency))+' · المتبقي: '+E(money(campaignBalance(v),v.currency))+'</div>';
  parts+='<div class="inline"><button type="button" class="btn secondary mini" data-new-linked="campaign_payments|campaign_id|'+v.id+'">+ تسجيل دفعة للحملة</button><button type="button" class="btn secondary mini" data-new-linked="customer_contracts|campaign_id|'+v.id+'">+ إنشاء عقد زبون لهذه الحملة</button></div>';
 }
 if(k==='customer_contracts'){
   parts+='<div class="notice">هذا عقد بين الشركة والزبون، وليس عقد استئجار السطح من مالك البناية.</div><button type="button" class="btn secondary mini" data-customer-preview="'+v.id+'">معاينة وطباعة عقد الزبون</button>';
 }
 if(k==='leases'){
  parts+=list('استحقاقات العقد',s.data.lease_installments.filter(x=>x.lease_id===v.id).sort((a,b)=>a.due_date.localeCompare(b.due_date)),'lease_installments',x=>x.due_date+' — '+displayMoneyText(x.paid_amount,v.currency)+' / '+displayMoneyText(x.amount,v.currency));
  parts+='<div class="notice">المتبقي في الأقساط: '+E(money(leaseBalance(v),v.currency))+'</div>';
 }
 return parts?'<div class="related-panel"><h3>السجلات المرتبطة</h3>'+parts+'</div>':'';
}



function landlordRoofMarkup(){
 const roofs=s.modal?.roofs||[];
 const rowHtml=roofs.map((r,i)=>'<div class="roof-draft" data-roof-row="'+i+'"><div class="inline"><strong>السطح '+(i+1)+'</strong><button type="button" class="linkbtn" data-remove-roof="'+i+'">حذف السطح</button></div><div class="formgrid"><label class="field full"><span>اسم أو عنوان السطح</span><input required data-roof-field="title" value="'+E(r.title||'')+'" placeholder="مثلاً: سطح بناية شارع الأربعين"></label><label class="field"><span>العرض بالمتر</span><input required type="number" min=".01" step=".01" data-roof-field="width_m" value="'+E(r.width_m||'')+'"></label><label class="field"><span>الطول بالمتر</span><input required type="number" min=".01" step=".01" data-roof-field="height_m" value="'+E(r.height_m||'')+'"></label><div class="field"><span>مساحة هذا السطح</span><output data-roof-area class="computed-area">'+E(fmt(Number(r.width_m||0)*Number(r.height_m||0)))+' م²</output></div><label class="field"><span>العدد</span><input required type="number" min="1" step="1" data-roof-field="quantity" value="'+E(r.quantity||1)+'"></label><label class="field full"><span>ملاحظات السطح</span><textarea data-roof-field="notes">'+E(r.notes||'')+'</textarea></label></div></div>').join('');
 return '<div class="roof-section"><h3>الأسطح التابعة لهذا المالك</h3><p class="subtle">كل سطح يُسجّل بقياسه الخاص (طول وعرض) ويُحسب بالمتر المربع مباشرة، بدون تكرار بيانات المالك. الأسطح المسجلة سابقاً تظهر أسفل بيانات المالك ويمكن تعديل كل واحد منها.</p><div id="roofDrafts">'+rowHtml+'</div><button type="button" class="btn secondary" data-add-roof>+ إضافة سطح بقياس مختلف</button></div>';
}
function captureRoofDrafts(){
 if(s.modal?.table!=='landlords')return;
 const rows=[...document.querySelectorAll('[data-roof-row]')];
 s.modal.roofs=rows.map(row=>{
  const o={};
  row.querySelectorAll('[data-roof-field]').forEach(input=>{o[input.dataset.roofField]=input.value;});
  const original=s.modal.roofs?.[Number(row.dataset.roofRow)];
  if(original?.saved)o.saved=true;
  return o;
 });
}
function updateAreaOutputs(form){
 if(!form)return;
 const width=Number(form.elements.namedItem('width_m')?.value||0);
 const height=Number(form.elements.namedItem('height_m')?.value||0);
 const out=form.querySelector('[data-area-output]');
 if(out)out.textContent=fmt(width*height)+' م²';
 document.querySelectorAll('[data-roof-row]').forEach(row=>{
  const w=Number(row.querySelector('[data-roof-field="width_m"]')?.value||0);
  const h=Number(row.querySelector('[data-roof-field="height_m"]')?.value||0);
  const target=row.querySelector('[data-roof-area]');
  if(target)target.textContent=fmt(w*h)+' م²';
 });
}

function modalHtml(){
 let m=s.modal,k=m.table,v=m.data||{},meta=defs[k];if(m.kind==='preview')return k==='customer_contracts'?customerContractPreview(v):previewHtml(v);
 let fields=meta.fields;
 if(k==='campaigns'){
  const steps=[['العميل والحملة',['customer_id','title']],['الباقة والمواقع',['package_id','locations','quantity','requested_area_m2']],['الأسعار والأشهر',['months','price','currency']],['الدفعات والملاحظات',['notes']],['مراجعة وحفظ',[]]];
  const stepFields=s.formStep<4?fields.filter(x=>steps[s.formStep][1].includes(x[0])).map(f=>fieldHtml(f,v,v)).join('')+(s.formStep===2?packagePricingInfo(v):''):review(v);
  const client=lookup('customers',v.customer_id);
  const extra=s.formStep===0&&client?'<div class="notice full"><b>بيانات العميل:</b> '+E(client.name)+' · '+E(client.phone)+' · '+E(client.rental_address)+' · '+E(labels[client.status]||client.status)+'</div>':
   s.formStep===1?selectedSiteCards(v)+packagePricingInfo(v):
   s.formStep===3&&!v.id?'<label class="field"><span>الدفعة الأولى (اختياري، بنفس عملة الحملة)</span><input type="number" name="initial_payment_amount" min="0" step="0.01" value="'+E(v.initial_payment_amount??'')+'"><small class="conversion-hint" data-money-hint="initial_payment_amount">'+E(moneyHint(v.initial_payment_amount||0,v.currency))+'</small></label><label class="field"><span>تاريخ الدفعة</span><input type="date" name="initial_payment_date" value="'+E(v.initial_payment_date||today())+'"></label>':'';
  return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+(v.id?'تعديل':'إضافة')+' حملة إعلانية</h2><button class="close" data-action="close">✕</button></div><div class="steps">'+steps.map((x,i)=>'<span class="step '+(s.formStep===i?'current':'')+'">'+(i+1)+'. '+x[0]+'</span>').join('')+'</div><form id="recordForm"><div class="formgrid">'+stepFields+extra+'</div><div class="actions">'+(s.formStep>0?'<button type="button" class="btn secondary" data-action="prevStep">السابق</button>':'')+'<button class="btn" type="submit">'+(s.formStep<4?'التالي':'حفظ الحملة')+'</button></div></form>'+relatedDetails('campaigns',v)+'</div></div>';
 }
 if(k==='leases'){
  return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+(v.renewed_from?'تجديد العقد':v.id?'تعديل عقد '+E(v.contract_number):'عقد إيجار جديد')+'</h2><button class="close" data-action="close">✕</button></div><p class="subtle">تُسحب عقارات المالك تلقائياً، وتُولّد الأقساط حسب مدة العقد ودورية الدفع.</p><form id="recordForm"><div class="formgrid">'+fields.map(f=>fieldHtml(f,v,v)).join('')+'</div><div class="actions"><button class="btn" type="submit">'+(v.id?'حفظ التعديلات':'حفظ العقد وإنشاء الدفعات')+'</button></div></form>'+(v.id?'<div class="inline"><button class="btn secondary" data-preview="'+v.id+'">معاينة / طباعة</button><button class="btn secondary" data-renew="'+v.id+'">تجديد العقد</button></div>':'')+relatedDetails(k,v)+'</div></div>';
 }

 if(k==='customer_contracts'){
  const customer=lookup('customers',v.customer_id),pkg=lookup('packages',v.package_id);
  const summary='<div class="notice"><b>الزبون:</b> '+E(customer?.name||'—')+' · <b>الباقة:</b> '+E(pkg?.name||'—')+' · <b>قياسها:</b> '+(pkg?.width_m&&pkg?.height_m?E(fmt(pkg.width_m)+' × '+fmt(pkg.height_m)+' م / '+fmt(pkg.area_m2)+' م²'):'حسب مساحة السطح')+'</div>'+customerPricingInfo(v);
  return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+(v.id?'تعديل عقد '+E(v.contract_number):'إضافة عقد زبون جديد')+'</h2><button class="close" data-action="close">✕</button></div><div class="notice">هذا عقد بين <b>شركة رأفت والزبون</b>، من باقة الكابينات أو الأسطح؛ مختلف عن عقد الشركة مع مالك البناية.</div>'+summary+'<form id="recordForm"><div class="formgrid">'+fields.map(f=>fieldHtml(f,v,v)).join('')+'</div><div class="actions"><button class="btn" type="submit">'+(v.id?'حفظ تعديلات عقد الزبون':'حفظ عقد الزبون')+'</button></div></form>'+(v.id?'<div class="inline"><button class="btn secondary" data-customer-preview="'+v.id+'">معاينة وطباعة العقد</button></div>':'')+relatedDetails(k,v)+'</div></div>';
 }
 if(k==='lease_installments'||k==='campaign_payments'){
  fields=[k==='lease_installments'?['lease_id','العقد','lookup:leases',true]:['campaign_id','الحملة','lookup:campaigns',true],['entry_currency','عملة إدخال المبلغ','select',true,['IQD','USD']],...(k==='lease_installments'?[['due_date','تاريخ الاستحقاق','date',true]]:[['paid_at','تاريخ الدفع','date',true]]),['amount',k==='lease_installments'?'قيمة القسط':'قيمة الدفعة','number',true],...(k==='lease_installments'?[['paid_amount','المبلغ المسدد','number',true]]:[]),['notes','الملاحظات','textarea']];
 }
 return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+ (v.id?'تعديل':'إضافة')+' — '+meta.title+'</h2><button class="close" data-action="close">✕</button></div><form id="recordForm"><div class="formgrid">'+fields.map(f=>fieldHtml(f,v,v)).join('')+'</div>'+(k==='packages'?packageRatesEditor():'')+(k==='landlords'?landlordRoofMarkup():'')+(k==='campaign_payments'||k==='lease_installments'?'<div class="notice" id="paymentParentInfo"></div>':'')+'<div class="actions"><button class="btn" type="submit">حفظ البيانات</button></div></form>'+(k==='landlords'&&v.card_image_path?'<button class="btn secondary mini" data-card="'+v.id+'">عرض صورة البطاقة المرفوعة</button>':'')+relatedDetails(k,v)+'</div></div>';
}

function review(v){
 let ids=s.modal?.siteIds||[],names=ids.map(id=>lookup('ad_sites',id)).filter(Boolean).map(x=>x.code+' — '+x.name).join('، ');
 return '<div class="summary full">'+[['العميل',nameOf('customers',v.customer_id)],['الحملة',v.title],['الباقة',nameOf('packages',v.package_id)],['المواقع المختارة',names||v.locations||'—'],['الأشهر',v.months],['السعر الأصلي',money(v.price,v.currency)],['ما يعادله',money(equivalent(v.price,v.currency),s.displayCurrency)],['الدفعة الأولى',money(v.initial_payment_amount||0,v.currency)],['الملاحظات',v.notes]].map(([a,b])=>'<div><small>'+E(a)+'</small><b>'+E(b||'—')+'</b></div>').join('')+'</div>';
}


function customerContractPreview(v){
 const customer=lookup('customers',v.customer_id),pkg=lookup('packages',v.package_id),site=lookup('ad_sites',v.site_id),campaign=lookup('campaigns',v.campaign_id);
 const dimension=v.package_dimensions_snapshot||(pkg?.width_m&&pkg?.height_m?fmt(pkg.width_m)+' × '+fmt(pkg.height_m)+' م':'غير مسجل');
 const specs=v.package_specifications_snapshot||pkg?.specifications||'لم يتم إدخال المواصفات';
 const record=(label,value)=>'<div><small>'+E(label)+'</small><strong>'+E(value??'—')+'</strong></div>';
 return '<div class="overlay print-overlay"><div class="modal print-modal"><div class="modalhead noprint"><h2>معاينة عقد الزبون</h2><button class="close" data-action="close">✕</button></div><article class="contract printed-contract" dir="rtl"><div class="contract-head"><h2>شركة رأفت للدعاية والإعلان والتجارة العامة</h2><h3>عقد حجز وتأجير مساحة إعلانية للزبون</h3><strong>'+E(v.contract_number)+'</strong><small>نوع العقد: '+E(labels[v.contract_type]||v.contract_type)+'</small></div><div class="summary">'+record('الطرف الأول','شركة رأفت للدعاية والإعلان والتجارة العامة')+record('الطرف الثاني (الزبون)',v.customer_name_snapshot||customer?.name||'—')+record('رقم هاتف الزبون',customer?.phone||'—')+record('الرقم الوطني',customer?.national_id||'—')+record('اسم الباقة',v.package_name_snapshot||pkg?.name||'—')+record('نوع المساحة',labels[v.contract_type]||v.contract_type)+record('الطول والعرض',dimension)+record('مدة العقد',v.duration_months+' شهر')+record('المساحة م²',v.package_area_snapshot?fmt(v.package_area_snapshot):(pkg?.area_m2?fmt(pkg.area_m2):'—'))+record('الموقع الإعلاني',v.site_name_snapshot||site?.name||'لم يتم تحديد الموقع')+record('الحملة',campaign?.title||'لا توجد حملة مرتبطة')+record('تاريخ البداية',v.start_date)+record('تاريخ النهاية',v.end_date)+record('القيمة المتفق عليها',money(v.amount,v.currency))+record('ممثل الشركة',v.company_representative||'—')+record('ممثل الزبون',v.customer_representative||'—')+'</div><h3>مواصفات المساحة الإعلانية</h3><p class="legal-text">'+E(specs)+'</p><h3>الشروط المتفق عليها</h3><p class="legal-text">'+E(v.terms||'لم تسجّل شروط إضافية')+'</p><h3>ملاحظات</h3><p class="legal-text">'+E(v.notes||'—')+'</p><div class="contract-sign"><div>توقيع ممثل الشركة<br>____________________</div><div>توقيع الزبون أو ممثله<br>____________________</div></div><p class="print-note">تُراجع هذه المسودة مع الإدارة القانونية قبل اعتمادها كصيغة تعاقد نهائية.</p></article><div class="actions noprint"><button class="btn" data-action="print">طباعة / حفظ PDF</button><button class="btn secondary" data-action="close">إغلاق</button></div></div></div>';
}

function previewHtml(v){
 let p=nameOf('properties',v.property_id),l=nameOf('landlords',v.landlord_id);
 let rows=s.data.lease_installments.filter(x=>x.lease_id===v.id).sort((a,b)=>a.due_date.localeCompare(b.due_date));
 return '<div class="overlay"><div class="modal"><div class="modalhead noprint"><h2>معاينة العقد</h2><button class="close" data-action="close">✕</button></div><article class="contract"><h2 style="text-align:center">شركة رأفت للدعاية والإعلان والتجارة العامة</h2><h3 style="text-align:center">عقد إيجار سطح بين شركة رأفت ومالك البناية — '+E(v.contract_number)+'</h3><div class="summary"><div><small>اسم المالك</small>'+E(l)+'</div><div><small>هاتف المالك</small>'+E(lookup('landlords',v.landlord_id)?.phone||'—')+'</div><div><small>رقم البطاقة الموحدة للمالك</small>'+E(lookup('landlords',v.landlord_id)?.national_id||'—')+'</div><div><small>المحافظة وعنوان السكن</small>'+E([lookup('landlords',v.landlord_id)?.governorate,lookup('landlords',v.landlord_id)?.residential_address].filter(Boolean).join(' — ')||'—')+'</div><div><small>العقار</small>'+E(p)+'</div><div><small>قياسات السطح</small>'+E(lookup('properties',v.property_id)?.dimensions||'—')+'</div><div><small>بداية العقد</small>'+E(v.start_date)+'</div><div><small>نهاية العقد</small>'+E(v.end_date)+'</div><div><small>الأجرة الإجمالية</small>'+E(money(v.rent_total,v.currency))+'</div><div><small>المعادل بسعر الصرف الحالي — للاطلاع فقط</small>'+E(money(equivalent(v.rent_total,v.currency),s.displayCurrency))+'</div><div><small>الدورية</small>'+E(labels[v.payment_frequency])+'</div><div><small>فترة السماح</small>'+E(v.grace_days)+' يوم</div><div><small>ممثل الشركة / المالك</small>'+E(v.company_representative||'—')+' / '+E(v.landlord_representative||'—')+'</div></div><p style="margin-top:18px">ملاحظات وشروط: '+E(v.notes||'لا توجد')+'</p><h3>جدول الدفعات</h3><table><thead><tr><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>المدفوع</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+E(x.due_date)+'</td><td>'+E(money(x.amount,v.currency))+'</td><td>'+E(money(x.paid_amount,v.currency))+'</td></tr>').join('')+'</tbody></table><div style="display:flex;justify-content:space-between;margin-top:55px"><span>توقيع ممثل الشركة: ___________</span><span>توقيع ممثل المالك: ___________</span></div><p class="subtle" style="margin-top:25px">هذه معاينة للبيانات المسجلة وليست بديلاً عن نص عقد قانوني معتمد.</p></article><div class="actions noprint"><button class="btn" data-action="print">طباعة العقد</button><button class="btn secondary" data-action="close">إغلاق</button></div></div></div>';
}

function updateMoneyHints(){
 const form=$('#recordForm');if(!form||!s.modal)return;
 const k=s.modal.table,v={...s.modal.data};
 if(form.elements.currency)v.currency=form.elements.currency.value;
 if(form.elements.campaign_id)v.campaign_id=form.elements.campaign_id.value;
 if(form.elements.lease_id)v.lease_id=form.elements.lease_id.value;
 const currency=fieldCurrency(k,v);
 document.querySelectorAll('[data-money-hint]').forEach(span=>{
  const inp=form.elements.namedItem(span.dataset.moneyHint);
  if(inp)span.textContent=moneyHint(inp.value,currency);
 });
 const info=$('#paymentParentInfo');
 if(info){
  if(k==='campaign_payments'){
   const parent=lookup('campaigns',v.campaign_id);
   const paidOthers=s.data.campaign_payments.filter(x=>x.campaign_id===v.campaign_id&&x.id!==v.id).reduce((a,x)=>a+Number(x.amount),0);
   info.textContent=parent?'الحملة: '+parent.title+' | العميل: '+nameOf('customers',parent.customer_id)+' | العملة الأصلية: '+(labels[parent.currency]||parent.currency)+' | المتاح لهذه الدفعة: '+money(Math.max(0,Number(parent.price)-paidOthers),parent.currency):'اختر الحملة أولاً لعرض العميل والمبلغ المتبقي وعملة الدفع.';
  }else{
   const parent=lookup('leases',v.lease_id);
   info.textContent=parent?'العقد: '+parent.contract_number+' | المالك: '+nameOf('landlords',parent.landlord_id)+' | العملة: '+(labels[parent.currency]||parent.currency)+' | إجمالي العقد: '+money(parent.rent_total,parent.currency):'اختر عقد الإيجار أولاً.';
  }
 }
}

function updateSettingsLogoPreview(src){
 const image=$('#settingsLogoImage'),fallback=$('#settingsLogoFallback');
 if(image){if(src){image.src=src;image.hidden=false;}else{image.removeAttribute('src');image.hidden=true;}}
 if(fallback)fallback.hidden=Boolean(src);
 const target=$('#settingsBrandPreview');
 if(target){
  target.innerHTML=src?'<img class="company-logo company-logo-preview" src="'+E(src)+'" alt="معاينة الشعار">':
   '<span class="company-logo-fallback" aria-hidden="true">'+E(String($('#settingsForm')?.elements.namedItem('company_short_name')?.value||companyValue('company_short_name')).slice(0,1))+'</span>';
 }
}
function updateSettingsPreview(form){
 const val=k=>form.elements.namedItem(k)?.value?.trim()||'';
 const name=$('#settingsPreviewName');if(name)name.textContent=val('company_name')||COMPANY_DEFAULTS.company_name;
 const tagline=$('#settingsPreviewTagline');if(tagline)tagline.textContent=val('company_tagline');
 const contact=$('#settingsPreviewContact');
 if(contact)contact.textContent=[val('company_governorate'),val('company_city'),val('company_phone')].filter(Boolean).join(' • ')||'بيانات التواصل تظهر هنا بعد إضافتها';
}

function bind(){
 bindNav();
 document.querySelectorAll('[data-new]').forEach(x=>x.onclick=()=>openForm(x.dataset.new));
 document.querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>{let [k,id]=x.dataset.edit.split(':');openForm(k,lookup(k,id))});
 document.querySelectorAll('[data-new-linked]').forEach(x=>x.onclick=()=>{let [k,field,id]=x.dataset.newLinked.split('|');let data={[field]:id};if(field==='property_id')data.landlord_id=lookup('properties',id)?.landlord_id;if(field==='campaign_id'){
   const parent=lookup('campaigns',id);
   if(k==='campaign_payments')data.amount=campaignBalance(parent);
   if(k==='customer_contracts'&&parent){data.customer_id=parent.customer_id;data.package_id=parent.package_id;data.amount=parent.price;data.currency=parent.currency;}
  }if(field==='site_id')data.siteIds=[id];openForm(k,data)});
 document.querySelectorAll('[data-preview]').forEach(x=>x.onclick=()=>{s.modal={kind:'preview',table:'leases',data:lookup('leases',x.dataset.preview)};render()});
 document.querySelectorAll('[data-customer-preview]').forEach(x=>x.onclick=()=>{s.modal={kind:'preview',table:'customer_contracts',data:lookup('customer_contracts',x.dataset.customerPreview)};render()});
 document.querySelectorAll('[data-print-record]').forEach(x=>x.onclick=()=>{const [table,id]=x.dataset.printRecord.split('|');s.modal={kind:'preview',table,data:lookup(table,id)};render()});
 document.querySelectorAll('[data-renew]').forEach(x=>x.onclick=()=>{let v=lookup('leases',x.dataset.renew);openForm('leases',{...v,id:undefined,contract_number:undefined,renewed_from:v.id,start_date:today(),end_date:'',rent_total:v.rent_total})});
 document.querySelectorAll('[data-card]').forEach(x=>x.onclick=()=>showCard(lookup('landlords',x.dataset.card)));
 document.querySelectorAll('[data-action]').forEach(x=>x.onclick=()=>actions(x.dataset.action));
 document.querySelectorAll('[data-add-roof]').forEach(x=>x.onclick=()=>{
  if($('#recordForm'))captureForm($('#recordForm'));
  captureRoofDrafts();
  s.modal.roofs.push({});
  render();
 });
 document.querySelectorAll('[data-remove-roof]').forEach(x=>x.onclick=()=>{
  if($('#recordForm'))captureForm($('#recordForm'));
  captureRoofDrafts();
  s.modal.roofs.splice(Number(x.dataset.removeRoof),1);
  render();
 });
 document.querySelectorAll('[data-roof-field]').forEach(input=>input.addEventListener('input',()=>updateAreaOutputs($('#recordForm'))));
 const cardFileInput=document.querySelector('input[name="card_image"]');
 if(cardFileInput)cardFileInput.addEventListener('change',e=>{s.modal.cardFile=e.target.files?.[0]||null;});
 if($('#globalCurrency'))$('#globalCurrency').onchange=e=>{
  if($('#recordForm'))captureForm($('#recordForm'));
  s.displayCurrency=e.target.value;
  localStorage.setItem('raafat-display-currency',s.displayCurrency);
  render();
 };
 if($('#search'))$('#search').oninput=e=>{let pos=e.target.selectionStart;s.search=e.target.value;const parent=e.target.closest('.content');parent.innerHTML=listing(s.view);bind();let n=$('#search');n.focus();n.setSelectionRange(pos,pos)};
 if($('#statusfilter'))$('#statusfilter').onchange=e=>{s.filter=e.target.value;render()};
 if($('#connectForm'))$('#connectForm').onsubmit=e=>{e.preventDefault();connect()};
 if($('#passwordResetRequestForm'))$('#passwordResetRequestForm').onsubmit=e=>{e.preventDefault();sendPasswordReset()};
 if($('#passwordChangeForm'))$('#passwordChangeForm').onsubmit=e=>{e.preventDefault();saveNewPassword()};
 if($('#recordForm'))$('#recordForm').onsubmit=e=>{e.preventDefault();saveForm(e.target)};
 if($('#settingsForm')){
  const form=$('#settingsForm');
  form.onsubmit=e=>{e.preventDefault();saveSettings(e.target)};
  form.oninput=()=>updateSettingsPreview(form);
  const logoInput=$('#companyLogoFile');
  if(logoInput)logoInput.onchange=()=>{
   const file=logoInput.files?.[0];
   if(!file)return;
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>4194304||!file.size){
    toast('صيغة الشعار المسموحة PNG أو JPG أو WebP وبحد 4MB',true);
    logoInput.value='';return;
   }
   if(s.temporaryLogoUrl)URL.revokeObjectURL(s.temporaryLogoUrl);
   s.temporaryLogoUrl=URL.createObjectURL(file);
   const remove=$('#removeCompanyLogo');
   if(remove)remove.value='false';
   const info=$('#settingsLogoFilename');if(info)info.textContent=file.name;
   updateSettingsLogoPreview(s.temporaryLogoUrl);
  };
 }
 const form=$('#recordForm'),v=s.modal?.data,k=s.modal?.table;
 if(!form)return;
 for(const name of ['width_m','height_m','quantity']){
  const el=form.elements.namedItem(name);
  if(el)el.addEventListener('input',()=>updateAreaOutputs(form));
 }
 updateAreaOutputs(form);
 document.querySelectorAll('[data-site-id]').forEach(x=>x.onchange=()=>{
  captureForm(form);
  s.modal.siteIds=[...document.querySelectorAll('[data-site-id]:checked')].map(a=>a.dataset.siteId);
  if(!v.id)v.quantity=Math.max(1,s.modal.siteIds.length);
  refreshCampaignQuote();
  render();
 });
 for(const name of ['price','rent_total','amount','paid_amount','initial_payment_amount']){
  let input=form.elements.namedItem(name);if(input)input.addEventListener('input',()=>{if(name==='price'&&k==='campaigns')s.modal.autoPrice=false;updateMoneyHints()});
 }
 const currency=form.elements.namedItem('currency');
 if(currency)currency.onchange=()=>{
  const previous=v.currency||s.displayCurrency,next=currency.value;
  for(const name of ['price','rent_total','amount','paid_amount','initial_payment_amount']){
   let input=form.elements.namedItem(name);
   if(input&&input.value!=='')input.value=String(roundAmount(convert(input.value,previous,next)));
  }
  if(k==='packages'){
   form.querySelectorAll('[data-package-rate-month]').forEach(input=>{
    if(input.value==='')return;
    const changed=roundAmount(convert(input.value,previous,next));
    input.value=String(changed);
    s.modal.rateDraft[Number(input.dataset.packageRateMonth)]=String(changed);
    const hint=form.querySelector('[data-rate-hint="'+input.dataset.packageRateMonth+'"]');
    if(hint)hint.textContent=moneyHint(changed,next);
   });
  }
  captureForm(form);s.modal.data.currency=next;updateMoneyHints();
 };
 const entryCurrency=form.elements.namedItem('entry_currency');
 if(entryCurrency)entryCurrency.onchange=()=>{
  const previous=v.entry_currency||fieldCurrency(k,v),next=entryCurrency.value;
  for(const name of ['amount','paid_amount']){
   const input=form.elements.namedItem(name);
   if(input&&input.value!=='')input.value=String(roundAmount(convert(input.value,previous,next)));
  }
  captureForm(form);v.entry_currency=next;updateMoneyHints();
 };
 const owner=form.elements.namedItem('landlord_id');
 if(owner&&k==='leases')owner.onchange=()=>{captureForm(form);v.landlord_id=owner.value;v.property_id='';render()};
 const client=form.elements.namedItem('customer_id');
 if(client&&k==='campaigns')client.onchange=()=>{
  captureForm(form);
  v.customer_id=client.value;
  const pkg=lookup('packages',lookup('customers',client.value)?.preferred_package_id);
  if(pkg&&!v.id){v.package_id=pkg.id;v.currency=pkg.currency;v.months=pkg.default_months;s.modal.autoPrice=true;refreshCampaignQuote();}
  render();
 };
 if(client&&k==='customer_contracts')client.onchange=()=>{
  captureForm(form);v.customer_id=client.value;
  if(!v.id){const p=lookup('packages',lookup('customers',client.value)?.preferred_package_id);if(p){v.package_id=p.id;v.contract_type=p.package_type;v.currency=p.currency;v.duration_months=p.default_months;refreshCustomerContractQuote();}}
  render();
 };
 const pack=form.elements.namedItem('package_id');
 if(pack&&k==='customer_contracts')pack.onchange=()=>{
  captureForm(form);
  const p=lookup('packages',pack.value);
  v.package_id=pack.value;
  if(p){v.contract_type=p.package_type;v.currency=p.currency;if(!v.id){v.duration_months=p.default_months;refreshCustomerContractQuote();}}
  render();
 };
 const linkedCampaign=form.elements.namedItem('campaign_id');
 if(linkedCampaign&&k==='customer_contracts')linkedCampaign.onchange=()=>{
  captureForm(form);
  const cam=lookup('campaigns',linkedCampaign.value);
  v.campaign_id=linkedCampaign.value;
  if(cam){v.customer_id=cam.customer_id;if(cam.package_id){const pkg=lookup('packages',cam.package_id);v.package_id=cam.package_id;v.contract_type=pkg?.package_type||'cabin';}v.amount=cam.price;v.currency=cam.currency;v.duration_months=cam.months;v.rented_area_m2=cam.requested_area_m2||null;v.end_date=addDays(plusMonths(v.start_date||today(),cam.months),-1);}
  render();
 };
 if(pack&&k==='campaigns')pack.onchange=()=>{
  captureForm(form);const p=lookup('packages',pack.value);
  v.package_id=pack.value;
  if(p){v.months=p.default_months;v.currency=p.currency;s.modal.autoPrice=true;refreshCampaignQuote();}
  render();
 };
 const months=form.elements.namedItem('months');
 if(months&&k==='campaigns')months.onchange=()=>{
  captureForm(form);v.months=Number(months.value);refreshCampaignQuote();render();
 };
 const quantity=form.elements.namedItem('quantity'),area=form.elements.namedItem('requested_area_m2');
 for(const input of [quantity,area].filter(Boolean))input.oninput=()=>{
  captureForm(form);refreshCampaignQuote();
  const existing=form.querySelector('.notice.full');
  if(existing&&existing.textContent.includes('سعر'))existing.outerHTML=packagePricingInfo(v);
 };
 const pricingMode=form.elements.namedItem('pricing_mode');
 if(pricingMode&&k==='packages')pricingMode.onchange=()=>{
  captureForm(form);v.pricing_mode=pricingMode.value;
  if(v.pricing_mode==='sqm_month'){v.package_type='rooftop';v.width_m=null;v.height_m=null;}
  render();
 };
 const defaultMonths=form.elements.namedItem('default_months');
 if(defaultMonths&&k==='packages')defaultMonths.onchange=()=>{
  captureForm(form);v.default_months=Number(defaultMonths.value);
  if(s.modal.rateDraft[v.default_months]!==undefined)v.price=s.modal.rateDraft[v.default_months];
  render();
 };
 document.querySelectorAll('[data-package-rate-month]').forEach(input=>input.oninput=()=>{
  const month=Number(input.dataset.packageRateMonth);
  s.modal.rateDraft[month]=input.value;
  s.modal.rateChanged.add(month);
  const hint=document.querySelector('[data-rate-hint="'+month+'"]');
  if(hint)hint.textContent=moneyHint(input.value,form.elements.namedItem('currency')?.value||v.currency||'USD');
  if(month===Number(form.elements.namedItem('default_months')?.value||v.default_months)){
   const base=form.elements.namedItem('price');
   if(base)base.value=input.value;
  }
 });
 const basePrice=form.elements.namedItem('price');
 if(basePrice&&k==='packages')basePrice.oninput=()=>{
  const month=Number(form.elements.namedItem('default_months')?.value||v.default_months);
  s.modal.rateDraft[month]=basePrice.value;
  s.modal.rateChanged.add(month);
  const target=form.querySelector('[data-package-rate-month="'+month+'"]');
  if(target)target.value=basePrice.value;
  updateMoneyHints();
 };
 const contractMonths=form.elements.namedItem('duration_months'),contractArea=form.elements.namedItem('rented_area_m2');
 if(contractMonths&&k==='customer_contracts')contractMonths.onchange=()=>{
  captureForm(form);v.duration_months=Number(contractMonths.value);refreshCustomerContractQuote();render();
 };
 if(contractArea&&k==='customer_contracts')contractArea.onchange=()=>{
  captureForm(form);refreshCustomerContractQuote();render();
 };
 const parentCampaign=form.elements.namedItem('campaign_id');
 if(parentCampaign&&k==='campaign_payments')parentCampaign.onchange=()=>{
  const old=lookup('campaigns',v.campaign_id),wasEmpty=!v.campaign_id;
  const oldCurrency=v.entry_currency||old?.currency||s.displayCurrency;
  captureForm(form);v.campaign_id=parentCampaign.value;
  const camp=lookup('campaigns',v.campaign_id);
  if(camp){
   if(!v.id&&(wasEmpty||Number(v.amount)===0))v.amount=campaignBalance(camp);
   else v.amount=roundAmount(convert(v.amount,oldCurrency,camp.currency));
   v.entry_currency=camp.currency;
  }
  render();
 };
 const parentLease=form.elements.namedItem('lease_id');
 if(parentLease&&k==='lease_installments')parentLease.onchange=()=>{
  const old=lookup('leases',v.lease_id),oldCurrency=v.entry_currency||old?.currency||s.displayCurrency;
  captureForm(form);v.lease_id=parentLease.value;
  const lease=lookup('leases',v.lease_id);
  if(lease){
   v.amount=roundAmount(convert(v.amount,oldCurrency,lease.currency));
   v.paid_amount=roundAmount(convert(v.paid_amount,oldCurrency,lease.currency));
   v.entry_currency=lease.currency;
  }
  render();
 };
 updateMoneyHints();
}


function openForm(k,row){
 const defaults={status:'inquiry',currency:s.displayCurrency,site_type:'roadside',active:true,default_months:3,months:3,quantity:1,grace_days:0,payment_frequency:'annual',start_date:today(),paid_at:today(),due_date:today(),paid_amount:0,price:0,amount:0};
 let data={...defaults,...(row||{})};
 if(k==='campaign_payments'&&data.campaign_id)data.entry_currency=lookup('campaigns',data.campaign_id)?.currency||s.displayCurrency;
 if(k==='lease_installments'&&data.lease_id)data.entry_currency=lookup('leases',data.lease_id)?.currency||s.displayCurrency;
 if(k==='campaigns'&&!data.package_id&&data.customer_id){data.package_id=lookup('customers',data.customer_id)?.preferred_package_id||'';}
 if(k==='campaigns'&&data.package_id&&!row?.id){let pack=lookup('packages',data.package_id);if(pack){data.currency=pack.currency;data.months=pack.default_months;const initial=quoteCampaign(data,data.siteIds||[]);data.price=initial?initial.total:0;}}
 if(k==='customer_contracts'){
  if(data.campaign_id&&!data.customer_id){const cam=lookup('campaigns',data.campaign_id);if(cam){data.customer_id=cam.customer_id;data.package_id=cam.package_id;data.site_id=linkedSites(cam.id)[0]?.id||'';data.amount=cam.price;data.currency=cam.currency;data.duration_months=cam.months;data.rented_area_m2=cam.requested_area_m2||campaignSiteArea(linkedSites(cam.id).map(site=>site.id))||null;}}
  if(!data.package_id&&data.customer_id)data.package_id=lookup('customers',data.customer_id)?.preferred_package_id||'';
  if(data.package_id&&!data.id){const p=lookup('packages',data.package_id);if(p){data.contract_type=p.package_type;if(!data.campaign_id){data.duration_months=Number(data.duration_months||p.default_months);data.currency=p.currency;const q=quoteCustomerContract(data);data.amount=q?q.amount:0;}}}
  if(!data.end_date&&data.start_date&&data.package_id){const p=lookup('packages',data.package_id);if(p)data.end_date=addDays(plusMonths(data.start_date,p.default_months||1),-1);}
 }
 const ids=k==='campaigns'?(data.siteIds||s.data.campaign_sites.filter(x=>x.campaign_id===data.id).map(x=>x.site_id)):[];
 const drafts={};
 if(k==='packages')packageRates(data).forEach(rate=>{drafts[rate.months]=roundAmount(convert(rate.usd_price,'USD',data.currency||'USD'));});
 s.modal={kind:'edit',table:k,data,siteIds:[...ids],roofs:k==='landlords'&&!data.id?[{}]:[],autoPrice:k==='campaigns'&&!data.id,rateDraft:drafts,rateChanged:new Set()};
 s.formStep=0;render();
}
function captureForm(form){
 if(!s.modal||!form)return;
 const data=new FormData(form);
 for(let [k,v] of data.entries())if(!(v instanceof File))s.modal.data[k]=v;
 if(s.modal.table==='packages')form.querySelectorAll('[data-package-rate-month]').forEach(input=>{s.modal.rateDraft[Number(input.dataset.packageRateMonth)]=input.value;});
 const siteInputs=[...form.querySelectorAll('[data-site-id]')];
 if(siteInputs.length)s.modal.siteIds=siteInputs.filter(el=>el.checked).map(el=>el.dataset.siteId);
}
function formValidate(k,v){
 if(k==='customers'){
  if(!/^[0-9]{11}$/.test(v.phone)||!/^[0-9]{12}$/.test(v.national_id))throw Error('الهاتف يجب أن يكون 11 رقم، والبطاقة الموحدة 12 رقم');
  if(!v.preferred_package_id||!lookup('packages',v.preferred_package_id))throw Error('حدد باقة إعلانية مسجلة للزبون');
 }
 if(k==='properties'||(k==='packages'&&v.pricing_mode!=='sqm_month')){
  if(!(Number(v.width_m)>0&&Number(v.height_m)>0))throw Error('أدخل طول وعرض أكبر من صفر بالمتر');
 }
 if(k==='customer_contracts'){
  const customer=lookup('customers',v.customer_id),pkg=lookup('packages',v.package_id);
  if(!customer||!pkg)throw Error('اختر زبوناً وباقة إعلانية مسجلين');
  if((v.contract_type||pkg.package_type)!==pkg.package_type)throw Error('نوع عقد الزبون يجب أن يطابق نوع الباقة');
  if(packageRates(pkg).length&&!packageRate(pkg,v.duration_months))throw Error('مدة العقد غير مدرجة بتعرفة الباقة');
  if(pkg.pricing_mode==='sqm_month'&&!(Number(v.rented_area_m2)>0))throw Error('أدخل مساحة الأسطح المتعاقد عليها بالمتر المربع');
  if(v.end_date<v.start_date||!v.start_date||!v.end_date)throw Error('تأكد من تواريخ عقد الزبون');
  if(!(Number(v.amount)>=0))throw Error('مبلغ عقد الزبون غير صالح');
  if(v.campaign_id){const cam=lookup('campaigns',v.campaign_id);if(!cam||cam.customer_id!==v.customer_id||(cam.package_id&&cam.package_id!==v.package_id))throw Error('الحملة المختارة يجب أن تكون لنفس الزبون والباقة');}
 }
 if(['landlords','customers'].includes(k)&&v.alternate_phone&&!/^[0-9]{11}$/.test(v.alternate_phone))throw Error('الهاتف البديل يجب أن يكون 11 رقم');
 if(k==='landlords'&&(!/^[0-9]{11}$/.test(v.phone)||(v.national_id&&!/^[0-9]{12}$/.test(v.national_id))))throw Error('هاتف المالك 11 رقم، ورقم البطاقة عند إدخاله 12 رقم');
 if(k==='ad_sites'&&v.site_type==='rooftop'&&!v.rooftop_property_id)throw Error('موقع السطح لازم تربطه بعقار مسجل عند مالك');
 if(k==='campaigns'){
  const pkg=lookup('packages',v.package_id);
  if(pkg&&packageRates(pkg).length){
   if(!packageRate(pkg,v.months))throw Error('هذه المدة غير مسعّرة في الباقة. اختر مدة من الخيارات الرسمية.');
   if(pkg.pricing_mode==='sqm_month'&&!(Number(v.requested_area_m2)>0||campaignSiteArea(s.modal?.siteIds||[])>0))throw Error('أدخل مساحة إعلان الأسطح بالمتر المربع حتى نحتسب السعر الصحيح.');
  }
  if(!lookup('customers',v.customer_id))throw Error('اختر عميلاً مسجلاً أولاً');
  if(v.package_id&&!lookup('packages',v.package_id))throw Error('الباقة غير موجودة في السجلات');
  if(!s.modal.siteIds?.length&&!String(v.locations||'').trim())throw Error('حدد موقعاً إعلانياً مسجلاً أو أضف موقعاً في الملاحظات النصية');
  if(s.modal.siteIds?.some(id=>!lookup('ad_sites',id)))throw Error('أحد المواقع المختارة غير مسجل');
  if(!(Number(v.months)>0)||Number(v.price)<0)throw Error('أدخل عدد أشهر وسعراً صحيحين');
  if(Number(v.initial_payment_amount||0)>Number(v.price))throw Error('الدفعة الأولى أكبر من سعر الحملة');
  if(v.id&&Number(v.price)<campaignPaid(v.id))throw Error('سعر الحملة أقل من الدفعات المسددة سابقاً');
  const old=lookup('campaigns',v.id);
  if(old&&old.currency!==v.currency&&s.data.campaign_payments.some(x=>x.campaign_id===v.id))throw Error('لا يمكن تغيير عملة حملة لها دفعات محفوظة. استخدم تحويل العرض بالأعلى.');
 }
 if(k==='campaign_payments'){
  const campaign=lookup('campaigns',v.campaign_id);
  if(!campaign)throw Error('اختر حملة مسجلة أولاً');
  if(!(Number(v.amount)>0))throw Error('الدفعة يجب أن تكون أكبر من الصفر');
  const others=s.data.campaign_payments.filter(x=>x.campaign_id===v.campaign_id&&x.id!==v.id).reduce((a,x)=>a+Number(x.amount),0);
  if(Number(v.amount)>Number(campaign.price)-others+0.001)throw Error('قيمة الدفعة أكبر من رصيد الحملة المتبقي');
 }
 if(k==='leases'){
  const property=lookup('properties',v.property_id);
  if(!property||property.landlord_id!==v.landlord_id)throw Error('العقار المختار لا يتبع المالك المسجل');
  if(!v.start_date||!v.end_date||v.end_date<v.start_date)throw Error('تأكد من بداية العقد ونهايته');
  if(Number(v.rent_total)<0)throw Error('إجمالي الإيجار غير صالح');
  const old=lookup('leases',v.id);
  if(old&&s.data.lease_installments.some(x=>x.lease_id===v.id)&&['rent_total','currency','start_date','end_date','grace_days','payment_frequency'].some(field=>String(old[field])!==String(v[field])))throw Error('العقد له أقساط مرتبطة؛ استخدم تجديد العقد للشروط المالية الجديدة.');
 }
 if(k==='lease_installments'){
  if(!lookup('leases',v.lease_id))throw Error('اختر عقداً مسجلاً أولاً');
  if(Number(v.amount)<0||Number(v.paid_amount)<0||Number(v.paid_amount)>Number(v.amount))throw Error('المسدد لا يجوز أن يتجاوز قيمة القسط');
 }
}
function clean(k,v){
 let fields=k==='campaign_payments'?['campaign_id','paid_at','amount','notes']:k==='lease_installments'?['lease_id','due_date','amount','paid_amount','notes']:defs[k].fields.filter(x=>!['file','computed'].includes(x[2])).map(x=>x[0]);
 if(k==='leases')fields.push('renewed_from');

 let o={};
 fields.forEach(f=>{if(v[f]!==undefined){
  let val=v[f];
  if(val===''&&['alternate_phone','national_id','notes','landmark','card_image_path','package_id','rooftop_property_id','renewed_from','company_representative','landlord_representative','locations'].includes(f))val=null;
  if(f==='active')val=(val===true||val==='true');
  o[f]=val;
 }});
 if(k==='landlords'&&v.card_image_path)o.card_image_path=v.card_image_path;
 if(k==='properties'&&v.width_m&&v.height_m)o.dimensions=v.width_m+' × '+v.height_m+' m';
 if(k==='customer_contracts')o.contract_type=lookup('packages',v.package_id)?.package_type||v.contract_type||'cabin';
 return o;
}

async function persist(k,o,id){
 if(s.demo){
  if(k==='leases'&&!id&&!o.contract_number)o.contract_number='RA-'+(1+Math.max(0,...s.data.leases.map(x=>Number((x.contract_number||'').replace('RA-',''))||0)));
  if(k==='customer_contracts'&&!id){
   o.contract_number='RC-'+(1+Math.max(0,...s.data.customer_contracts.map(x=>Number((x.contract_number||'').replace('RC-',''))||0)));
   const p=lookup('packages',o.package_id),cust=lookup('customers',o.customer_id),site=lookup('ad_sites',o.site_id);
   o.package_name_snapshot=p?.name||'—';
   o.package_dimensions_snapshot=p?.width_m+' × '+p?.height_m+' m';
   o.package_specifications_snapshot=p?.specifications||'';
   o.customer_name_snapshot=cust?.name||'—';
   o.site_name_snapshot=site?.name||null;
  }
  let record={...o,id:id||uid(),created_at:today()};let idx=s.data[k].findIndex(x=>x.id===id);if(idx>=0)s.data[k][idx]={...s.data[k][idx],...record};else s.data[k].unshift(record);return record;}
 const request=id?s.client.from(k).update(o).eq('id',id).select().single():s.client.from(k).insert(o).select().single();let {data,error}=await request;if(error)throw error;return data;
}
function plusMonths(date,months){let d=new Date(date+'T12:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);let max=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,max));return d.toISOString().slice(0,10)}
function addDays(date,n){let d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+Number(n||0));return d.toISOString().slice(0,10)}
async function generateInstallments(v){let interval=v.payment_frequency==='semiannual'?6:12,start=v.start_date,end=v.end_date,dates=[];for(let i=0;i<240;i+=interval){let date=plusMonths(start,i);if(date>end)break;dates.push(addDays(date,v.grace_days||0))}
 if(!dates.length)dates=[addDays(start,v.grace_days||0)];
 let total=Math.round(Number(v.rent_total)*100),base=Math.floor(total/dates.length),remainder=total-base*dates.length;
 let records=dates.map((date,i)=>({lease_id:v.id,due_date:date,amount:(base+(i===dates.length-1?remainder:0))/100,paid_amount:0}));
 for(let rec of records)await persist('lease_installments',rec);
}

async function syncCampaignSites(campaignId,siteIds){
 const ids=[...new Set(siteIds||[])];
 const current=s.data.campaign_sites.filter(x=>x.campaign_id===campaignId);
 for(const row of current.filter(x=>!ids.includes(x.site_id))){
  if(s.demo)s.data.campaign_sites=s.data.campaign_sites.filter(x=>x.id!==row.id);
  else{
   const {error}=await s.client.from('campaign_sites').delete().eq('id',row.id);
   if(error)throw error;
  }
 }
 for(const id of ids.filter(x=>!current.some(row=>row.site_id===x))){
  const added=await persist('campaign_sites',{campaign_id:campaignId,site_id:id});
  if(!s.demo)s.data.campaign_sites.push(added);
 }
}
async function saveForm(form){
 if(!s.modal)return;
 const m=s.modal,k=m.table;
 captureForm(form);
 if(k==='landlords')captureRoofDrafts();
 let v=m.data;
 if(k==='campaigns'&&s.formStep<4){
  refreshCampaignQuote();
  if(s.formStep===1&&!m.siteIds?.length&&!String(v.locations||'').trim()){
   toast('حدد موقعاً من القائمة أو أدخل موقعاً إضافياً قبل المتابعة',true);return;
  }
  s.formStep++;render();return;
 }
 try{
  const normalized={...v};
  if(k==='campaign_payments'||k==='lease_installments'){
   const target=k==='campaign_payments'?lookup('campaigns',v.campaign_id)?.currency:lookup('leases',v.lease_id)?.currency;
   if(target){
    const source=v.entry_currency||target;
    normalized.amount=roundAmount(convert(v.amount,source,target));
    if(k==='lease_installments')normalized.paid_amount=roundAmount(convert(v.paid_amount,source,target));
   }
  }
  formValidate(k,normalized);
  if(k==='landlords'){
   if(!v.id&&!m.roofs.length)throw Error('سجّل على الأقل سطحاً واحداً للمالك مع قياسه');
   for(const roof of m.roofs){
    if(!roof.title?.trim()||!(Number(roof.width_m)>0)||!(Number(roof.height_m)>0)||!(Number(roof.quantity||1)>0))throw Error('أدخل اسم وطول وعرض كل سطح من الأسطح المضافة بشكل صحيح');
   }
  }
  let o=clean(k,normalized);
  if(k==='packages'&&v.pricing_mode==='sqm_month'){o.width_m=null;o.height_m=null;o.package_type='rooftop';}
  if(k==='leases'&&!v.id)o.contract_number='';
  if(k==='landlords'){
   let file=form.elements.card_image?.files?.[0]||m.cardFile;
   if(file){
    if(s.demo)throw Error('رفع صورة البطاقة غير متاح في وضع المعاينة');
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5242880)throw Error('صورة البطاقة يجب أن تكون PNG أو JPEG أو WebP وبحد أقصى 5MB');
    const path=s.session.user.id+'/'+uid()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const {error}=await s.client.storage.from('identity-cards').upload(path,file,{upsert:false,contentType:file.type});
    if(error)throw error;
    o.card_image_path=path;
   }
  }
  const wasNew=!v.id;
  const saved=await persist(k,o,v.id);
  if(k==='packages'){
   m.data.id=saved.id;
   for(const month of m.rateChanged||[]){
    const amount=Number(m.rateDraft?.[month]);
    if(!Number.isFinite(amount)||amount<0)throw Error('تحقق من سعر الباقة لمدة '+month+' أشهر');
    const current=packageRate(saved,month);
    await persist('package_rates',{package_id:saved.id,months:Number(month),usd_price:roundAmount(convert(amount,v.currency||'USD','USD'))},current?.id);
   }
  }
  if(k==='landlords'){
   m.data.id=saved.id;
   for(const roof of m.roofs){
    if(roof.saved)continue;
    await persist('properties',{
     landlord_id:saved.id,
     title:roof.title.trim(),
     width_m:Number(roof.width_m),
     height_m:Number(roof.height_m),
     dimensions:roof.width_m+' × '+roof.height_m+' m',
     quantity:Number(roof.quantity||1),
     notes:roof.notes||null
    });
    roof.saved=true;
   }
  }
  if(k==='campaigns'){
   // The parent record is saved first to get its id; all site records point to that id.
   // Keep the existing record open on partial failure to prevent accidental duplicate creation.
   m.data.id=saved.id;
   await syncCampaignSites(saved.id,m.siteIds);
   if(wasNew&&Number(v.initial_payment_amount)>0&&!m.initialPaymentSaved){
    await persist('campaign_payments',{campaign_id:saved.id,paid_at:v.initial_payment_date||today(),amount:Number(v.initial_payment_amount)});
    m.initialPaymentSaved=true;
   }
  }
  if(k==='leases'&&wasNew){
   m.data.id=saved.id;
   try{await generateInstallments(saved)}
   catch(e){toast('تم إنشاء العقد لكن بعض الأقساط لم تُنشأ: '+e.message,true)}
  }
  s.modal=null;
  if(s.demo){s.view=k;render()}else await load();
  toast('تم حفظ السجل وربطه بنجاح');
 }catch(e){toast(e.message||String(e),true)}
}

async function saveSettings(form){
 if(!s.demo&&s.staff?.role!=='admin')return toast('تغيير إعدادات الشركة يتطلب صلاحية المدير',true);
 const data=new FormData(form);
 const rate=Number(data.get('usd_iqd'));
 if(!Number.isFinite(rate)||rate<=0||rate>100000000)return toast('أدخل سعر صرف موجباً وصحيحاً',true);
 const fields=['company_name','company_short_name','company_tagline','company_phone','company_whatsapp','company_email',
  'company_website','company_address','company_governorate','company_city','company_registration'];
 const record={usd_iqd:rate};
 for(const key of fields){
  const value=String(data.get(key)||'').trim();
  if(value.length>500)return toast('بعض بيانات الشركة طويلة أكثر من المسموح',true);
  record[key]=value;
 }
 if(!record.company_name||!record.company_short_name)return toast('أدخل اسم الشركة الرسمي والمختصر',true);
 const email=record.company_email;
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return toast('البريد الإلكتروني للشركة غير صالح',true);
 if(record.company_website){
  try{
   const url=new URL(record.company_website);
   if(!['https:','http:'].includes(url.protocol))throw Error('Unsupported protocol');
  }catch(_){return toast('أدخل رابط موقع صحيحاً يبدأ بـ https:// أو http://',true)}
 }
 const file=form.elements.namedItem('company_logo_file')?.files?.[0];
 const logoType={ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
 if(file&&(!logoType[file.type]||file.size>4194304||file.size===0))
  return toast('الشعار لازم PNG أو JPG أو WebP، وحجمه أقل من 4MB',true);
 const removeLogo=data.get('remove_logo')==='true';
 let uploaded=null;
 try{
  record.logo_path=removeLogo?null:s.settings.logo_path||null;
  if(file){
   if(s.demo){
    if(s.demoLogoUrl&&typeof URL?.revokeObjectURL==='function')URL.revokeObjectURL(s.demoLogoUrl);
    s.demoLogoUrl=URL.createObjectURL(file);
   }else{
    uploaded='company/logos/'+uid()+'.'+logoType[file.type];
    const {error}=await s.client.storage.from('raafat-branding').upload(uploaded,file,{
     cacheControl:'3600',upsert:false,contentType:file.type
    });
    if(error)throw error;
    record.logo_path=uploaded;
   }
  }else if(removeLogo&&s.demo&&s.demoLogoUrl){
   if(typeof URL?.revokeObjectURL==='function')URL.revokeObjectURL(s.demoLogoUrl);
   s.demoLogoUrl=null;
  }
  let saved=record;
  if(!s.demo){
   const {data:row,error}=await s.client.from('settings')
     .update({...record,updated_at:new Date().toISOString()}).eq('id',1).select('*').single();
   if(error)throw error;
   saved=row;
  }
  s.settings={...s.settings,...saved};
  s.error='';
  render();
  toast(s.demo?'تم حفظ الهوية للمعاينة فقط، ولن تستمر بعد تحديث الصفحة':'تم حفظ هوية الشركة والشعار وسعر الصرف بنجاح');
 }catch(e){
  if(uploaded&&s.client){try{await s.client.storage.from('raafat-branding').remove([uploaded])}catch(_){}}
  toast('تعذّر حفظ الإعدادات: '+(e.message||String(e)),true);
 }
}
async function showCard(v){if(!v?.card_image_path||s.demo)return;
 let {data,error}=await s.client.storage.from('identity-cards').createSignedUrl(v.card_image_path,60);
 if(error)return toast(error.message,true);
 // Open transient link rather than embedding sensitive ID images in the document.
 window.open(data.signedUrl,'_blank','noopener,noreferrer');
}

function exportCsv(k){
 const rows=s.data[k]||[];
 let headers=[],data=[];
 if(k==='customers'){
  headers=['الاسم','الهاتف','الهاتف البديل','رقم البطاقة الموحدة','عنوان الاستئجار','الحالة','الملاحظات'];
  data=rows.map(x=>[x.name,x.phone,x.alternate_phone,x.national_id,x.rental_address,labels[x.status]||x.status,x.notes]);
 }else if(k==='campaigns'){
  headers=['الحملة','العميل','الباقة','المواقع','الأشهر','السعر الأصلي','العملة','السعر بالدينار','السعر بالدولار','المدفوع','المتبقي'];
  data=rows.map(x=>[x.title,nameOf('customers',x.customer_id),nameOf('packages',x.package_id),linkedSites(x.id).map(s=>s.code+' '+s.name).join('، ')||x.locations,x.months,x.price,x.currency,roundAmount(convert(x.price,x.currency,'IQD')),roundAmount(convert(x.price,x.currency,'USD')),campaignPaid(x.id),campaignBalance(x)]);
 }else if(k==='lease_installments'){
  headers=['العقد','المالك','تاريخ الاستحقاق','القسط الأصلي','المدفوع','العملة','القسط بالدينار','القسط بالدولار','المتبقي'];
  data=rows.map(x=>{let lease=lookup('leases',x.lease_id),cur=lease?.currency||'IQD';return [lease?.contract_number,nameOf('landlords',lease?.landlord_id),x.due_date,x.amount,x.paid_amount,cur,roundAmount(convert(x.amount,cur,'IQD')),roundAmount(convert(x.amount,cur,'USD')),roundAmount(Number(x.amount)-Number(x.paid_amount))]});
 }else return;
 const escaped=(val)=>{
  let value=String(val??'');
  // Prevent spreadsheet formula evaluation if imported into a spreadsheet application.
  if(/^[\s]*[=+\-@]/.test(value))value="'"+value;
  return '"'+value.replace(/"/g,'""')+'"';
 };
 const csv='\ufeff'+[headers,...data].map(row=>row.map(escaped).join(',')).join('\r\n');
 const link=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 link.href=url;link.download='raafat-'+k+'-'+today()+'.csv';link.click();URL.revokeObjectURL(url);
}

function actions(a){
 if(a==='removeCompanyLogo'){
  const form=$('#settingsForm'),remove=$('#removeCompanyLogo');
  if(!form||!remove)return;
  remove.value='true';
  const input=$('#companyLogoFile');if(input)input.value='';
  if(s.temporaryLogoUrl){URL.revokeObjectURL(s.temporaryLogoUrl);s.temporaryLogoUrl=null;}
  const name=$('#settingsLogoFilename');if(name)name.textContent='سيُزال الشعار عند الحفظ';
  updateSettingsLogoPreview('');
  return;
 }
 if(a==='demo')return demo();
 if(a==='forgotPassword'){s.resetRequest=true;s.error='';return render()}
 if(a==='cancelPasswordReset'){s.resetRequest=false;s.passwordRecovery=false;return render()}
 if(a==='close'){s.modal=null;return render()}
 if(a==='logout'){if(s.client&&s.realtimeChannel)s.client.removeChannel(s.realtimeChannel);s.realtimeChannel=null;if(s.client)s.client.auth.signOut();s.session=null;s.staff=null;s.demo=false;s.modal=null;s.error='';return render()}
 if(a==='prevStep'){captureForm($('#recordForm'));s.formStep=Math.max(0,s.formStep-1);return render()}
 if(a==='print')return window.print();
 if(a==='exportCustomers')return exportCsv('customers');
 if(a==='exportCampaigns')return exportCsv('campaigns');
 if(a==='exportInstallments')return exportCsv('lease_installments');
}
bootstrap();
