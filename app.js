import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const $=(q,root=document)=>root.querySelector(q);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n)||0);
const money=(n,c)=>fmt(n)+' '+(c==='USD'?'$':'د.ع');
const today=()=>new Date().toISOString().slice(0,10);
const uid=()=>crypto.randomUUID();
// Internal @raafat aliases map to reserved, non-deliverable account identifiers.
function toAuthEmail(value){const login=String(value||'').trim().toLowerCase();return /^[a-z][a-z0-9._-]{0,62}@raafat$/.test(login)&&!login.includes('..')&&!/[._-]@raafat$/.test(login)?login+'.example':login;}
function displayStaffLogin(email){return String(email||'').replace(/@raafat\.example$/i,'@raafat');}
const PUBLIC_CONFIG={url:'https://gxredstctzkuwgsegykd.supabase.co',key:'sb_publishable_UtbrZOAMhrbBq3eeNaXf2Q_lrRT4K1s'};
const keys=['customers','packages','package_rates','landlords','properties','ad_sites','campaigns','campaign_sites','leases','lease_installments','campaign_payments','customer_contracts','company_expenses','employees','payroll_payments'];

// Province choices are canonical Arabic governorate names (including Halabja, 2025).
// Legacy saved names are displayed as a one-time existing option, not discarded.
const IRAQ_GOVERNORATES=[
 'بغداد','البصرة','نينوى','أربيل','السليمانية','دهوك','حلبجة',
 'كركوك','ديالى','صلاح الدين','الأنبار','بابل','كربلاء',
 'النجف','واسط','ميسان','ذي قار','المثنى','القادسية'
];
function governorateField(id,label,value='',required=false){
 const current=String(value||'').trim();
 const choices=IRAQ_GOVERNORATES.map(name=>
  '<option value="'+E(name)+'"'+(name===current?' selected':'')+'>'+
  E(name==='القادسية'?'القادسية (الديوانية)':name)+'</option>').join('');
 const legacy=current&&!IRAQ_GOVERNORATES.includes(current)?
  '<option value="'+E(current)+'" selected>القيمة المحفوظة سابقاً: '+E(current)+'</option>':'';
 return '<label class="field"><span>'+E(label)+(required?' *':'')+'</span><select name="'+E(id)+'"'+(required?' required':'')+'>'+
  '<option value=""'+(!current?' selected':'')+'>— اختر المحافظة العراقية —</option>'+
  legacy+choices+'</select></label>';
}

const defs={
 customers:{title:'العملاء',icon:'♟',fields:[['name','اسم العميل','text',true],['phone','رقم الهاتف الأساسي (11 رقم)','tel',true],['alternate_phone','الهاتف البديل','tel'],['national_id','رقم البطاقة الموحدة (12 رقم)','text',true],['status','الحالة','select',true,['active','inactive','inquiry']],['notes','الملاحظات','textarea']]},
 packages:{title:'الباقات الإعلانية',icon:'◈',fields:[['name','اسم الباقة','text',true],['code','رمز الباقة','text',true],['package_type','نوع الباقة','select',true,['cabin','rooftop']],['pricing_mode','طريقة التسعير','select',true,['fixed_term','sqm_month']],['width_m','العرض بالمتر','number',true],['height_m','الطول بالمتر','number',true],['area_m2','المساحة الإجمالية م²','computed'],['sides','عدد الأوجه','number',true],['specifications','مواصفات الباقة','textarea'],['default_months','عدد الأشهر الافتراضي','number',true],['price','السعر الافتراضي للباقة','number',true],['currency','العملة','select',true,['IQD','USD']],['notes','ملاحظات','textarea']]},
 landlords:{title:'مالكو المواقع — الأسطح',icon:'▣',fields:[['name','اسم المالك','text',true],['phone','الهاتف (11 رقم)','tel',true],['alternate_phone','الهاتف البديل','tel'],['national_id','رقم البطاقة الموحدة','text'],['governorate','المحافظة','text',true],['residential_address','عنوان السكن','text',true],['landmark','أقرب نقطة دالة','text'],['notes','الملاحظات','textarea'],['card_image','صورة البطاقة الموحدة','file']]},
 properties:{title:'عقارات ومساحات الأسطح',icon:'▤',fields:[['landlord_id','صاحب العقار','lookup:landlords',true],['title','اسم السطح / العقار','text',true],['width_m','عرض السطح بالمتر','number',true],['height_m','طول السطح بالمتر','number',true],['area_m2','إجمالي مساحة السطح م²','computed'],['quantity','العدد','number',true],['notes','الملاحظات','textarea']]},
 leases:{title:'عقود مالكي البنايات — الأسطح',icon:'▧',fields:[['landlord_id','اسم المالك','lookup:landlords',true],['property_id','عقار المالك','lookup:properties',true],['rent_total','إجمالي الإيجار المتفق عليه','number',true],['advance_amount','المبلغ المقدم عند التعاقد','number'],['currency','عملة العقد','select',true,['IQD','USD']],['start_date','تاريخ البداية','date',true],['end_date','تاريخ النهاية','date',true],['grace_days','فترة السماح بالأيام','number',true],['payment_frequency','دورية الدفع','select',true,['annual','semiannual']],['company_representative','اسم المدير المفوض','text'],['landlord_representative','ممثل المالك','text'],['notes','الملاحظات','textarea']]},
 ad_sites:{title:'المواقع الإعلانية',icon:'⌖',fields:[['package_id','الباقة / نوع الإعلان A–E','lookup:packages',true],['code','رمز الموقع','text',true],['name','اسم الموقع','text',true],['site_type','نوع الموقع','select',true,['roadside','rooftop','building','other']],['governorate','المحافظة','text',true],['address','الموقع والعنوان','text',true],['rooftop_property_id','العقار المرتبط (إذا كان سطحاً)','lookup:properties'],['active','حالة الموقع','select',true,['true','false']],['notes','الملاحظات','textarea']]},
 campaigns:{title:'المشاريع والحملات',icon:'✦',fields:[['customer_id','العميل','lookup:customers',true],['title','اسم الحملة','text',true],['package_id','نوع الإعلان / الباقة (A–E)','lookup:packages',true],['months','عدد الأشهر','number',true],['ad_faces','عدد الأوجه','select',true,[1,2]],['start_date','تاريخ بدء الحملة','date',true],['quantity','عدد القطع','number',true],['requested_area_m2','مساحة الإعلان بالمتر المربع (لباقة E)','number'],['locations','المواقع الإعلانية (أسماء أو رموز المواقع)','textarea'],['price','السعر الإجمالي','number',true],['currency','العملة','select',true,['IQD','USD']],['next_payment_due_date','موعد الدفعة القادمة للزبون (اختياري)','date'],['notes','الملاحظات','textarea']]},
 lease_installments:{title:'دفعات عقود الإيجار',icon:'◉',fields:[]},
 campaign_payments:{title:'دفعات الحملات',icon:'◉',fields:[]},
 campaign_sites:{title:'مواقع الحملات',icon:'⌖',fields:[]},
 package_rates:{title:'أسعار مدد الباقات',icon:'$',fields:[]},
 employees:{title:'الموظفون والرواتب',icon:'users',fields:[
  ['name','اسم الموظف','text',true],['job_title','المسمّى الوظيفي بالعربي','text',true],
  ['department','القسم','select',true,['general','graphic_design','production','marketing','development','shared','cleaning']],
  ['phone','رقم الهاتف','tel'],['salary_amount','الراتب الشهري','number',true],
  ['salary_currency','عملة الراتب','select',true,['IQD','USD']],['hired_at','تاريخ المباشرة','date'],
  ['active','حالة الموظف','select',true,['true','false']],['notes','ملاحظات','textarea']]},
 company_expenses:{title:'المصروفات والفواتير',icon:'receipt',fields:[['expense_date','تاريخ الفاتورة','date',true],['title','وصف الفاتورة','text'],['category','التصنيف المحاسبي','text'],['amount','إجمالي الفاتورة','number',true],['currency','عملة الفاتورة','select',true,['IQD','USD']],['paid_by','الموظف المسؤول / المستلم','text',true],['notes','الملاحظات','textarea']]},
 customer_contracts:{title:'عقود الزبائن — الكابينات والأسطح',icon:'▣',fields:[['customer_id','الزبون','lookup:customers',true],['package_id','الباقة الإعلانية','lookup:packages',true],['contract_type','نوع العقد','select',true,['cabin','rooftop']],['duration_months','مدة العقد بالأشهر','number',true],['rented_area_m2','مساحة الإعلان المتفق عليها م² (لباقة E)','number'],['campaign_id','الحملة المعتمدة','lookup:campaigns',true],['site_id','الموقع الإعلاني (اختياري)','lookup:ad_sites'],['start_date','تاريخ بداية العقد','date',true],['end_date','تاريخ نهاية العقد','date',true],['amount','قيمة عقد الزبون','number',true],['currency','العملة','select',true,['IQD','USD']],['company_representative','اسم المدير المفوض','text'],['customer_representative','ممثل الزبون','text'],['terms','شروط الاتفاق','textarea'],['notes','ملاحظات','textarea']]}
};
const labels={active:'فعال',inactive:'غير فعال',inquiry:'استفسار',IQD:'دينار عراقي',USD:'دولار أمريكي',annual:'سنوي',semiannual:'نصف سنوي',cabin:'كابينة إعلانية',fixed_term:'سعر كامل المدة للقطعة',sqm_month:'سعر المتر المربع شهرياً',roadside:'شارع / رصيف',rooftop:'سطح',building:'واجهة بناية',other:'أخرى',
 general:'الإدارة العامة',graphic_design:'التصميم والجرافيك',production:'الإنتاج والتصوير',
 marketing:'التسويق وإدارة الحسابات',development:'البرمجة وتطوير المواقع',
 shared:'الخدمات الإدارية والمشتركة',cleaning:'التنظيف',
 admin:'المدير الرئيسي',staff:'موظف',custom_admin:'مدير بصلاحيات مخصصة',
 true:'متاح للحملات',false:'غير متاح'};
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
 if(s.demo&&s.demoLogoUrl)return s.demoLogoUrl;
 if(!path||!/^company\/logos\/[a-zA-Z0-9_-]+\.(?:png|jpg|webp)$/.test(String(path)))return '';
 if(!s.client||s.demo)return '';
 return s.client.storage.from('raafat-branding').getPublicUrl(path).data?.publicUrl||'';
}
function companyLogoHtml(kind='sidebar'){
 const url=companyLogoUrl();
 return url?'<img class="company-logo company-logo-'+kind+'" src="'+E(url)+'" alt="شعار '+E(companyValue('company_short_name'))+'" loading="'+(kind==='contract'?'eager':'lazy')+'">':
 '<span class="company-logo-fallback" aria-hidden="true">'+E(String(companyValue('company_short_name')).trim().slice(0,1)||'ر')+'</span>';
}

const s={client:null,session:null,staff:null,realtimeChannel:null,config:PUBLIC_CONFIG,demo:false,resetRequest:false,passwordRecovery:false,view:localStorage.getItem('raafat-last-view')||'dashboard',navExpanded:null,activityLogs:[],data:Object.fromEntries(keys.map(k=>[k,[]])),settings:{...COMPANY_DEFAULTS,usd_iqd:1500},displayCurrency:localStorage.getItem('raafat-display-currency')==='USD'?'USD':'IQD',search:'',filter:'all',expenseCategory:'',alertFilter:'all',editing:null,modal:null,formStep:0,error:'',loading:false};

// Warehouse workflow is isolated so older modules and test harnesses stay intact.
const inventory=(typeof window!=='undefined'&&typeof window.RaafatInventory==='function')?
 window.RaafatInventory({s,E,fmt,money,uiIcon,toast,render,canAccess,today,updateInventoryAlertBadge}):
 {page:()=>'<div class="notice">تعذر تحميل وحدة المخازن.</div>',bind:()=>{},reload:async()=>{},
  resetDemo:()=>{},startPolling:()=>{},stopPolling:()=>{},alertCount:()=>0,
  alertHtml:()=>'',printSheet:()=>'',setTab:()=>{}};
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


// For legacy billboard IDs (A01, B-12, C_3...), infer the category only when the
// prefix is clearly an A-E label. Explicit package assignments are the source of truth
// for codes without a class prefix; conflicting prefix/assignment is intentionally invalid.
function codedSitePackage(siteCode){
 const match=String(siteCode||'').trim().toUpperCase().match(/^([A-E])(?=$|[0-9._\/\s-])/);
 return match?.[1]||'';
}
function sitePackageId(site){
 if(!site)return null;
 const declared=site.package_id?lookup('packages',site.package_id):null;
 const letter=codedSitePackage(site.code);
 if(declared){
  if(letter&&String(declared.code||'').trim().toUpperCase()!==letter)return null;
  return declared.id;
 }
 if(site.package_id)return null; // invalid / removed category is never silently remapped
 if(!letter)return null;
 const matches=s.data.packages.filter(p=>String(p.code||'').trim().toUpperCase()===letter);
 return matches.length===1?matches[0].id:null;
}
function siteMatchesPackage(site,packageId){
 return Boolean(site&&packageId&&sitePackageId(site)===packageId);
}

// For new or edited boards: category A-E supplies the prefix; user enters a number.
function siteNumberFromCode(code){
 const raw=String(code??'').trim()
  .replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x0660))
  .replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x06f0));
 const match=raw.match(/^(?:[A-E]\s*[-_.\/\s]?\s*)?(\d+)$/i);
 return match?match[1].replace(/^0+(?=\d)/,''):'';
}
function siteCodeForPackage(number,packageId){
 const prefix=String(lookup('packages',packageId)?.code||'').trim().toUpperCase();
 const digits=siteNumberFromCode(number);
 return /^[A-E]$/.test(prefix)&&/^[1-9]\d*$/.test(digits)?prefix+'-'+digits:'';
}
// Keep original booked IDs, look up their current codes and descriptions.
function liveContractSite(snapshot){
 if(!snapshot)return null;
 const site=snapshot.id?lookup('ad_sites',snapshot.id):null;
 return site?{...snapshot,...site}:snapshot;
}

const lookup=(table,id)=>s.data[table].find(x=>x.id===id);
const nameOf=(table,id)=>lookup(table,id)?.name||lookup(table,id)?.title||'—';
const convert=(v,from,to)=>from===to?Number(v):Number(v)*(from==='USD'?Number(s.settings.usd_iqd):1/Number(s.settings.usd_iqd));
const roundAmount=(n)=>Math.round((Number(n)+Number.EPSILON)*100)/100;
const equivalent=(n,source,to=s.displayCurrency)=>roundAmount(convert(n,source,to));
const displayMoneyText=(n,source)=>money(equivalent(n,source),s.displayCurrency)+(s.displayCurrency!==source?' (الأصل '+money(n,source)+')':'');
const displayMoney=(n,source)=>'<strong class="amount">'+E(money(equivalent(n,source),s.displayCurrency))+'</strong>'+(s.displayCurrency!==source?'<small class="original-amount">الأصل: '+E(money(n,source))+'</small>':'');
const originalCurrency=(k,v)=>v?.currency||((k==='lease_installments')?lookup('leases',v?.lease_id)?.currency:(k==='campaign_payments')?lookup('campaigns',v?.campaign_id)?.currency:null)||'IQD';
const linkedSites=(campaignId)=>s.data.campaign_sites.filter(x=>x.campaign_id===campaignId).map(x=>lookup('ad_sites',x.site_id)).filter(Boolean);

// A campaign reserves each site only during its agreed dates. Bookings
// with overlapping calendar periods cannot share the same advertising site.
function campaignBookingPeriod(campaign){
 const start=String(campaign?.start_date||'');
 const months=Number(campaign?.months);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isInteger(months)||months<=0)return null;
 try{
  const end=addDays(plusMonths(start,months),-1);
  return end>=start?{start,end}:null;
 }catch(_){return null;}
}
function overlappingBookingPeriods(a,b){
 return Boolean(a&&b&&a.start<=b.end&&b.start<=a.end);
}
function campaignSiteConflict(siteId,draft,campaignLinks=s.data.campaign_sites,campaigns=s.data.campaigns){
 const proposed=campaignBookingPeriod(draft);
 if(!siteId||!proposed)return null;
 for(const link of campaignLinks){
  if(link.site_id!==siteId||link.campaign_id===draft?.id)continue;
  const campaign=campaigns.find(row=>row.id===link.campaign_id);
  if(campaign&&overlappingBookingPeriods(proposed,campaignBookingPeriod(campaign)))return campaign;
 }
 return null;
}
function reservedCampaignChoices(draft,ids=s.modal?.siteIds||[],links=s.data.campaign_sites,campaigns=s.data.campaigns){
 return (ids||[]).map(siteId=>({
  siteId,
  site:lookup('ad_sites',siteId),
  campaign:campaignSiteConflict(siteId,draft,links,campaigns)
 })).filter(item=>item.campaign);
}
function reservedCampaignMessage(conflicts){
 return 'بعض القطع محجوزة بحملات أخرى خلال الفترة المختارة: '+
  conflicts.map(row=>(row.site?.code||row.siteId)+' ('+row.campaign.title+')').join('، ');
}
function removeUnavailableCampaignChoices(draft){
 if(s.modal?.table!=='campaigns')return [];
 const conflicts=reservedCampaignChoices(draft);
 if(!conflicts.length)return [];
 const ids=new Set(conflicts.map(item=>item.siteId));
 s.modal.siteIds=(s.modal.siteIds||[]).filter(id=>!ids.has(id));
 return conflicts;
}
async function freshCampaignConflicts(draft,ids){
 if(s.demo||!s.client||!ids?.length)return [];
 const {data:links,error:linksError}=await s.client.from('campaign_sites')
  .select('site_id,campaign_id').in('site_id',[...new Set(ids)]);
 if(linksError)throw linksError;
 const otherLinks=(links||[]).filter(link=>link.campaign_id!==draft?.id);
 if(!otherLinks.length)return [];
 const campaignIds=[...new Set(otherLinks.map(link=>link.campaign_id))];
 const {data:campaigns,error:campaignError}=await s.client.from('campaigns')
  .select('id,title,start_date,months').in('id',campaignIds);
 if(campaignError)throw campaignError;
 return reservedCampaignChoices(draft,ids,otherLinks,campaigns||[]);
}
const serial4=(number)=>String(Math.max(0,Number(number)||0)).padStart(4,'0');
const numberedContract=(code)=>String(code??'').replace(/^([A-Z]+-)(\d+)$/,(_,prefix,num)=>prefix+serial4(num));
const currencyAmount=(value,currency)=>displayMoney(value,currency);
const receiptNumber=(payment)=>String(payment?.receipt_number||'').trim()||serial4(
 1+s.data.campaign_payments.filter(x=>String(x.created_at||x.paid_at||'')<String(payment?.created_at||payment?.paid_at||'')).length);

const campaignPaid=(id)=>s.data.campaign_payments.filter(x=>x.campaign_id===id).reduce((a,b)=>a+Number(b.amount||0),0);
const campaignBalance=(v)=>Math.max(0,roundAmount(Number(v.price||0)-campaignPaid(v.id)));
const leaseAdvance=(v)=>Math.max(0,Number(v?.advance_amount)||0);
const leasePaidInstallments=(id)=>s.data.lease_installments.filter(x=>x.lease_id===id).reduce((sum,x)=>sum+Number(x.paid_amount||0),0);
const leaseBalance=(v)=>Math.max(0,roundAmount(Number(v?.rent_total||0)-leaseAdvance(v)-leasePaidInstallments(v?.id)));

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
function rooftopSiteArea(site){
 const roof=lookup('properties',site?.rooftop_property_id);
 if(!roof)return 0;
 const stored=Number(roof.area_m2);
 const calculated=Number(roof.width_m)*Number(roof.height_m);
 return Number.isFinite(stored)&&stored>0?stored:
  (Number.isFinite(calculated)&&calculated>0?roundAmount(calculated):0);
}
function selectedRooftopAreas(ids){
 const invalid=[],sites=[];
 let area=0;
 for(const id of ids||[]){
  const site=lookup('ad_sites',id),size=rooftopSiteArea(site);
  if(!site||!site.rooftop_property_id||!(size>0)){
   invalid.push(site?.code||String(id));continue;
  }
  sites.push({id:site.id,code:site.code,name:site.name,area:size});
  area+=size;
 }
 return {area:roundAmount(area),invalid,sites};
}
function campaignSiteArea(ids){return selectedRooftopAreas(ids).area;}
function campaignFaces(v,pkg=lookup('packages',v?.package_id)){
 if(pkg?.pricing_mode==='sqm_month'||String(pkg?.code||'').toUpperCase()==='E')return 1;
 return Number(v?.ad_faces)===1?1:2;
}
function campaignFacesText(v,pkg){return campaignFaces(v,pkg)===1?'وجه واحد':'وجهان';}
function discountedByFaces(pkg,faces){
 return ['A','B','C','D'].includes(String(pkg?.code||'').toUpperCase())&&
  pkg?.pricing_mode!=='sqm_month'&&Number(faces)===1;
}
function quoteCampaign(v,ids=[]){
 const pkg=lookup('packages',v.package_id);if(!pkg)return null;
 const count=Math.max(1,Number(v.quantity)||1,(ids||[]).length);
 const area=pkg.pricing_mode==='sqm_month'?campaignSiteArea(ids):0;
 const baseUsd=quotePackageUSD(pkg,Number(v.months),count,area);
 const faces=campaignFaces(v,pkg);
 const usd=baseUsd===null?null:roundAmount(baseUsd*(discountedByFaces(pkg,faces)?0.5:1));
 return usd===null?null:{usd,total:roundAmount(convert(usd,'USD',v.currency||'USD')),quantity:count,area,faces,baseUsd};
}
function refreshCampaignQuote(){
 if(s.modal?.table!=='campaigns')return;
 const v=s.modal.data, pkg=lookup('packages',v.package_id);
 const ids=s.modal.siteIds||[];
 v.requested_area_m2=pkg?.pricing_mode==='sqm_month'?(campaignSiteArea(ids)||null):null;
 if(pkg?.pricing_mode==='sqm_month'){v.quantity=Math.max(1,ids.length);v.ad_faces=1;}
 if(!s.modal.autoPrice)return;
 const quoted=quoteCampaign(v,ids);
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

// Centralized in-app popovers replace operating-system dropdowns for every
// ordinary select while preserving the original <select> for forms, validation
// and existing onChange handlers (financial conversions, package filters, etc.).
let currentSelectPopup=null;
let selectPopupEventsBound=false;
function closeAppSelectPopup(refocus=false){
 const popup=currentSelectPopup;
 currentSelectPopup=null;
 if(!popup)return;
 popup.node?.remove();
 popup.trigger?.setAttribute?.('aria-expanded','false');
 if(refocus&&popup.trigger?.isConnected)popup.trigger.focus();
}
function appSelectLabel(select){
 const holder=select.closest?.('label');
 const text=holder?.querySelector?.(':scope > span:not(.app-select-shell)')?.textContent?.trim();
 return (text||select.getAttribute?.('aria-label')||select.name||'اختيار').replace(/\s+\*$/,'');
}
function openAppSelectPopup(select,trigger){
 if(select.disabled)return;
 if(currentSelectPopup?.source===select){closeAppSelectPopup(true);return}
 closeAppSelectPopup();
 const options=Array.from(select.options||[]);
 const choiceLabel=appSelectLabel(select);
 const panel=document.createElement('div');
 panel.className='app-select-popup';
 panel.setAttribute('role','dialog');
 panel.setAttribute('aria-label',choiceLabel);
 panel.setAttribute('dir','rtl');
 const enableSearch=options.length>=7;
 const optionMarkup=options.map((option,index)=>{
  const disabled=option.disabled||Boolean(option.parentElement?.disabled);
  const selected=option.selected;
  const label=String(option.textContent||'').trim();
  const parts=label.split(' — ');
  return '<button type="button" class="app-select-option'+(selected?' is-selected':'')+
   '" data-app-choice="'+index+'" role="option" aria-selected="'+selected+'"'+(disabled?' disabled':'')+'>'+
   '<span class="app-select-option-content"><strong>'+E(parts.shift()||'—')+'</strong>'+
   (parts.length?'<small>'+E(parts.join(' — '))+'</small>':'')+'</span>'+
   (selected?uiIcon('check',17):'<span class="app-select-empty-check" aria-hidden="true"></span>')+
   '</button>';
 }).join('');
 panel.innerHTML='<div class="app-select-popup-head"><div><small>اختيار من القائمة</small><strong>'+E(choiceLabel)+
 '</strong></div><button type="button" class="app-select-dismiss" data-app-select-close aria-label="إغلاق القائمة">'+
 uiIcon('x',16)+'</button></div>'+
 (enableSearch?'<label class="app-select-search">'+uiIcon('search',16)+
  '<input type="search" data-app-select-search autocomplete="off" placeholder="ابحث داخل الخيارات..." aria-label="بحث في '+E(choiceLabel)+'"></label>':'')+
 '<div class="app-select-options" role="listbox" aria-label="'+E(choiceLabel)+'">'+optionMarkup+'</div>'+
 '<div class="app-select-popup-foot">'+options.length+' خيار</div>';
 const width=window.innerWidth||document.documentElement.clientWidth||1000;
 if(width>680){
  const rect=trigger.getBoundingClientRect();
  const maxWidth=Math.min(465,width-24);
  const popupWidth=Math.max(240,Math.min(maxWidth,rect.width+75));
  const viewportHeight=window.innerHeight||document.documentElement.clientHeight||800;
  const preferredTop=rect.bottom+7;
  const heightEstimate=Math.min(490,140+Math.min(6,options.length)*52);
  const below=viewportHeight-rect.bottom;
  const top=below<Math.min(240,heightEstimate)&&rect.top>below?
   Math.max(12,rect.top-Math.min(heightEstimate,rect.top-14)-7):Math.max(12,preferredTop);
  panel.style.top=top+'px';
  panel.style.right=Math.max(12,width-rect.right)+'px';
  panel.style.width=popupWidth+'px';
  panel.style.maxHeight=Math.max(200,viewportHeight-top-13)+'px';
 }
 document.body.append(panel);
 currentSelectPopup={node:panel,source:select,trigger};
 trigger.setAttribute('aria-expanded','true');
 const search=panel.querySelector('[data-app-select-search]');
 const buttons=[...panel.querySelectorAll('[data-app-choice]')];
 if(search)search.addEventListener('input',()=>{
  const q=search.value.trim().toLocaleLowerCase();
  for(const button of buttons){
   const matches=button.textContent.toLocaleLowerCase().includes(q);
   button.hidden=!matches;
  }
 });
 panel.querySelector('[data-app-select-close]').onclick=()=>closeAppSelectPopup(true);
 buttons.forEach(button=>button.onclick=()=>{
  const option=options[Number(button.dataset.appChoice)];
  if(!option||option.disabled)return;
  const changed=select.value!==option.value;
  select.value=option.value;
  closeAppSelectPopup();
  if(changed)select.dispatchEvent(new Event('change',{bubbles:true}));
  else trigger.focus();
  // Selection changes still use the old select and all existing handlers.
 });
 panel.addEventListener('keydown',event=>{
  if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
  const candidates=buttons.filter(button=>!button.hidden&&!button.disabled);
  if(!candidates.length)return;
  event.preventDefault();
  const current=candidates.indexOf(document.activeElement);
  const direction=event.key==='ArrowDown'?1:-1;
  candidates[(current+direction+candidates.length)%candidates.length].focus();
 });
 if(search)search.focus();
 else (buttons.find(button=>button.classList.contains('is-selected'))||buttons.find(button=>!button.disabled))?.focus();
}
function enhanceAppSelects(){
 const selects=Array.from(document.querySelectorAll('select'));
 for(const select of selects){
  if(select.multiple||select.closest('.app-select-shell')||!select.parentNode)continue;
  const shell=document.createElement('span');
  shell.className='app-select-shell';
  select.parentNode.insertBefore(shell,select);
  shell.appendChild(select);
  select.classList.add('app-select-native');
  select.tabIndex=-1;
  select.setAttribute('aria-hidden','true');
  const trigger=document.createElement('button');
  trigger.type='button';trigger.className='app-select-trigger';
  trigger.setAttribute('aria-haspopup','listbox');
  trigger.setAttribute('aria-expanded','false');
  const sync=()=>{
   const selected=select.selectedOptions?.[0]||select.options?.[select.selectedIndex];
   trigger.innerHTML='<span>'+E(selected?.textContent?.trim()||'— اختر —')+
    '</span>'+uiIcon('chevron',16);
   trigger.setAttribute('aria-label',appSelectLabel(select)+': '+(selected?.textContent?.trim()||'اختر'));
   trigger.disabled=select.disabled;
  };
  shell.appendChild(trigger);
  select.addEventListener('change',sync);
  trigger.onclick=()=>openAppSelectPopup(select,trigger);
  sync();
 }
 if(!selectPopupEventsBound&&typeof document.addEventListener==='function'){
  selectPopupEventsBound=true;
  document.addEventListener('pointerdown',event=>{
   const active=currentSelectPopup;
   if(active&&!active.node.contains(event.target)&&!active.trigger.contains(event.target))
    closeAppSelectPopup();
  },true);
  document.addEventListener('keydown',event=>{
   if(currentSelectPopup&&event.key==='Escape'){event.preventDefault();closeAppSelectPopup(true);}
  });
  if(typeof window?.addEventListener==='function'){
   window.addEventListener('resize',()=>closeAppSelectPopup());
   window.addEventListener('scroll',event=>{
    if(currentSelectPopup&&!currentSelectPopup.node.contains(event.target))closeAppSelectPopup();
   },true);
  }
 }
}
function toast(text,bad=false){
 // Branded non-blocking alerts, never Windows/browser alert() popups.
 let stack=document.querySelector?.('#raafat-toast-stack');
 if(!stack){
  stack=document.createElement('div');
  stack.id='raafat-toast-stack';
  stack.className='raafat-toast-stack';
  stack.setAttribute?.('aria-live',bad?'assertive':'polite');
  document.body.append(stack);
 }
 // Headless test environments and older embedded webviews might implement
 // append() on body but not on generated nodes. Keep notifications functional.
 if(typeof stack?.append!=='function'){
  const fallback=document.createElement('div');
  fallback.className=bad?'error toast':'notice toast';
  fallback.textContent=text;
  document.body.append(fallback);
  setTimeout(()=>fallback.remove?.(),bad?7000:4800);
  return;
 }
 const x=document.createElement('div');
 x.className='raafat-toast'+(bad?' is-error':' is-success');
 x.setAttribute?.('role',bad?'alert':'status');
 x.innerHTML='<span class="raafat-toast-icon">'+uiIcon(bad?'alert':'check',19)+'</span>'+
  '<span class="raafat-toast-copy"><strong>'+(bad?'تحتاج مراجعة':'تم التنفيذ')+
  '</strong><span>'+E(text)+'</span></span>'+
  '<button type="button" class="raafat-toast-close" aria-label="إغلاق التنبيه">'+uiIcon('x',16)+'</button>';
 x.querySelector?.('.raafat-toast-close')?.addEventListener('click',()=>x.remove());
 stack.append(x);
 if(stack.children?.length>4)stack.firstElementChild?.remove();
 setTimeout(()=>x.remove(),bad?7000:4800);
}


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
    const source=table==='employees'&&!canAccess('employees','read')?'raafat_employee_directory':table;
    const {data,error}=await s.client.from(source).select('*').order('created_at',{ascending:false}).range(start,start+999);
    if(error)throw error;
    all.push(...(data||[]));
    if(!data||data.length<1000)return all;
   }
   throw Error('تجاوز عدد سجلات '+table+' حد التحميل المسموح؛ يلزم ترحيل عرض القائمة إلى صفحات.');
  };
  const requests=await Promise.all([...keys.map(fetchAll),s.client.from('settings').select('*').eq('id',1).maybeSingle(),
   canAccess('activity_logs','read')?
    s.client.from('activity_logs').select('*').order('occurred_at',{ascending:false}).limit(300):
    Promise.resolve({data:[],error:null})]);
  for(let i=0;i<keys.length;i++)s.data[keys[i]]=requests[i]||[];
  if(requests[keys.length].error)throw requests[keys.length].error;
  s.settings=requests[keys.length].data||s.settings;
  s.activityLogs=requests[keys.length+1].error?[]:requests[keys.length+1].data||[];
  s.error=requests[keys.length+1].error&&canAccess('activity_logs','read')?
    'تعذر تحميل سجل الحركات: '+requests[keys.length+1].error.message:'';
  subscribeToExchangeRate();
  if(canAccess('inventory','read')){await inventory.reload({silent:true});inventory.startPolling();}
 }catch(e){s.error=e.message||String(e)}
 s.loading=false;render();
}
function demo(){
 s.demo=true;s.session=null;s.staff={role:'admin'};s.config=PUBLIC_CONFIG;if(s.demoLogoUrl){URL.revokeObjectURL(s.demoLogoUrl);s.demoLogoUrl=null;}s.data=Object.fromEntries(keys.map(k=>[k,[]]));s.data.packages=seededDemoPackages();s.data.package_rates=seededDemoRates();s.settings={...COMPANY_DEFAULTS,usd_iqd:1500};
 inventory.resetDemo();s.view='dashboard';s.activityLogs=[];s.error='';render();
}
async function connect(){
 const url=$('#url').value.trim(),key=$('#key').value.trim(),email=toAuthEmail($('#email').value),password=$('#password').value;
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
 return '<div class="welcome"><div class="authbox"><h1>استعادة كلمة المرور</h1><p class="muted">الحسابات الداخلية @raafat يتولى المدير الرئيسي تغيير رمزها من لوحة الحسابات. الاستعادة عبر البريد للحسابات الحقيقية فقط.</p><form id="passwordResetRequestForm"><label class="field"><span>البريد الإلكتروني</span><input id="recoverEmail" type="email" autocomplete="email" required></label><button class="btn" type="submit">إرسال رابط الاستعادة</button></form><hr><button class="btn secondary" style="width:100%" data-action="cancelPasswordReset">العودة إلى تسجيل الدخول</button></div></div>';
}
function passwordRecoveryPage(){
 return '<div class="welcome"><div class="authbox"><h1>إنشاء كلمة مرور جديدة</h1><p class="muted">استعمل كلمة قوية من 12 حرفاً على الأقل. لن تُرسل الكلمة إلى GitHub ولا تُعرض في المحادثة.</p>'+(s.session?'<form id="passwordChangeForm"><label class="field"><span>كلمة المرور الجديدة</span><input id="newPassword" type="password" minlength="12" required autocomplete="new-password"></label><label class="field"><span>تأكيد كلمة المرور</span><input id="confirmPassword" type="password" minlength="12" required autocomplete="new-password"></label><button class="btn" type="submit">حفظ كلمة المرور الجديدة</button></form>':'<div class="error">رابط الاستعادة غير صالح أو انتهت صلاحيته. ارجع إلى شاشة الدخول واطلب رابطاً جديداً.</div><button class="btn secondary" data-action="cancelPasswordReset">العودة إلى الدخول</button>')+'</div></div>';
}
async function sendPasswordReset(){
 const email=$('#recoverEmail')?.value?.trim();
 if(/@raafat(?:\.example)?$/i.test(email||''))return toast('تغيير رمز حسابات @raafat يتم من لوحة المدير الرئيسي.',true);
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
function authPage(){return '<div class="welcome"><div class="authbox"><h1>رأفت</h1><p class="muted">نظام الإدارة المتكامل للدعاية والإعلان</p><p class="subtle">ربط قاعدة البيانات الخاصة بالشركة وتسجيل دخول الموظفين</p>'+ (s.error?'<div class="error">'+E(s.error)+'</div>':'')+
 '<form id="connectForm"><input type="hidden" id="url" value="'+E(s.config?.url||'')+'"><input type="hidden" id="key" value="'+E(s.config?.key||'')+'"><label class="field"><span>اسم الدخول أو البريد الإلكتروني</span><input id="email" type="text" placeholder="ahmed@raafat" autocomplete="username" required></label><label class="field"><span>كلمة المرور</span><input id="password" type="password" autocomplete="current-password" required></label><button class="btn" type="submit">دخول النظام</button></form><button class="linkbtn" data-action="forgotPassword" type="button">نسيت كلمة المرور؟</button><hr><button class="btn secondary" style="width:100%" data-action="demo">تجربة الواجهة بدون حفظ البيانات</button><p class="subtle" style="margin-top:14px">المعاينة مؤقتة وتُمحى بياناتها بمجرد تحديث الصفحة. لا تدخل معلومات حقيقية فيها.</p></div></div>';}


// Consistent inline outline SVG icons — no external icon fonts or CDN.
const UI_ICON_PATHS={
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 message:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
 copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
 dashboard:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 users:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2M17 3a4 4 0 0 1 0 8M22 21v-2a5 5 0 0 0-4-5"/>',
 user:'<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
 layers:'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 17l9 5 9-5"/>',
 megaphone:'<path d="m3 11 18-5v12L3 13v-2ZM11 15v4a2 2 0 0 1-4 0v-5"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 13h8M8 17h8"/>',
 pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 wallet:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M16 14h.01"/>',
 building:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>',
 house:'<path d="m3 10 9-8 9 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10ZM9 22v-8h6v8"/>',
 receipt:'<path d="M4 2v20l4-2 4 2 4-2 4 2V2l-4 2-4-2-4 2-4-2ZM8 9h8M8 13h8"/>',
 chart:'<path d="M3 3v18h18M7 17v-5h3v5M13 17V7h3v10M19 17v-8h2"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.5 1.5 0 0 0 .3 1.6l-2.1 2.1a1.5 1.5 0 0 0-1.6-.3l-1.2.5a1.5 1.5 0 0 0-1 1.4h-3.6a1.5 1.5 0 0 0-1-1.4L8 18.4a1.5 1.5 0 0 0-1.6.3l-2.1-2.1a1.5 1.5 0 0 0 .3-1.6L4 13.8a1.5 1.5 0 0 0-1.4-1v-2a1.5 1.5 0 0 0 1.4-1L4.6 8a1.5 1.5 0 0 0-.3-1.6l2.1-2.1A1.5 1.5 0 0 0 8 4.6l1.2-.5a1.5 1.5 0 0 0 1-1.4h3.6a1.5 1.5 0 0 0 1 1.4l1.2.5a1.5 1.5 0 0 0 1.6-.3l2.1 2.1a1.5 1.5 0 0 0-.3 1.6l.5 1.2a1.5 1.5 0 0 0 1.4 1v2a1.5 1.5 0 0 0-1.4 1Z"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 pencil:'<path d="m16 5 3 3M3 21l4.5-1 12-12a2.12 2.12 0 0 0-3-3l-12 12L3 21Z"/>',
 trash:'<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',
 check:'<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
 printer:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 logout:'<path d="M10 17l5-5-5-5m5 5H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
 shield:'<path d="m12 22 8-4V6l-8-4-8 4v12l8 4Zm-3-10 2 2 4-4"/>',
 alert:'<circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 17h.01"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
 money:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
 save:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v7h10V3M7 21v-8h10v8"/>'
};
function uiIcon(name,size=18){
 const path=UI_ICON_PATHS[name]||UI_ICON_PATHS.alert;
 const dimension=Number(size)>=12&&Number(size)<=32?Number(size):18;
 return '<svg class="ui-icon" xmlns="http://www.w3.org/2000/svg" width="'+dimension+'" height="'+dimension+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+path+'</svg>';
}

const NAV_GROUPS=[
 {id:'customers',title:'الزبائن والإعلانات',subtitle:'العملاء والحجوزات والعقود',icon:'users',items:[
  ['customers','العملاء','user'],
  ['packages','الباقات الإعلانية','layers'],
  ['campaigns','المشاريع والحملات','megaphone'],
  ['customer_contracts','عقود الزبائن','file'],
  ['ad_sites','المواقع الإعلانية','pin'],
  ['campaign_payments','دفعات الحملات','wallet']
 ]},
 {id:'landlords',title:'مؤجّرو الأسطح والبنايات',subtitle:'المالكون والعقارات والإيجارات',icon:'building',items:[
  ['landlords','مالكو الأسطح والبنايات','users'],
  ['properties','الأسطح والعقارات','house'],
  ['leases','عقود مالكي الأسطح','file'],
  ['lease_installments','دفعات إيجار الأسطح','receipt']
 ]},
 {id:'inventory',title:'المخازن والعهد',subtitle:'إدخال وإخراج واسترجاع وجرد',icon:'layers',items:[
  ['inventory','إدارة المخازن','layers']
 ]},
 {id:'finance',title:'المالية',subtitle:'إدارة الفواتير والمصروفات',icon:'wallet',items:[
  ['company_expenses','الفواتير والمصروفات','receipt'],
  ['employees','الموظفون والرواتب','users']
 ]}
];
function navGroupForView(view){return NAV_GROUPS.find(group=>group.items.some(item=>item[0]===view))?.id||null;}
s.navExpanded=navGroupForView(s.view);
function navLink(id,label,icon){
 const active=id===s.view;
 return '<button type="button" data-nav="'+id+'" class="nav-link'+(active?' active':'')+'"'+(active?' aria-current="page"':'')+'><span class="nav-link-icon" aria-hidden="true">'+uiIcon(icon,19)+'</span><span>'+label+'</span></button>';
}
function navGroup(group){
 const expanded=s.navExpanded===group.id,contains=navGroupForView(s.view)===group.id;
 return '<div class="nav-group'+(contains?' has-active':'')+'"><button type="button" class="nav-group-toggle'+(expanded?' expanded':'')+'" data-nav-group="'+group.id+'" aria-expanded="'+expanded+'" aria-controls="nav-group-'+group.id+'"><span class="nav-group-icon" aria-hidden="true">'+uiIcon(group.icon,20)+'</span><span class="nav-group-copy"><strong>'+group.title+'</strong><small>'+group.subtitle+'</small></span><span class="nav-group-chevron" aria-hidden="true">'+uiIcon('chevron',17)+'</span></button><div class="nav-group-items" id="nav-group-'+group.id+'" role="group" aria-label="'+group.title+'"'+(expanded?'':' hidden')+'>'+group.items.filter(([id])=>canAccess(TABLE_ACCESS[id]||id,'read'))
 .map(([id,label,icon])=>navLink(id,label,icon)).join('')+'</div></div>';
}
function nav(){
 return navLink('dashboard','الرئيسية','dashboard')+
  '<div class="nav-group-list">'+NAV_GROUPS.map(navGroup).join('')+'</div>'+
  '<div class="nav-utility"><small class="nav-utility-label">الإدارة العامة</small>'+
  (canAccess('reports','read')?navLink('reports','التقارير','chart'):'')+
  (canAccess('activity_logs','read')?navLink('activity_logs','سجل الحركات','history'):'')+
   ((s.demo||s.staff?.role==='admin')?navLink('staff_admin','إدارة الحسابات والصلاحيات','users'):'')+
  (canAccess('settings','read')?navLink('settings','الإعدادات','settings'):'')+'</div>';
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
  const staffAdminRequested=s.view==='staff_admin';
  localStorage.setItem('raafat-last-view',s.view);
  s.navExpanded=navGroupForView(s.view);
  s.search='';s.filter='all';s.expenseCategory='';s.campaignPaymentFocusId=null;s.modal=null;
  render();
  if(staffAdminRequested&&!s.managedStaff)refreshManagedStaff();
 });
 document.querySelectorAll('[data-nav-group]').forEach(x=>x.onclick=()=>changeNavGroup(x.dataset.navGroup));
}
function updateInventoryAlertBadge(){
 const button=document?.querySelector?.('[data-alerts-nav]');
 if(!button)return;
 const n=alertsList().length+inventory.alertCount();
 let bubble=button.querySelector?.('span');
 if(n<=0){if(bubble)bubble.remove();return;}
 if(!bubble){bubble=document.createElement('span');button.appendChild(bubble);}
 bubble.textContent=String(n>99?'99+':n);
}
function shell(content){
 return '<div class="shell"><aside class="sidebar"><div class="brand brand-company"><div class="sidebar-logo-frame">'+companyLogoHtml('sidebar')+'</div><div class="brand-company-name"><strong>'+E(companyValue('company_short_name'))+'</strong><small>'+E(companyValue('company_tagline'))+'</small></div></div><div class="nav">'+nav()+'</div><div class="asidefoot">'+(s.demo?'وضع المعاينة — لا يتم حفظ أي معلومات':'اتصال آمن — حساب موظف')+'</div></aside><main class="main"><header class="top"><div><h1>'+E(s.view==='dashboard'?'لوحة التحكم':s.view==='alerts'?'التنبيهات':s.view==='reports'?'التقارير':s.view==='settings'?'الإعدادات':
 s.view==='activity_logs'?'سجل الحركات':s.view==='staff_admin'?'إدارة الحسابات والصلاحيات':s.view==='inventory'?'إدارة المخازن والعهد':
  defs[s.view]?.title||'النظام')+'</h1><small>'+E(companyValue('company_name'))+'</small></div><div class="inline"><button type="button" class="reminder-bell" data-alerts-nav aria-label="فتح التنبيهات" title="التنبيهات">'+uiIcon('bell',19)+(alertsList().length+inventory.alertCount()?'<span>'+E(Math.min(99,alertsList().length+inventory.alertCount()))+'</span>':'')+'</button><label class="currency-switch">عرض الأسعار <select id="globalCurrency"><option value="IQD" '+(s.displayCurrency==='IQD'?'selected':'')+'>IQD — دينار</option><option value="USD" '+(s.displayCurrency==='USD'?'selected':'')+'>USD — دولار</option></select></label><span class="pill">'+(s.demo?'تجريبي':'متصل')+'</span><button class="btn secondary mini" data-action="logout">'+uiIcon('logout',16)+(s.demo?'خروج':'تسجيل خروج')+'</button></div></header><section class="content">'+(s.error?'<div class="error">'+E(s.error)+'</div>':'')+(s.demo?'<div class="notice">وضع تجربة مؤقت — بيانات المعاينة غير محفوظة. لا تدخل معلومات حساسة هنا.</div>':'')+(s.loading?'<p>جارٍ تحميل البيانات...</p>':content)+'</section></main></div>';
}
// Alerts are derived from live balances and contracts; they do not mutate records.
function alertsLocalDate(){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Baghdad',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
function alertDayDistance(date,reference=alertsLocalDate()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))return null;
 const a=Date.parse(date+'T00:00:00Z'),b=Date.parse(reference+'T00:00:00Z');
 return Number.isFinite(a)&&Number.isFinite(b)?Math.round((a-b)/86400000):null;
}
function alertsList(reference=alertsLocalDate()){
 const result=[];
 function add(row){
  const days=alertDayDistance(row.date,reference);
  if(days===null||days>30)return;
  if(row.kind==='expiry'&&days< -30)return;
  result.push({...row,days});
 }
 for(const installment of s.data.lease_installments){
  const lease=lookup('leases',installment.lease_id),owner=lookup('landlords',lease?.landlord_id);
  const balance=roundAmount(Number(installment.amount||0)-Number(installment.paid_amount||0));
  if(!lease||!owner||balance<=0)continue;
  add({key:'lease-payment:'+installment.id,kind:'payment',party:'landlord',table:'lease_installments',id:installment.id,
   date:installment.due_date,name:owner.name,phone:owner.phone,subject:nameOf('properties',lease.property_id),
   contractNumber:numberedContract(lease.contract_number),title:'دفعة إيجار سطح',
   description:'دفعة مستحقة لمالك السطح',amount:balance,currency:lease.currency});
 }
 for(const campaign of s.data.campaigns){
  const customer=lookup('customers',campaign.customer_id),balance=campaignBalance(campaign);
  if(!customer||balance<=0||!campaign.next_payment_due_date)continue;
  add({key:'customer-payment:'+campaign.id,kind:'payment',party:'customer',table:'campaigns',id:campaign.id,
   date:campaign.next_payment_due_date,name:customer.name,phone:customer.phone,subject:campaign.title,
   title:'دفعة زبون مستحقة',description:'الرصيد المتبقي على الحملة',amount:balance,currency:campaign.currency});
 }
 for(const lease of s.data.leases){
  if(s.data.leases.some(next=>next.renewed_from===lease.id))continue;
  const owner=lookup('landlords',lease.landlord_id);
  if(!owner)continue;
  add({key:'lease-expiry:'+lease.id,kind:'expiry',party:'landlord',table:'leases',id:lease.id,
   date:lease.end_date,name:owner.name,phone:owner.phone,subject:nameOf('properties',lease.property_id),
   contractNumber:numberedContract(lease.contract_number),title:'انتهاء عقد إيجار سطح',
   description:'التنسيق حول تجديد عقد المالك'});
 }
 for(const contract of s.data.customer_contracts){
  const customer=lookup('customers',contract.customer_id);
  if(!customer)continue;
  add({key:'customer-expiry:'+contract.id,kind:'expiry',party:'customer',table:'customer_contracts',id:contract.id,
   date:contract.end_date,name:customer.name,phone:customer.phone,
   subject:lookup('campaigns',contract.campaign_id)?.title||contract.campaign_title_snapshot||'إعلان',
   contractNumber:numberedContract(contract.contract_number),title:'انتهاء عقد زبون',
   description:'التنسيق بخصوص تجديد الإعلان'});
 }
 return result.sort((a,b)=>a.days-b.days||a.key.localeCompare(b.key));
}
function alertWhen(item){
 return item.days===0?'اليوم':item.days<0?
  (item.kind==='expiry'?'منتهي منذ ':'متأخر ')+Math.abs(item.days)+' يوم':
  'بعد '+item.days+' '+(item.days===1?'يوم':'أيام');
}
function whatsappIraqNumber(phone){
 let digits=String(phone||'').replace(/\D/g,'');
 if(digits.startsWith('00964'))digits=digits.slice(2);
 if(/^07\d{9}$/.test(digits))digits='964'+digits.slice(1);
 else if(/^7\d{9}$/.test(digits))digits='964'+digits;
 return /^9647\d{9}$/.test(digits)?digits:'';
}
function reminderText(item){
 const intro='السلام عليكم '+item.name+'،\nتحية طيبة من شركة رأفت للدعاية والإعلان والتجارة العامة.\n';
 const contract=item.contractNumber?' رقم '+item.contractNumber:'';
 if(item.key.startsWith('customer-payment:'))return intro+
  'نود تذكيركم بأن موعد دفعة حملة «'+item.subject+'» '+(item.days<0?'كان بتاريخ ':'هو بتاريخ ')+item.date+
  '. الرصيد المتبقي على الحملة '+money(item.amount,item.currency)+
  '. نرجو التنسيق معنا بشأن الدفعة، ولكم جزيل الشكر.';
 if(item.key.startsWith('lease-payment:'))return intro+
  'نود التنسيق معكم بشأن دفعة إيجار السطح «'+item.subject+'» للعقد'+contract+
  (item.days<0?'، وكان موعدها ':'، وموعدها ')+item.date+'، والمبلغ المتبقي من هذه الدفعة '+money(item.amount,item.currency)+
  '. يرجى التواصل معنا لتأكيد إجراءات التسديد، مع الشكر.';
 if(item.party==='landlord')return intro+
  'نود إعلامكم بأن عقد استئجار السطح «'+item.subject+'»'+contract+
  (item.days<0?' انتهى بتاريخ ':' ينتهي بتاريخ ')+item.date+
  '. يرجى التنسيق معنا بخصوص التجديد، مع فائق الاحترام.';
 return intro+'نود تذكيركم بأن عقدكم الإعلاني'+contract+' الخاص بـ«'+item.subject+'»'+
  (item.days<0?' انتهى بتاريخ ':' سينتهي بتاريخ ')+item.date+
  '. يسعدنا التنسيق معكم بخصوص تجديد العقد واستمرار الإعلان، شكراً لثقتكم.';
}


function alertsView(){
 const all=alertsList(),filter=s.alertFilter||'all';
 const shown=all.filter(a=>filter==='all'||filter===a.kind||filter==='due'&&a.days<=0);
 const urgent=all.filter(a=>a.days<=0).length;
 const tabs=[['all','الكل'],['due','المستحق الآن'],['payment','الدفعات'],['expiry','العقود']];
 const cards=shown.map(a=>'<article class="reminder-card '+(a.days<=0?'reminder-overdue':'')+'">'+
  '<div class="reminder-card-main"><div class="reminder-card-flags"><span class="reminder-type">'+
  uiIcon(a.kind==='payment'?'wallet':'calendar',15)+' '+(a.kind==='payment'?'دفعة':'عقد')+
  '</span><span class="reminder-days">'+E(alertWhen(a))+'</span></div>'+
  '<h3>'+E(a.title)+'</h3><p>'+E(a.name)+' <span>·</span> '+E(a.subject)+'</p>'+
  '<small>'+E(a.date)+' <span>·</span> '+E(a.description)+
  (a.amount!=null?' <span>·</span> '+E(money(a.amount,a.currency)):'')+'</small></div>'+
  '<div class="reminder-actions"><button type="button" class="btn mini" data-reminder-compose="'+E(a.key)+'">'+
  uiIcon('message',15)+' تجهيز رسالة</button>'+
  '<button type="button" class="btn mini secondary" data-reminder-open="'+E(a.key)+'">فتح السجل</button></div></article>').join('');
 return '<section class="reminders-page">'+
  '<div class="reminder-title"><div><h2>التنبيهات والمواعيد</h2>'+
  '<p>مواعيد من بيانات الشركة؛ دفعات الزبائن تظهر بعد تحديد موعدها بالحملة. كل الرسائل تُراجع قبل الإرسال.</p></div>'+
  '<span class="reminder-total">'+all.length+' تنبيه'+(urgent?' · '+urgent+' مستحق':'')+'</span></div>'+
  '<div class="reminder-filters">'+tabs.map(([value,title])=>
  '<button type="button" data-reminder-filter="'+value+'" class="reminder-filter '+(value===filter?'selected':'')+'">'+title+'</button>').join('')+'</div>'+
  '<div class="reminders-list">'+(cards||'<div class="reminders-empty">'+uiIcon('check',23)+
  '<strong>ماكو تنبيهات بهذا التصنيف</strong><small>تظهر المواعيد قبل 30 يوم.</small></div>')+
  '</div>'+inventory.alertHtml()+'<p class="reminders-footnote">الدفعات المتأخرة تبقى ظاهرة حتى التسديد. انتهاء العقود يظهر قبل 30 يوماً وبعده لمدة 30 يوماً. لا تُرسل رسائل تلقائياً.</p></section>';
}
function reminderMessageDialog(){
 const item=alertsList().find(a=>a.key===s.modal?.alertKey);
 if(!item)return '<div class="overlay"><div class="modal"><div class="notice">هذا التنبيه لم يعد مستحقاً أو تغيّر السجل.</div><button class="btn secondary" data-action="close">إغلاق</button></div></div>';
 const phone=whatsappIraqNumber(item.phone);
 return '<div class="overlay"><div class="modal reminder-modal"><div class="modalhead"><h2>تجهيز رسالة التذكير</h2>'+
  '<button type="button" class="close" data-action="close">'+uiIcon('x',19)+'</button></div>'+
  '<div class="reminder-recipient"><strong>'+E(item.name)+'</strong><small>'+E(item.phone||'لا يوجد رقم هاتف')+'</small></div>'+
  '<label class="field"><span>تگدر تعدّل النص قبل إرساله</span>'+
  '<textarea id="reminderMessageText" rows="8">'+E(reminderText(item))+'</textarea></label>'+
  '<p class="subtle">واتساب يفتح الرسالة جاهزة، والإرسال النهائي يصير بإيدك فقط.</p>'+
  '<div class="actions"><button type="button" class="btn secondary" data-reminder-copy>'+
  uiIcon('copy',15)+' نسخ النص</button>'+
  '<button type="button" class="btn" data-reminder-whatsapp'+(phone?'':' disabled')+'>'+
  uiIcon('message',16)+' فتح واتساب</button></div>'+
  (phone?'':'<div class="notice">رقم الهاتف غير صالح لواتساب. صححه ببيانات الزبون أو المالك.</div>')+'</div></div>';
}

const EXPENSE_CATEGORY_LABELS={
 hospitality:'ضيافة ومشروبات',office:'قرطاسية ومكتبية',transport:'نقل ووقود',
 maintenance:'صيانة',supplies:'مستلزمات',utilities:'خدمات وفواتير',other:'مصروفات أخرى',
 salaries:'رواتب وأجور الموظفين',
 rent_services:'إيجار المقر وفواتير الخدمات',
 hospitality_misc:'ضيافة ونثريات المكتب (أثاث، إلكترونيات، وغيرها)',
 design_subscriptions:'اشتراكات برامج وأدوات التصميم',
 stationery:'مستلزمات مكتبية وقرطاسية',
 equipment_maintenance:'صيانة أجهزة ومعدات التصوير',
 local_transport:'مواصلات وتنقلات داخلية',
 internet_telecom:'إنترنت واتصالات'
};
const EXPENSE_CATEGORY_OPTIONS=[
 'rent_services','hospitality_misc','design_subscriptions',
 'stationery','equipment_maintenance','local_transport','internet_telecom'
];
const EXPENSE_DEPARTMENTS=[
 ['general','الإدارة العامة'],
 ['graphic_design','قسم التصميم والجرافيك'],
 ['production','قسم الإنتاج والتصوير'],
 ['marketing','قسم التسويق وإدارة الحسابات'],
 ['development','قسم البرمجة وتطوير المواقع'],
 ['shared','الخدمات الإدارية والمشتركة'],
 ['cleaning','التنظيف']
];
const EXPENSE_EMPLOYEES=[
 ['حسين علاء','المدير التنفيذي'],
 ['احمد اسماعيل','التصميم'],
 ['امال عبد','عاملة تنظيف'],
 ['رأفت عبد الرزاق','المدير المفوض']
];

const ACCESS_SECTIONS=[
 ['customers','الزبائن'],
 ['packages','الباقات وأسعارها'],
 ['campaigns','الحملات'],
 ['customer_contracts','عقود الزبائن'],
 ['ad_sites','المواقع الإعلانية'],
 ['campaign_payments','دفعات الحملات'],
 ['landlords','المالكون والعقارات'],
 ['leases','عقود الأسطح وأقساطها'],
 ['expenses','المصروفات والفواتير'],
 ['employees','سجلات الموظفين'],
 ['payroll','صرف الرواتب وسنداتها'],
 ['inventory','المخازن والعهد'],
 ['reports','التقارير'],
 ['activity_logs','سجل الحركات'],
 ['settings','إعدادات الشركة']
];
const TABLE_ACCESS={
 customers:'customers',packages:'packages',package_rates:'packages',
 campaigns:'campaigns',campaign_sites:'campaigns',customer_contracts:'customer_contracts',
 ad_sites:'ad_sites',campaign_payments:'campaign_payments',landlords:'landlords',
 properties:'landlords',leases:'leases',lease_installments:'leases',
 company_expenses:'expenses',employees:'employees',payroll_payments:'payroll',inventory:'inventory'
};
function canAccess(module,action='read'){
 if(s.demo||s.staff?.role==='admin')return true;
 if(!s.staff||s.staff.active===false)return false;
 const perms=s.staff.permissions||[];
 if(s.staff.role==='custom_admin')return perms.includes(module+'.'+action)||
  ['read','create'].includes(action)&&perms.includes(module+'.edit');
 if(s.staff.role==='staff'){
  if(action==='read')return !['employees','payroll','activity_logs'].includes(module);
  if(action==='create')return !['employees','payroll','activity_logs','settings'].includes(module);
  return action==='edit'&&!['employees','payroll','activity_logs','settings','expenses'].includes(module);
 }
 return false;
}
function adminRoleLabel(role){
 return ({admin:'المدير الرئيسي',staff:'موظف',custom_admin:'مدير بصلاحيات مخصصة'})[role]||'موظف';
}

function expenseLineItems(expense){
 if(Array.isArray(expense?.expense_items)&&expense.expense_items.length)
  return expense.expense_items.map(item=>({
   description:String(item.description||''),
   category:String(item.category||''),
   department:String(item.department||''),
   quantity:Number(item.quantity)||1,unit_price:Number(item.unit_price)||0
  }));
 // Older simple expense records are displayed as a single item without mutation.
 return [{description:String(expense?.title||''),category:String(expense?.category||''),
  department:'',quantity:1,unit_price:Number(expense?.amount)||0}];
}
function expenseLineTotal(item){return roundAmount(Number(item.quantity||0)*Number(item.unit_price||0))}
function expenseInvoiceTotal(items){return roundAmount(items.reduce((sum,item)=>sum+expenseLineTotal(item),0))}
function expensePaidAmount(expense){
 // Previous records were always recorded as paid before payment tracking existed.
 return expense?.paid_amount==null?Number(expense?.amount||0):Number(expense.paid_amount)||0;
}
function expensePaymentStatus(expense){
 const total=Number(expense?.amount||0),paid=expensePaidAmount(expense);
 return paid<=0?'unpaid':paid>=total-0.001?'paid':'partial';
}
const EXPENSE_PAYMENT_LABELS={paid:'مدفوعة بالكامل',partial:'مدفوعة جزئياً',unpaid:'غير مدفوعة'};
function expenseItemDetailsText(expense){
 return expenseLineItems(expense).map(item=>item.description).filter(Boolean).join('، ');
}
function expenseInvoiceValidated(values,items){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(values.expense_date||'')))throw Error('يجب تحديد تاريخ الفاتورة.');
 if(!['IQD','USD'].includes(values.currency))throw Error('يرجى تحديد عملة الفاتورة.');
 if(!items.length||items.length>100)throw Error('يجب أن تحتوي الفاتورة على صنف واحد على الأقل وبحد أقصى 100 صنف.');
 if(items.some(item=>item.category==='salaries'))throw Error('صرف الرواتب صار حصراً من قسم الموظفين والرواتب، وليس من المصروفات.');
 const knownStaff=[...new Set([...(s.data.employees||[]).map(row=>row.name),
  ...EXPENSE_EMPLOYEES.map(([name])=>name)])];
 if(!knownStaff.includes(values.paid_by)&&
  !(values.id&&values.paid_by===lookup('company_expenses',values.id)?.paid_by))
  throw Error('يرجى تحديد الموظف المسؤول أو المستلم من القائمة.');
 for(let i=0;i<items.length;i++){
  const x=items[i];
  if(!String(x.description||'').trim()||String(x.description).trim().length>200)throw Error('يرجى كتابة بيان الصنف رقم '+(i+1)+' بشكل صحيح.');
  if(!EXPENSE_CATEGORY_LABELS[x.category])throw Error('يرجى تحديد التصنيف المحاسبي للصنف رقم '+(i+1)+'.');
  if(!EXPENSE_DEPARTMENTS.some(([id])=>id===x.department)&&
   !(values.id&&x.department===''))
   throw Error('يرجى تحديد القسم المستفيد من الصنف رقم '+(i+1)+'.');
  if(!Number.isInteger(Number(x.quantity))||Number(x.quantity)<=0||Number(x.quantity)>100000)
   throw Error('كمية الصنف رقم '+(i+1)+' يجب أن تكون عدداً صحيحاً موجباً.');
  if(!(Number(x.unit_price)>0)||!Number.isFinite(Number(x.unit_price))||Number(x.unit_price)>100000000000)
   throw Error('يرجى تحديد سعر الوحدة للصنف رقم '+(i+1)+'.');
 }
 const salaryLines=items.filter(item=>item.category==='salaries');
 if(salaryLines.length)throw Error('صرف الرواتب صار حصراً من قسم الموظفين والرواتب، وليس من المصروفات.');
 const amount=expenseInvoiceTotal(items);
 if(!(amount>0)||!Number.isFinite(amount))throw Error('إجمالي الفاتورة غير صالح.');
 const mode=values.status;
 if(!['paid','partial','unpaid'].includes(mode))throw Error('يرجى تحديد حالة الدفع.');
 const paid=mode==='paid'?amount:mode==='unpaid'?0:Number(values.paid_amount);
 if(!Number.isFinite(paid)||paid<0||paid>amount||mode==='partial'&&!(paid>0&&paid<amount))
  throw Error('المبلغ المدفوع جزئياً يجب أن يكون أكبر من صفر وأقل من إجمالي الفاتورة.');
 if(!['cash','mastercard'].includes(values.payment_method))throw Error('يرجى تحديد طريقة الدفع.');
 if(String(values.receipt_number||'').trim().length>80)throw Error('رقم الوصل يتجاوز الحد المسموح.');
 return {amount,paid_amount:roundAmount(paid)};
}

const visibleTable=(k)=>s.data[k]||[];
function dashboard(){
 let due=s.data.lease_installments.filter(x=>Number(x.paid_amount)<Number(x.amount)&&x.due_date<=today()).length;
 let paid=s.data.campaign_payments.reduce((a,x)=>a+convert(x.amount,originalCurrency('campaign_payments',x),s.displayCurrency),0);
 const active=s.data.customers.filter(x=>x.status==='active').length;
 return '<div class="cards">'+[['العملاء',s.data.customers.length],['الحملات',s.data.campaigns.length],['عقود الزبائن',s.data.customer_contracts.length],['عقود مالكي الأسطح',s.data.leases.length]].map(([t,n])=>'<div class="box stat"><small>'+t+'</small><b>'+fmt(n)+'</b></div>').join('')+'</div><div class="box"><h2>ملخص النشاط المرتبط</h2><div class="summary"><div><small>العملاء الفعالون</small><b>'+active+'</b></div><div><small>مالكو الأسطح / العقارات</small><b>'+s.data.landlords.length+' / '+s.data.properties.length+'</b></div><div><small>إجمالي دفعات الحملات المحوّل</small><b>'+E(money(paid,s.displayCurrency))+'</b></div><div><small>سعر الدولار المحدد في الإعدادات</small><b>'+fmt(s.settings.usd_iqd)+' د.ع</b></div></div><p class="subtle" style="margin-top:15px">جميع مبالغ العرض تتبدّل فوراً من قائمة العملة بالأعلى؛ المبالغ الأصلية للعقود والدفعات لا تتغير.</p></div>';
}
const columns={
 employees:[['name','الموظف'],['job_title','المنصب'],['department','القسم'],
  ['salary_amount','الراتب الشهري'],['salary_currency','العملة'],['active','الحالة']],
 customers:[['name','العميل'],['phone','الهاتف'],['status','الحالة'],['campaign_count','الحملات']],
 packages:[['code','الرمز'],['name','الباقة'],['package_type','النوع'],['width_m','العرض م'],['height_m','الطول م'],['area_m2','م²'],['default_months','الأشهر'],['price','السعر']],
 landlords:[['name','المالك'],['phone','الهاتف'],['governorate','المحافظة'],['properties_count','العقارات']],
 properties:[['title','السطح'],['landlord_id','المالك'],['width_m','العرض م'],['height_m','الطول م'],['area_m2','المساحة م²'],['quantity','العدد']],
 ad_sites:[['code','الرمز'],['name','الموقع'],['package_id','الباقة'],['site_type','النوع'],['governorate','المحافظة'],['active','الحالة'],['rooftop_property_id','العقار المرتبط']],
 leases:[['contract_number','رقم العقد'],['landlord_id','المالك'],['property_id','العقار'],['rent_total','الإيجار'],['lease_balance','المتبقي'],['end_date','النهاية']],
 campaigns:[['title','الحملة'],['customer_id','العميل'],['package_id','الباقة'],['sites','المواقع'],['price','السعر'],['campaign_balance','المتبقي']],
 campaign_payments:[['campaign_id','الحملة'],['paid_at','التاريخ'],['amount','الدفعة']],
 company_expenses:[['expense_date','التاريخ'],['title','المصروف'],['category','التصنيف'],['amount','المبلغ'],['paid_by','صرف بواسطة']],
 customer_contracts:[['contract_number','رقم العقد'],['customer_id','الزبون'],['package_id','الباقة'],['contract_type','النوع'],['start_date','من'],['end_date','إلى'],['amount','القيمة']],
 lease_installments:[['lease_id','العقد والمالك'],['due_date','تاريخ الاستحقاق'],['amount','المبلغ'],['paid_amount','المدفوع']]
};
function showVal(k,row,f){
 let v=row[f];
 if(f==='category'&&k==='company_expenses')return E(EXPENSE_CATEGORY_LABELS[v]||v);
 if(k==='employees'&&f==='department')return E(EXPENSE_DEPARTMENTS.find(([id])=>id===v)?.[1]||v);
 if(k==='employees'&&f==='salary_amount')return displayMoney(v,row.salary_currency||'IQD');
 if(k==='employees'&&f==='salary_currency')return E(labels[v]||v);
 if(f==='status')return '<span class="pill '+E(v)+'">'+E(labels[v]||v)+'</span>';
 if(f==='site_type'||f==='contract_type'||f==='package_type')return E(labels[v]||v);
 if(f==='area_m2')return v==null?'—':E(fmt(v))+' م²';
 if(f==='active')return '<span class="pill '+(v?'active':'inactive')+'">'+E(v?'متاح':'غير متاح')+'</span>';
 if(f==='campaign_count')return fmt(s.data.campaigns.filter(x=>x.customer_id===row.id).length);
 if(f==='properties_count')return fmt(s.data.properties.filter(x=>x.landlord_id===row.id).length);
 if(f==='sites')return E(linkedSites(row.id).map(x=>x.code+' — '+x.name).join('، ')||row.locations||'—');
 if(f==='contract_number')return E(numberedContract(v));
 if(f==='receipt_number')return E(receiptNumber(row));
 if(f==='campaign_balance')return displayMoney(campaignBalance(row),row.currency);
 if(f==='lease_balance')return displayMoney(leaseBalance(row),row.currency);
 if(f==='landlord_id')return E(nameOf('landlords',v));
 if(f==='customer_id')return E(nameOf('customers',v));
 if(f==='property_id'&&k==='leases'){
  const roof=lookup('properties',v),size=rooftopSizeDetails(roof);
  return '<span class="lease-roof-cell"><strong>'+E(nameOf('properties',v))+'</strong><small>'+E(size.dimensions)+' · '+E(size.area)+'</small></span>';
 }
 if(f==='property_id')return E(nameOf('properties',v));
 if(f==='rooftop_property_id')return E(v?nameOf('properties',v):'—');
 if(f==='package_id'&&k==='ad_sites'){
  const linked=lookup('packages',sitePackageId(row));
  return E(linked?linked.code+' — '+linked.name:'غير مصنّف');
 }
 if(f==='package_id')return E(nameOf('packages',v));
 if(f==='site_id')return E(nameOf('ad_sites',v));
 if(f==='campaign_id')return E(nameOf('campaigns',v));
 if(f==='lease_id'){const lease=lookup('leases',v);return E(lease?numberedContract(lease.contract_number)+' — '+nameOf('landlords',lease.landlord_id):'—');}
 if(f==='price'&&k==='packages')return displayMoney(v,originalCurrency(k,row))+(row.pricing_mode==='sqm_month'?'<small class="original-amount">للمتر المربع شهرياً (حسب المدة الافتراضية)</small>':'<small class="original-amount">للقطعة / كامل المدة الافتراضية</small>');
 if(['price','rent_total','amount','paid_amount'].includes(f))return displayMoney(v,originalCurrency(k,row));
 return E(v);
}
function campaignPaymentOverview(){
 const q=s.search.trim().toLocaleLowerCase();
 const focused=lookup('campaigns',s.campaignPaymentFocusId);
 const accountingRows=focused?[focused]:s.data.campaigns;
 const rows=s.data.campaigns.filter(cam=>
  (!focused||cam.id===focused.id)&&(!q||[cam.title,cam.notes,cam.locations,
    nameOf('customers',cam.customer_id),nameOf('packages',cam.package_id),
    ...linkedSites(cam.id).flatMap(site=>[site.code,site.name])
  ].some(value=>String(value||'').toLocaleLowerCase().includes(q))));
 const total=accountingRows.reduce((sum,cam)=>sum+convert(Number(cam.price||0),cam.currency,s.displayCurrency),0);
 const received=accountingRows.reduce((sum,cam)=>sum+convert(campaignPaid(cam.id),cam.currency,s.displayCurrency),0);
 const remaining=accountingRows.reduce((sum,cam)=>sum+convert(campaignBalance(cam),cam.currency,s.displayCurrency),0);
 const summary=[
  ['إجمالي قيمة الحملات',total,'total'],
  ['إجمالي المبالغ الواصلة',received,'received'],
  ['إجمالي المبالغ المتبقية',remaining,'remaining']
 ].map(([label,amount,kind])=>'<div class="campaign-payments-summary '+kind+'"><small>'+label+'</small><strong>'+E(money(roundAmount(amount),s.displayCurrency))+'</strong></div>').join('');
 const cards=rows.map(cam=>{
  const paid=roundAmount(campaignPaid(cam.id));
  const price=roundAmount(Number(cam.price)||0);
  const balance=campaignBalance(cam);
  const allPaid=balance<=0;
  const progress=price>0?Math.max(0,Math.min(100,paid/price*100)):100;
  const payments=s.data.campaign_payments.filter(payment=>payment.campaign_id===cam.id)
   .sort((a,b)=>String(b.paid_at||b.created_at||'').localeCompare(String(a.paid_at||a.created_at||'')));
  const cardTop='<div class="campaign-payment-head"><div class="campaign-payment-heading"><strong>'+E(cam.title||'حملة بدون عنوان')+'</strong>'+
    '<small>العميل: '+E(nameOf('customers',cam.customer_id))+' · '+E(nameOf('packages',cam.package_id))+
    (cam.months?' · '+E(cam.months)+' أشهر':'')+'</small></div>'+
    '<span class="campaign-payment-status '+(allPaid?'settled':paid>0?'partial':'unpaid')+'">'+
    (allPaid?'مسددة بالكامل':paid>0?'تسديد جزئي':'لم تُسدَّد')+'</span></div>';
  const metrics='<div class="campaign-payment-metrics">'+
   '<div><small>إجمالي الحملة</small><b>'+currencyAmount(price,cam.currency)+'</b></div>'+
   '<div><small>الواصل</small><b>'+currencyAmount(paid,cam.currency)+'</b></div>'+
   '<div><small>المتبقي</small><b>'+currencyAmount(balance,cam.currency)+'</b></div></div>';
  const history=payments.length?payments.map((payment,i)=>
   '<div class="campaign-payment-history-row"><span class="campaign-payment-history-index">وصل '+E(receiptNumber(payment))+'</span>'+
   '<span class="campaign-payment-history-date">'+E(payment.paid_at||'—')+'</span>'+
   '<span class="campaign-payment-history-amount">'+currencyAmount(payment.amount,cam.currency)+'</span>'+
   '<span class="campaign-payment-history-notes">'+E(payment.notes||'—')+'</span>'+
   '<button type="button" class="linkbtn" data-edit="campaign_payments:'+E(payment.id)+'">تعديل الدفعة</button></div>'
  ).join(''):'<p class="campaign-payment-nohistory">لا توجد دفعات مسجلة لهذه الحملة بعد.</p>';
  return '<article class="campaign-payment-card">'+cardTop+metrics+
   '<div class="campaign-payment-progress" role="progressbar" aria-label="نسبة السداد" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(progress)+'"><span style="width:'+progress+'%"></span></div>'+
   '<div class="campaign-payment-actions">'+
   '<button type="button" class="btn" data-new-linked="campaign_payments|campaign_id|'+E(cam.id)+'"'+(allPaid?' disabled title="الحملة مسددة بالكامل"':'')+'>'+
   (allPaid?uiIcon('check',16)+' تم تسديد الحملة':uiIcon('plus',16)+' تسجيل دفعة جديدة')+'</button>'+
   '<details class="campaign-payment-history"><summary>سجل الدفعات السابقة ('+payments.length+')</summary>'+
   '<div class="campaign-payment-history-list">'+history+'</div></details>'+
   '</div></article>';
 }).join('');
 return '<div class="campaign-payments-page">'+
  '<div class="campaign-payments-intro"><h2>حسابات الحملات الإعلانية</h2><p>كل حملة تظهر مع إجمالي مبلغها والواصل والمتبقي. سجّل الدفعة مباشرة من نفس الحملة، وراجع سجل الدفعات القديمة عند الحاجة.</p></div>'+
  (focused?'<div class="campaign-payments-focus"><div><strong>دفعات الحملة: '+E(focused.title)+'</strong><small>تظهر دفعات الحملة المرتبطة بالعقد المحدد فقط.</small></div><button type="button" class="btn secondary mini" data-clear-campaign-payment-focus>عرض جميع الحملات</button></div>':'')+
  '<div class="campaign-payments-summary-grid">'+summary+'</div>'+
  '<div class="campaign-payments-toolbar"><input class="search" id="search" type="search" placeholder="ابحث باسم الحملة أو الزبون أو الباقة..." value="'+E(s.search)+'">'+
  '<span class="campaign-payments-count">الحملات الظاهرة: '+rows.length+' من '+s.data.campaigns.length+'</span></div>'+
  '<div class="campaign-payment-list">'+(cards||'<div class="box empty campaign-payment-empty">'+
  (s.data.campaigns.length?'لا توجد حملات مطابقة للبحث.':'ماكو حملات مسجّلة بعد. من قسم المشاريع والحملات تگدر تنشئ أول حملة، وبعدها تظهر دفعاتها هنا.')+
  '</div>')+'</div>'+
  '<p class="subtle campaign-payments-footnote">كل مبالغ الصفحة تظهر بعملة العرض المحددة بالأعلى، وتظهر القيمة الأصلية تحت المبلغ المحوّل. لا تتغير العملة المحفوظة في السجلات.</p>'+
 '</div>';
}



function landlordDeleteStats(id){
 const propertyIds=new Set(s.data.properties.filter(x=>x.landlord_id===id).map(x=>x.id));
 const leases=s.data.leases.filter(x=>x.landlord_id===id);
 const leaseIds=new Set(leases.map(x=>x.id));
 const sites=s.data.ad_sites.filter(x=>propertyIds.has(x.rooftop_property_id));
 const siteIds=new Set(sites.map(x=>x.id));
 return {
  properties:propertyIds.size,sites:sites.length,leases:leases.length,
  installments:s.data.lease_installments.filter(x=>leaseIds.has(x.lease_id)).length,
  booked:s.data.ad_sites.filter(x=>siteIds.has(x.id)&&(
   s.data.campaign_sites.some(link=>link.site_id===x.id)||
   s.data.customer_contracts.some(contract=>contract.site_id===x.id||
    (Array.isArray(contract.campaign_sites_snapshot)&&
      contract.campaign_sites_snapshot.some(site=>site.id===x.id)))
  )).length
 };
}
function openLandlordDelete(id){
 if(s.staff?.role!=='admin')return toast('حذف مالكي العقارات مسموح للمدير فقط',true);
 const landlord=lookup('landlords',id);
 if(!landlord)return toast('المالك غير موجود',true);
 s.modal={kind:'deleteLandlord',table:'landlords',data:landlord};
 render();
}
function landlordDeleteDialog(landlord){
 const stats=landlordDeleteStats(landlord.id);
 return '<div class="overlay"><div class="modal customer-delete-modal" role="dialog" aria-modal="true" aria-labelledby="landlordDeleteTitle">'+
 '<div class="modalhead"><h2 id="landlordDeleteTitle">حذف المالك وكل سجلاته</h2><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div>'+
 '<div class="customer-delete-warning"><strong>حذف نهائي — لا يمكن التراجع عنه</strong>'+
 '<p>حذف <b>'+E(landlord.name)+'</b> يشمل الأسطح والعقارات والقطع التابعة لها وعقود الإيجار وكل أقساطها. لا يمس العملاء أو حملاتهم.</p></div>'+
 '<div class="customer-delete-stats">'+[
  ['الأسطح والعقارات',stats.properties],['القطع الإعلانية',stats.sites],
  ['عقود الإيجار',stats.leases],['دفعات وأقساط الإيجار',stats.installments]
 ].map(([label,count])=>'<div><small>'+E(label)+'</small><strong>'+count+'</strong></div>').join('')+'</div>'+
 (stats.booked?'<div class="notice landlord-delete-blocked"><strong>الحذف متوقف لحماية عقود الزبائن</strong>'+
  '<p>عدد '+stats.booked+' من قطع هذا المالك مرتبطة بحملات أو عقود زبائن. فك ارتباطها أولاً، ثم ارجع لحذف المالك.</p></div>':'')+
 '<form id="deleteLandlordForm"><input type="hidden" name="landlord_id" value="'+E(landlord.id)+'">'+
 '<label class="field"><span>اكتب كلمة <b>حذف</b> لتأكيد حذف المالك وكل السجلات التابعة له</span>'+
 '<input name="confirm" id="deleteLandlordConfirmation" autocomplete="off" placeholder="حذف" required'+(stats.booked?' disabled':'')+'></label>'+
 '<div class="actions"><button class="btn secondary" type="button" data-action="close">إلغاء</button>'+
 '<button class="btn danger customer-delete-confirm" id="deleteLandlordSubmit" type="submit" disabled>'+uiIcon('trash',16)+' حذف جميع سجلات المالك نهائياً</button></div></form></div></div>';
}
async function deleteLandlordConfirmed(form){
 if(s.deletingLandlord)return;
 if(s.staff?.role!=='admin')return toast('الحذف النهائي خاص بالمدير',true);
 const landlord=s.modal?.kind==='deleteLandlord'?s.modal.data:null;
 if(!landlord)return;
 const fields=new FormData(form);
 if(fields.get('confirm')!=='حذف'||fields.get('landlord_id')!==landlord.id)
  return toast('اكتب كلمة حذف حرفياً للتأكيد',true);
 const stats=landlordDeleteStats(landlord.id);
 if(stats.booked)return toast('فك ارتباط قطع المالك بحملات وعقود الزبائن أولاً',true);
 s.deletingLandlord=true;
 const submit=$('#deleteLandlordSubmit');if(submit)submit.disabled=true;
 try{
  let imagePath=landlord.card_image_path||null;
  if(s.demo){
   const properties=new Set(s.data.properties.filter(x=>x.landlord_id===landlord.id).map(x=>x.id));
   const leases=new Set(s.data.leases.filter(x=>x.landlord_id===landlord.id).map(x=>x.id));
   s.data.lease_installments=s.data.lease_installments.filter(x=>!leases.has(x.lease_id));
   s.data.leases=s.data.leases.filter(x=>x.landlord_id!==landlord.id);
   s.data.ad_sites=s.data.ad_sites.filter(x=>!properties.has(x.rooftop_property_id));
   s.data.properties=s.data.properties.filter(x=>x.landlord_id!==landlord.id);
   s.data.landlords=s.data.landlords.filter(x=>x.id!==landlord.id);
  }else{
   if(!s.client||!s.session)throw Error('سجّل الدخول بحساب المدير أولاً');
   const {data,error}=await s.client.rpc('raafat_delete_landlord_cascade',{p_landlord_id:landlord.id});
   if(error)throw error;
   if(data?.deleted_landlords!==1)throw Error('الخادم لم يؤكد حذف المالك');
   imagePath=data.card_image_path||null;
  }
  // A storage object is separate from the SQL transaction. Delete it through
  // the authorized private Storage API, never by manipulating storage tables.
  let imageIssue='';
  if(!s.demo&&imagePath){
   const {error}=await s.client.storage.from('identity-cards').remove([imagePath]);
   if(error)imageIssue=error.message||'تعذّر تنظيف صورة البطاقة';
  }
  s.modal=null;s.search='';s.filter='all';s.view='landlords';
  if(s.demo)render();else await load();
  toast(imageIssue?'تم حذف بيانات المالك، لكن تعذّر حذف صورة البطاقة: '+imageIssue:
   'تم حذف المالك وكل عقاراته وقطعه وعقود إيجاره وأقساطه');
 }catch(e){
  toast('تعذّر حذف المالك: '+(e.message||String(e)),true);
 }finally{
  s.deletingLandlord=false;
  if($('#deleteLandlordSubmit'))$('#deleteLandlordSubmit').disabled=false;
 }
}

function siteDeleteLinks(site){
 const campaigns=s.data.campaign_sites.filter(x=>x.site_id===site.id).length;
 const contracts=s.data.customer_contracts.filter(x=>
  x.site_id===site.id||Array.isArray(x.campaign_sites_snapshot)&&
   x.campaign_sites_snapshot.some(item=>item.id===site.id||item.code===site.code)).length;
 return {campaigns,contracts,blocked:campaigns+contracts>0};
}
function openSiteDelete(id){
 if(!s.demo&&s.staff?.role!=='admin')return toast('الحذف متاح للمدير فقط.',true);
 const site=lookup('ad_sites',id);
 if(!site)return toast('هذا الموقع غير موجود.',true);
 s.modal={kind:'deleteSite',table:'ad_sites',data:site};render();
}
function deleteSiteDialog(site){
 const links=siteDeleteLinks(site);
 return '<div class="overlay"><div class="modal customer-delete-modal" role="dialog" aria-modal="true">'+
 '<div class="modalhead"><h2>حذف موقع إعلاني</h2><button class="close" data-action="close" type="button">'+uiIcon('x',18)+'</button></div>'+
 '<div class="customer-delete-warning"><strong>'+E(site.code)+' — '+E(site.name)+'</strong>'+
 '<p>مرتبط بـ '+links.campaigns+' من الحملات و'+links.contracts+' من عقود الزبائن.</p>'+
 '<p>'+(links.blocked?'الموقع مرتبط بعقود أو حجوزات محفوظة، لذلك نمنع حذفه. تقدر تعطّله من الحجوزات الجديدة.':
  'الموقع غير مرتبط بعقود أو حملات ويمكن حذفه نهائياً بعد التأكيد.')+'</p></div>'+
 '<form id="deleteSiteForm"><input type="hidden" name="site_id" value="'+E(site.id)+'">'+
 (links.blocked?'':'<label class="field"><span>اكتب <b>حذف</b> للتأكيد</span><input id="deleteSiteConfirmation" name="confirm" required autocomplete="off"></label>')+
 '<div class="actions"><button type="button" class="btn secondary" data-action="close">إلغاء</button>'+
 (links.blocked?'<button class="btn secondary" type="button" data-site-deactivate="'+E(site.id)+'">تعطيل الموقع</button>':
 '<button type="submit" id="deleteSiteSubmit" class="btn danger" disabled>'+uiIcon('trash',16)+' حذف الموقع</button>')+
 '</div></form></div></div>';
}
async function deactivateSite(id){
 if(!s.demo&&s.staff?.role!=='admin')return toast('تعطيل الموقع متاح للمدير فقط.',true);
 const site=lookup('ad_sites',id);if(!site)return toast('الموقع غير موجود.',true);
 try{
  await persist('ad_sites',{active:false},site.id);
  s.modal=null;s.view='ad_sites';s.search='';
  if(s.demo)render();else await load();
  toast('تم تعطيل الموقع مع الاحتفاظ بالعقود والحجوزات السابقة.');
 }catch(e){toast('تعذر تعطيل الموقع: '+(e.message||String(e)),true)}
}
async function deleteSiteConfirmed(form){
 if(s.deletingSite)return;
 if(!s.demo&&s.staff?.role!=='admin')return toast('الحذف متاح للمدير فقط.',true);
 const site=s.modal?.kind==='deleteSite'?s.modal.data:null;
 if(!site)return;
 const data=new FormData(form);
 if(data.get('confirm')!=='حذف'||data.get('site_id')!==site.id)return toast('اكتب كلمة حذف للتأكيد.',true);
 if(siteDeleteLinks(site).blocked)return toast('الموقع مرتبط بسجلات محفوظة. عطّله بدلاً من حذفه.',true);
 s.deletingSite=true;
 try{
  if(s.demo)s.data.ad_sites=s.data.ad_sites.filter(x=>x.id!==site.id);
  else{
   const {data:deleted,error}=await s.client.rpc('raafat_delete_ad_site',{p_site_id:site.id});
   if(error)throw error;
   if(deleted!==site.id)throw Error('لم يؤكد الخادم الحذف.');
  }
  s.modal=null;s.view='ad_sites';s.search='';
  if(s.demo)render();else await load();
  toast('تم حذف الموقع الإعلاني بنجاح.');
 }catch(e){toast('تعذر حذف الموقع: '+(e.message||String(e)),true)}
 finally{s.deletingSite=false}
}

function openExpenseDelete(id){
 if(s.staff?.role!=='admin')return toast('حذف المصروفات متاح للمدير فقط',true);
 const expense=lookup('company_expenses',id);
 if(!expense)return toast('المصروف غير موجود',true);
 s.modal={kind:'deleteExpense',table:'company_expenses',data:expense};
 render();
}
function expenseDeleteDialog(expense){
 return '<div class="overlay"><div class="modal customer-delete-modal" role="dialog" aria-modal="true">'+
 '<div class="modalhead"><h2>حذف مصروف مسجّل</h2><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div>'+
 '<div class="customer-delete-warning"><strong>عملية حذف نهائية</strong><p>المصروف: <b>'+E(expense.title)+
 '</b>، المبلغ: <b>'+E(money(expense.amount,expense.currency))+'</b>، بتاريخ '+E(expense.expense_date)+'</p></div>'+
 '<form id="deleteExpenseForm"><input name="expense_id" type="hidden" value="'+E(expense.id)+'">'+
 '<label class="field"><span>اكتب <b>حذف</b> للتأكيد</span><input id="deleteExpenseConfirmation" name="confirm" required placeholder="حذف"></label>'+
 '<div class="actions"><button class="btn secondary" data-action="close" type="button">إلغاء</button>'+
 '<button class="btn danger" id="deleteExpenseSubmit" type="submit" disabled>'+uiIcon('trash',15)+' حذف المصروف نهائياً</button></div></form></div></div>';
}
async function deleteExpenseConfirmed(form){
 if(s.deletingExpense)return;
 if(s.staff?.role!=='admin')return toast('حذف المصروف متاح للمدير فقط',true);
 const expense=s.modal?.kind==='deleteExpense'?s.modal.data:null;
 if(!expense)return;
 const fields=new FormData(form);
 if(fields.get('confirm')!=='حذف'||fields.get('expense_id')!==expense.id)
  return toast('اكتب حذف للتأكيد',true);
 s.deletingExpense=true;
 try{
  if(s.demo)s.data.company_expenses=s.data.company_expenses.filter(row=>row.id!==expense.id);
  else{
   const {data,error}=await s.client.from('company_expenses').delete().eq('id',expense.id).select('id').single();
   if(error)throw error;
   if(data?.id!==expense.id)throw Error('لم يؤكد الخادم الحذف');
  }
  const proof=expense.transfer_proof_path;
  let cleanupIssue='';
  if(proof&&!s.demo){
   try{const removed=await s.client.storage.from('expense-transfers').remove([proof]);if(removed.error)cleanupIssue=removed.error.message;}
   catch(error){cleanupIssue=error?.message||'تعذر حذف المرفق';}
  }
  s.modal=null;s.view='company_expenses';s.search='';s.expenseCategory='';
  if(s.demo)render();else await load();
  toast(cleanupIssue?'تم حذف الفاتورة، ولكن تعذر حذف مرفق التحويل: '+cleanupIssue:'تم حذف الفاتورة ومرفقاتها المرتبطة');
 }catch(e){
  toast('تعذّر حذف المصروف: '+(e.message||String(e)),true);
 }finally{s.deletingExpense=false}
}

function customerCascadeStats(customerId){
 const campaigns=s.data.campaigns.filter(row=>row.customer_id===customerId);
 const ids=new Set(campaigns.map(row=>row.id));
 return {
  campaigns:campaigns.length,
  contracts:s.data.customer_contracts.filter(row=>row.customer_id===customerId).length,
  payments:s.data.campaign_payments.filter(row=>ids.has(row.campaign_id)).length,
  siteLinks:s.data.campaign_sites.filter(row=>ids.has(row.campaign_id)).length
 };
}
function openCustomerDelete(customerId){
 if(s.staff?.role!=='admin')return toast('الحذف النهائي متاح للمدير فقط',true);
 const customer=lookup('customers',customerId);
 if(!customer)return toast('هذا الزبون غير موجود',true);
 s.modal={kind:'deleteCustomer',table:'customers',data:customer};
 render();
}
function customerDeleteDialog(customer){
 const count=customerCascadeStats(customer.id);
 return '<div class="overlay"><div class="modal customer-delete-modal" role="dialog" aria-modal="true" aria-labelledby="deleteCustomerTitle">'+
 '<div class="modalhead"><h2 id="deleteCustomerTitle">حذف الزبون وجميع سجلاته</h2>'+
 '<button type="button" class="close" data-action="close" aria-label="إلغاء الحذف">'+uiIcon('x',19)+'</button></div>'+
 '<div class="customer-delete-warning"><strong>تنبيه: عملية حذف نهائي لا يمكن التراجع عنها</strong>'+
 '<p>أنت على وشك حذف الزبون <b>'+E(customer.name)+'</b> وجميع سجلاته الإعلانية والمالية المرتبطة به. لن تتأثر اللوحات الأصلية أو الباقات أو مالكو الأسطح وعقودهم.</p></div>'+
 '<div class="customer-delete-stats">'+[
  ['الحملات',count.campaigns],['عقود الزبون',count.contracts],
  ['دفعات الحملات',count.payments],['ارتباطات القطع',count.siteLinks]
 ].map(([name,number])=>'<div><small>'+E(name)+'</small><strong>'+number+'</strong></div>').join('')+'</div>'+
 '<form id="deleteCustomerForm"><input type="hidden" name="customer_id" value="'+E(customer.id)+'">'+
 '<label class="field"><span>للتأكيد، اكتب كلمة <strong>حذف</strong></span>'+
 '<input id="deleteCustomerConfirmation" name="confirm" placeholder="اكتب حذف للتأكيد" autocomplete="off" required></label>'+
 '<div class="actions"><button type="button" class="btn secondary" data-action="close">إلغاء</button>'+
 '<button type="submit" class="btn danger customer-delete-confirm" id="deleteCustomerSubmit" disabled>'+uiIcon('trash',17)+' حذف الزبون وكل سجلاته نهائياً</button></div>'+
 '</form></div></div>';
}
async function deleteCustomerConfirmed(form){
 if(s.deletingCustomer)return;
 if(s.staff?.role!=='admin')return toast('ليس لديك صلاحية الحذف',true);
 const customer=s.modal?.kind==='deleteCustomer'?s.modal.data:null;
 if(!customer)return;
 const fields=new FormData(form);
 if(fields.get('confirm')!=='حذف'||fields.get('customer_id')!==customer.id){
  toast('اكتب حذف حرفياً لتأكيد العملية',true);return;
 }
 s.deletingCustomer=true;
 const submit=$('#deleteCustomerSubmit');
 if(submit)submit.disabled=true;
 try{
  if(s.demo){
   const ids=new Set(s.data.campaigns.filter(row=>row.customer_id===customer.id).map(row=>row.id));
   s.data.customer_contracts=s.data.customer_contracts.filter(row=>row.customer_id!==customer.id);
   s.data.campaign_payments=s.data.campaign_payments.filter(row=>!ids.has(row.campaign_id));
   s.data.campaign_sites=s.data.campaign_sites.filter(row=>!ids.has(row.campaign_id));
   s.data.campaigns=s.data.campaigns.filter(row=>row.customer_id!==customer.id);
   s.data.customers=s.data.customers.filter(row=>row.id!==customer.id);
  }else{
   if(!s.client||!s.session)throw Error('سجّل دخولك بحساب المدير أولاً');
   const {data,error}=await s.client.rpc('raafat_delete_customer_cascade',{p_customer_id:customer.id});
   if(error)throw error;
   if(data?.deleted_customers!==1)throw Error('لم يؤكد الخادم حذف الزبون');
  }
  s.modal=null;s.search='';s.filter='all';s.view='customers';
  if(s.demo)render();else await load();
  toast('تم حذف الزبون وحملاته وعقوده ودفعاته وروابط قطعه بنجاح');
 }catch(error){
  toast('تعذّر حذف الزبون: '+(error.message||String(error)),true);
 }finally{
  s.deletingCustomer=false;
  if($('#deleteCustomerSubmit'))$('#deleteCustomerSubmit').disabled=false;
 }
}

function leaseInstallmentsOverview(){
 const query=s.search.trim().toLocaleLowerCase();
 const leases=s.data.leases.filter(lease=>{
  const owner=lookup('landlords',lease.landlord_id),property=lookup('properties',lease.property_id);
  return !query||[lease.contract_number,numberedContract(lease.contract_number),owner?.name,owner?.phone,
   property?.title,property?.dimensions,lease.start_date,lease.end_date]
   .some(val=>String(val||'').toLocaleLowerCase().includes(query));
 }).sort((a,b)=>String(b.start_date||'').localeCompare(String(a.start_date||'')));
 const totals=s.data.leases.reduce((acc,lease)=>{
  const paid=leasePaidInstallments(lease.id),advance=leaseAdvance(lease);
  acc.rent+=convert(Number(lease.rent_total||0),lease.currency,s.displayCurrency);
  acc.advance+=convert(advance,lease.currency,s.displayCurrency);
  acc.paid+=convert(paid,lease.currency,s.displayCurrency);
  acc.due+=convert(leaseBalance(lease),lease.currency,s.displayCurrency);
  return acc;
 },{rent:0,advance:0,paid:0,due:0});
 const cards=leases.map(lease=>{
  const rows=s.data.lease_installments.filter(row=>row.lease_id===lease.id)
   .sort((a,b)=>String(a.due_date||'').localeCompare(String(b.due_date||'')));
  const owner=nameOf('landlords',lease.landlord_id),property=nameOf('properties',lease.property_id);
  const original=Number(lease.rent_total||0),upfront=leaseAdvance(lease);
  const installmentsPaid=leasePaidInstallments(lease.id),remaining=leaseBalance(lease);
  const status=remaining<=0?'مكتمل التسديد':installmentsPaid+upfront>0?'تسديد جزئي':'غير مسدّد';
  const progress=original>0?Math.min(100,Math.max(0,Math.round((installmentsPaid+upfront)/original*100))):100;
  const installmentRows=rows.map((row,i)=>{
   const balance=Math.max(0,roundAmount(Number(row.amount||0)-Number(row.paid_amount||0)));
   const label=balance<=0?'مسدّد':row.due_date<today()?'متأخر':row.due_date===today()?'مستحق اليوم':'بانتظار الاستحقاق';
   return '<div class="lease-ledger-installment">'+
    '<span class="lease-ledger-ordinal">قسط '+serial4(i+1)+'</span>'+
    '<span class="lease-ledger-date">الاستحقاق: '+E(row.due_date||'—')+'</span>'+
    '<span class="lease-ledger-amounts"><span>القيمة: '+currencyAmount(row.amount,lease.currency)+'</span>'+
     '<span>المدفوع: '+currencyAmount(row.paid_amount,lease.currency)+'</span>'+
     '<span>الباقي: '+currencyAmount(balance,lease.currency)+'</span></span>'+
    '<span class="lease-ledger-status '+(balance<=0?'paid':row.due_date<today()?'late':'pending')+'">'+label+'</span>'+
    '<button class="btn secondary mini" type="button" data-edit="lease_installments:'+E(row.id)+'">'+uiIcon('pencil',15)+' تسجيل / تعديل التسديد</button>'+
   '</div>';
  }).join('');
  return '<article class="lease-ledger-card"><div class="lease-ledger-head">'+
   '<div><h3>'+E(owner)+'</h3><p>العقد '+E(numberedContract(lease.contract_number))+' · '+E(property)+'</p>'+
   '<small>من '+E(lease.start_date)+' إلى '+E(lease.end_date)+' · '+E(labels[lease.payment_frequency]||lease.payment_frequency)+'</small></div>'+
   '<span class="campaign-payment-status '+(remaining<=0?'settled':upfront+installmentsPaid>0?'partial':'unpaid')+'">'+status+'</span></div>'+
   '<div class="lease-ledger-metrics">'+[
    ['الإيجار الكامل',original],['المقدم المستلم',upfront],['مسدد من الأقساط',installmentsPaid],['المتبقي',remaining]
   ].map(([label,value])=>'<div><small>'+label+'</small><strong>'+currencyAmount(value,lease.currency)+'</strong></div>').join('')+'</div>'+
   '<div class="campaign-payment-progress" aria-label="نسبة تسديد الإيجار"><span style="width:'+progress+'%"></span></div>'+
   '<div class="lease-ledger-lower"><details class="lease-ledger-details" open><summary>الأقساط المجدولة ('+rows.length+')</summary>'+
   '<div class="lease-ledger-installments">'+(installmentRows||'<div class="notice">لا توجد أقساط مسجلة لهذا العقد.'+
    (remaining>0?' راجع العقد، فهناك مبلغ متبقٍ غير مجدول.':' المبلغ مسدد بالكامل.')+'</div>')+'</div></details>'+
   '<button class="btn secondary mini" data-edit="leases:'+E(lease.id)+'">'+uiIcon('file',16)+' تفاصيل عقد المالك</button></div></article>';
 }).join('');
 const box=(label,v,style)=>'<div class="lease-ledger-stat '+style+'"><small>'+label+'</small><strong>'+E(money(roundAmount(v),s.displayCurrency))+'</strong></div>';
 return '<section class="lease-ledger-page">'+
  '<div class="campaign-payments-intro"><h2>دفعات إيجار الأسطح</h2><p>الأقساط مرتّبة حسب عقد المالك. ابحث باسم المالك أو رقم العقد أو اسم السطح وسجّل التسديد من قسطه مباشرة.</p></div>'+
  '<div class="lease-ledger-summary">'+box('الإيجارات المتعاقد عليها',totals.rent,'rent')+
   box('المقدم المدفوع',totals.advance,'advance')+box('المسدد من الأقساط',totals.paid,'paid')+
   box('المتبقي للاستحقاق',totals.due,'outstanding')+'</div>'+
  '<div class="campaign-payments-toolbar"><input class="search" id="search" type="search" placeholder="بحث باسم المالك أو العقد أو السطح..." value="'+E(s.search)+'">'+
  '<span class="campaign-payments-count">'+leases.length+' عقد من أصل '+s.data.leases.length+'</span></div>'+
  '<div class="lease-ledger-list">'+(cards||'<div class="box empty">لا توجد عقود مطابقة. سجّل أول عقد من قسم عقود مالكي الأسطح.</div>')+'</div>'+
  '<p class="subtle">كل القيم معروضة بعملة العرض المحددة بالأعلى، وتظهر قيمتها الأصلية تحت المبلغ المحوّل. العقود والأقساط القديمة محفوظة كما هي.</p>'+
 '</section>';
}

function expenseOverview(){
 // Historical salary invoices remain intact as read-only payroll archive,
 // never mixed with general expenses or counted twice.
 const all=(s.data.company_expenses||[]).filter(item=>!expenseLineItems(item).some(line=>line.category==='salaries')),
 query=s.search.trim().toLocaleLowerCase();
 const filtered=all.filter(expense=>
  (!s.expenseCategory||expenseLineItems(expense).some(item=>item.category===s.expenseCategory))&&
  (!query||[expense.title,expense.notes,expense.paid_by,expense.expense_date,
   expense.receipt_number,EXPENSE_CATEGORY_LABELS[expense.category],expenseItemDetailsText(expense),
   ...expenseLineItems(expense).flatMap(item=>[EXPENSE_CATEGORY_LABELS[item.category],
    EXPENSE_DEPARTMENTS.find(([id])=>id===item.department)?.[1]])]
   .some(value=>String(value||'').toLocaleLowerCase().includes(query))))
  .sort((a,b)=>String(b.expense_date||'').localeCompare(String(a.expense_date||''))||
   String(b.created_at||'').localeCompare(String(a.created_at||'')));
 const converted=(v,cur)=>convert(Number(v||0),cur,s.displayCurrency);
 const total=invoices=>roundAmount(invoices.reduce((sum,e)=>sum+converted(e.amount,e.currency),0));
 const paid=roundAmount(all.reduce((sum,e)=>sum+converted(expensePaidAmount(e),e.currency),0));
 const overall=total(all),outstanding=Math.max(0,roundAmount(overall-paid));
 const paidCount=all.filter(e=>expensePaymentStatus(e)==='paid').length;
 const tiles=[
  ['إجمالي قيمة الفواتير',money(overall,s.displayCurrency),'total'],
  ['المبالغ المسددة',money(paid,s.displayCurrency),'month'],
  ['الرصيد غير المسدد',money(outstanding,s.displayCurrency),'today'],
  ['عدد الفواتير',String(all.length),'count']
 ].map(([label,value,type])=>'<div class="expense-stat '+type+'"><small>'+E(label)+'</small><strong>'+E(value)+'</strong></div>').join('');
 const groupTotals=new Map();
 for(const inv of all)for(const item of expenseLineItems(inv)){
  const category=item.category||'other';
  groupTotals.set(category,(groupTotals.get(category)||0)+
   converted(expenseLineTotal(item),inv.currency));
 }
 const grouping=[...new Set([...EXPENSE_CATEGORY_OPTIONS,...groupTotals.keys()])];
 const categoryTotals=grouping.filter(code=>groupTotals.has(code)).map(code=>
  '<div class="expense-category-chip"><span>'+E(EXPENSE_CATEGORY_LABELS[code]||code)+'</span>'+
  '<b>'+E(money(roundAmount(groupTotals.get(code)),s.displayCurrency))+'</b></div>').join('');
 const cats=grouping.filter(code=>groupTotals.has(code));
 const cards=filtered.map(expense=>{
  const status=expensePaymentStatus(expense),items=expenseLineItems(expense);
  const categoryCodes=[...new Set(items.map(x=>x.category))];
  const categoryLabel=categoryCodes.length===1?
   EXPENSE_CATEGORY_LABELS[categoryCodes[0]]||categoryCodes[0]:'فاتورة متعددة التصنيفات';
  const due=Math.max(0,roundAmount(Number(expense.amount)-expensePaidAmount(expense)));
  const canEdit=s.staff?.role==='admin'||s.staff?.role==='custom_admin'&&canAccess('expenses','edit');
  const details=items.map(item=>'<div class="expense-invoice-product">'+
   '<div><strong>'+E(item.description)+'</strong><small>'+
    E(EXPENSE_CATEGORY_LABELS[item.category]||item.category||'—')+' · '+
    E(EXPENSE_DEPARTMENTS.find(([id])=>id===item.department)?.[1]||'القسم غير محدد (سجل سابق)')+
    '</small></div><span>'+E(fmt(item.quantity))+' × '+E(money(item.unit_price,expense.currency))+
    '</span><b>'+E(money(expenseLineTotal(item),expense.currency))+'</b></div>').join('');
  return '<article class="expense-record"><div class="expense-record-main">'+
   '<div class="expense-record-flags"><span class="expense-record-category">'+E(categoryLabel)+'</span>'+
    '<span class="expense-payment-status '+status+'">'+E(EXPENSE_PAYMENT_LABELS[status])+'</span></div>'+
   '<h3>'+E(expense.title)+'</h3>'+
   '<div class="expense-record-meta"><span>'+uiIcon('calendar',14)+' '+E(expense.expense_date)+'</span>'+
    (expense.paid_by?'<span>'+uiIcon('user',14)+' الموظف: '+E(expense.paid_by)+'</span>':'')+
    (expense.receipt_number?'<span>'+uiIcon('receipt',14)+' الوصل: '+E(expense.receipt_number)+'</span>':'')+
    '<span>'+uiIcon('layers',14)+' '+items.length+' '+(items.length===1?'صنف':'أصناف')+'</span></div>'+
   (expense.notes?'<p>'+E(expense.notes)+'</p>':'')+
   '<details class="expense-product-disclosure"><summary>تفاصيل الأصناف والمستفيدين</summary>'+
    '<div class="expense-product-list">'+details+'</div></details></div>'+
   '<div class="expense-record-side"><strong>'+displayMoney(expense.amount,expense.currency)+'</strong>'+
    '<span class="expense-paid-line">المسدّد: '+E(money(expensePaidAmount(expense),expense.currency))+'</span>'+
    (due>0?'<span class="expense-balance-line">المتبقي: '+E(money(due,expense.currency))+'</span>':'')+
    '<span class="expense-payment-method">'+E(expense.payment_method==='mastercard'?'ماستر كارد':'نقداً')+'</span>'+
    '<div class="expense-record-actions">'+
    (expense.transfer_proof_path?'<button class="linkbtn" type="button" data-expense-proof="'+E(expense.id)+'">'+
     uiIcon('image',14)+' صورة التحويل</button>':'')+
    (canEdit?'<button class="linkbtn" data-edit="company_expenses:'+E(expense.id)+'">'+
     uiIcon('pencil',14)+' تعديل الفاتورة</button>'+
     '<button class="linkbtn expense-delete-link" data-delete-expense="'+E(expense.id)+'">'+
     uiIcon('trash',14)+' حذف</button>':'')+
    '</div></div></article>';
 }).join('');
 return '<section class="expense-page"><div class="expense-intro">'+
  '<div><h2>المصروفات والفواتير الداخلية</h2>'+
  '<p>إدارة فواتير المشتريات والخدمات، توزيع التكاليف حسب الأقسام، ومتابعة أرصدة السداد والمرفقات.</p></div>'+
  '<button type="button" class="btn" data-new="company_expenses">'+uiIcon('plus',17)+' تسجيل فاتورة</button></div>'+
  '<div class="expense-stat-grid">'+tiles+'</div>'+
  (categoryTotals?'<details class="expense-categories expense-category-expand">'+
   '<summary>التوزيع المحاسبي حسب نوع المصروف <span>· '+paidCount+' فاتورة مسددة بالكامل</span></summary>'+
   '<div class="expense-category-grid">'+categoryTotals+'</div></details>':'')+
  '<div class="expense-toolbar"><input class="search" id="search" type="search" placeholder="البحث برقم الوصل أو الموظف أو الصنف..." value="'+E(s.search)+'">'+
  '<select id="expenseCategory" class="search" aria-label="تصفية المصروفات حسب التصنيف">'+
  '<option value="">جميع التصنيفات</option>'+cats.map(code=>
   '<option value="'+E(code)+'"'+(s.expenseCategory===code?' selected':'')+'>'+
   E(EXPENSE_CATEGORY_LABELS[code]||code)+'</option>').join('')+'</select>'+
  '<span class="expense-count">'+filtered.length+' من '+all.length+' فاتورة</span></div>'+
  '<div class="expense-record-list">'+(cards||'<div class="box empty">'+
   (all.length?'لا توجد فواتير مطابقة لمعايير البحث.':'لم تُسجّل أي فواتير حتى الآن. استخدم «تسجيل فاتورة» لإضافة أول فاتورة.')+
   '</div>')+'</div>'+
  '<p class="subtle expense-footnote">القيم المالية معروضة بالعملة المختارة بالأعلى. تُحفظ كل فاتورة بعملتها الأصلية، ويتم احتساب المدفوع والمتبقي دون تعديل قيمة الفاتورة.</p></section>';
}


function staffAdminView(){
 if(!s.demo&&s.staff?.role!=='admin')return '<div class="notice">إدارة الحسابات والصلاحيات للمدير الرئيسي فقط.</div>';
 const rows=s.managedStaff||[];
 return '<div class="staff-admin-page">'+
 '<section class="box staff-admin-intro"><div><h2>إدارة الحسابات وصلاحيات المدراء</h2>'+
 '<p class="subtle">أنشئ أدمن داخلياً مثل ahmed@raafat برمز سري تحدده بنفسك، بدون بريد حقيقي أو رابط تفعيل. يمكنك تعديل الصلاحيات وتغيير الرمز وتعطيل الحساب.</p></div>'+
 '<div class="inline"><button type="button" class="btn" data-staff-new>'+uiIcon('user',16)+' إضافة أدمن جديد</button>'+
 '<button type="button" class="btn secondary" data-staff-refresh>'+uiIcon('refresh',15)+' تحديث الحسابات</button></div></section>'+
 '<div class="box tablewrap"><table class="table"><thead><tr><th>الاسم والبريد</th><th>الدور</th><th>الحالة</th><th>الصلاحيات</th><th>الإجراء</th></tr></thead><tbody>'+
 (rows.length?rows.map(row=>'<tr><td><strong>'+E(row.display_name||'—')+'</strong>'+
  '<small class="subtle hr-phone">'+E(displayStaffLogin(row.email)||'بريد غير مسجل')+'</small></td>'+
  '<td>'+E(adminRoleLabel(row.role))+'</td>'+
  '<td>'+E(row.active?'نشط':'معطّل')+'</td>'+
  '<td class="staff-permission-pills">'+(row.role==='admin'?'<span class="staff-permission-chip">صلاحيات كاملة</span>':
   (row.permissions||[]).length?(row.permissions||[]).slice(0,4).map(key=>
   '<span class="staff-permission-chip">'+E(ACCESS_SECTIONS.find(([id])=>key.startsWith(id+'.'))?.[1]||key)+
   ' — '+(key.endsWith('.edit')?'تعديل':'عرض')+'</span>').join('')+
   (row.permissions.length>4?'<small>و'+(row.permissions.length-4)+' أخرى</small>':''):'<span>بدون صلاحيات خاصة</span>')+'</td>'+
  '<td>'+(row.role==='custom_admin'?'<button type="button" class="linkbtn" data-staff-edit="'+E(row.user_id)+'">'+
    uiIcon('pencil',15)+' إدارة الصلاحيات والرمز</button>':'<small class="subtle">حساب محمي</small>')+
  '</td></tr>').join(''):'<tr><td colspan="5" class="empty">اضغط «تحديث الحسابات» لعرض المستخدمين.</td></tr>')+
 '</tbody></table></div>'+
 '<p class="subtle">الدور «مدير رئيسي» يبقى كامل الصلاحيات. المدير المخصص لا يقدر إنشاء أو منح حساب مدير رئيسي.</p>'+
 '</div>';
}
function openStaffRoleEditor(userId=''){
 if(!s.demo&&s.staff?.role!=='admin')return toast('إدارة الصلاحيات للمدير الرئيسي فقط.',true);
 const current=(s.managedStaff||[]).find(row=>row.user_id===userId);
 if(userId&&current?.role!=='custom_admin')return toast('لا يمكن تعديل حساب المدير الرئيسي أو الموظف الاعتيادي من هذه النافذة.',true);
 s.modal={kind:'staffRoleEditor',data:{
  userId:current?.user_id||'',email:current?.email||'',
  displayName:current?.display_name||'',active:current?.active!==false,
  permissions:current?.permissions||ACCESS_SECTIONS.flatMap(([key])=>[key+'.read',key+'.edit'])
 }};render();
}
function staffRoleEditorHtml(){
 const v=s.modal.data,editing=Boolean(v.userId);
 const choices=ACCESS_SECTIONS.map(([key,title])=>
 '<div class="staff-permission-row"><strong>'+E(title)+'</strong>'+
  '<label class="staff-permission-toggle"><input type="checkbox" name="permission" value="'+E(key)+'.read"'+
   (v.permissions.includes(key+'.read')?' checked':'')+'> عرض</label>'+
  '<label class="staff-permission-toggle"><input type="checkbox" name="permission" value="'+E(key)+'.edit"'+
   (v.permissions.includes(key+'.edit')?' checked':'')+'> إضافة وتعديل</label></div>').join('');
 return '<div class="overlay"><div class="modal staff-role-editor" role="dialog" aria-modal="true">'+
 '<div class="modalhead"><div><h2>'+(editing?'تعديل صلاحيات ورمز الحساب':'إنشاء أدمن جديد')+'</h2>'+
 '<p class="subtle">اختر الصلاحيات المناسبة لكل قسم. لا تُمنح صلاحية إدارة حسابات الآخرين للمدير المخصص.</p></div>'+
 '<button class="close" type="button" data-action="close">'+uiIcon('x',18)+'</button></div>'+
 '<form id="staffRoleForm">'+
 '<div class="formgrid">'+
 '<label class="field"><span>الاسم الظاهر (اختياري)</span><input name="displayName" maxlength="100" value="'+E(v.displayName)+'"></label>'+
 '<label class="field"><span>اسم الدخول الداخلي * (مثال: ahmed@raafat)</span><input type="text" name="email" dir="ltr" placeholder="ahmed@raafat" required value="'+E(displayStaffLogin(v.email))+'"'+(editing?' readonly':'')+'></label>'+
 '<label class="field full"><span>'+(editing?'رمز سري جديد (اتركه فارغاً إذا لا تريد تغييره)':'الرمز السري *')+'</span><input type="password" name="password" autocomplete="new-password" minlength="12" maxlength="128"'+(editing?'':' required')+' placeholder="12 حرفاً على الأقل"></label>'+
 (editing?'<label class="field full"><span>حالة الحساب</span><select name="active">'+
   '<option value="true"'+(v.active?' selected':'')+'>نشط</option>'+
   '<option value="false"'+(!v.active?' selected':'')+'>معطّل</option></select></label>':'')+
 '</div><div class="staff-permissions"><h3>الصلاحيات التفصيلية</h3><p class="subtle">«عرض» يسمح بالاطلاع فقط. «إضافة وتعديل» يسمح بالعمل داخل القسم وفق صلاحيات قاعدة البيانات. الحذف النهائي يبقى للمدير الرئيسي.</p>'+
 '<div class="staff-permission-list">'+choices+'</div></div>'+
 '<div class="actions"><button type="submit" class="btn">'+(editing?'حفظ الصلاحيات والرمز':'إنشاء الحساب فوراً')+'</button>'+
 '<button class="btn secondary" data-action="close" type="button">إلغاء</button></div></form></div></div>';
}
async function requestStaffAdmin(body){
 if(!s.client||!s.session)return toast('تأكد من تسجيل الدخول كمدير رئيسي.',true);
 const {data,error}=await s.client.functions.invoke('raafat-staff-admin',{body});
 if(error)throw Error(error.message||'تعذّر الاتصال بخدمة إدارة الحسابات.');
 if(data?.error)throw Error(data.error);
 return data;
}
async function refreshManagedStaff(){
 if(!s.demo&&s.staff?.role!=='admin')return;
 try{
  if(s.demo){s.managedStaff=[{user_id:'demo-main-admin',email:'demo@example.test',
   display_name:'المدير الرئيسي',role:'admin',active:true,permissions:[]}];render();return;}
  const data=await requestStaffAdmin({action:'list'});
  s.managedStaff=data.staff||[];render();
 }catch(e){toast('تعذر تحميل المستخدمين: '+(e.message||String(e)),true)}
}
async function saveStaffRole(form){
 if(s.savingStaff)return;
 if(!s.demo&&s.staff?.role!=='admin')return toast('غير مصرح بإدارة الحسابات.',true);
 const values=new FormData(form),permissions=[...new Set(values.getAll('permission'))].map(String);
 const email=String(values.get('email')||'').trim().toLowerCase();
 const name=String(values.get('displayName')||'').trim()||email.split('@')[0];
 const password=String(values.get('password')||'');
 const creating=!s.modal?.data?.userId;
 if(creating&&(!/^[a-z][a-z0-9._-]{0,62}@raafat$/.test(email)||email.includes('..')||/[._-]@raafat$/.test(email)))
  return toast('اكتب اسم الدخول مثل ahmed@raafat بحروف إنكليزية.',true);
 if(creating&&!password)return toast('اكتب الرمز السري أولاً.',true);
 if(password&&(password.length<12||password.length>128))return toast('الرمز السري يجب أن يكون 12 حرفاً على الأقل.',true);
 if(!permissions.length)return toast('اختر صلاحية واحدة على الأقل.',true);
 const current=s.modal?.data;
 const body={action:current.userId?'update':'create_internal',
  displayName:name,permissions,email,
  ...(current.userId?{userId:current.userId,active:values.get('active')!=='false'}:{password})};
 s.savingStaff=true;
 const button=form.querySelector?.('[type="submit"]');if(button)button.disabled=true;
 try{
  if(s.demo){
   const row={user_id:current.userId||uid(),email:toAuthEmail(email),display_name:name,
    role:'custom_admin',active:body.active!==false,permissions};
   s.managedStaff=[...(s.managedStaff||[]).filter(x=>x.user_id!==row.user_id),row];
  }else{
   await requestStaffAdmin(body);
   if(current.userId&&password)await requestStaffAdmin({action:'set_password',userId:current.userId,password});
  }
  s.modal=null;
  await refreshManagedStaff();
  toast(body.action==='create_internal'?'تم إنشاء الحساب '+email+' وهو جاهز للدخول فوراً.':'تم تحديث الصلاحيات والرمز إن تم إدخاله.');
 }catch(e){toast('تعذر حفظ الصلاحيات: '+(e.message||String(e)),true);if(button)button.disabled=false}
 finally{s.savingStaff=false}
}

function employeeSalaryExpenses(employeeId){
 return (s.data.company_expenses||[])
  .filter(row=>row.employee_id===employeeId&&expenseLineItems(row).some(item=>item.category==='salaries'))
  .sort((a,b)=>String(b.expense_date||'').localeCompare(String(a.expense_date||'')));
}

function employeePayrollPayments(employeeId){
 return (s.data.payroll_payments||[]).filter(row=>row.employee_id===employeeId)
  .sort((a,b)=>String(b.paid_at||'').localeCompare(String(a.paid_at||'')));
}
function payrollReceiptPayload(payment){
 const employee=lookup('employees',payment.employee_id);
 return {
  receiptNumber:payment.receipt_number,
  employeeName:payment.employee_name_snapshot||employee?.name||'—',
  jobTitle:payment.job_title_snapshot||employee?.job_title||'—',
  department:EXPENSE_DEPARTMENTS.find(([id])=>id===(payment.department_snapshot||employee?.department))?.[1]||
   payment.department_snapshot||employee?.department||'—',
  salaryMonth:String(payment.salary_month||'').slice(0,7),
  paidAt:payment.paid_at,amount:Number(payment.amount),currency:payment.currency,
  paidBy:payment.paid_by,companyName:companyValue('company_name')
 };
}
async function downloadPayrollReceipt(id){
 const payment=lookup('payroll_payments',id);
 if(!payment)return toast('سند صرف الراتب غير موجود.',true);
 if(!canAccess('payroll','read'))return toast('ليس لديك صلاحية عرض سندات الرواتب.',true);
 const generator=window?.RaafatPayrollReceipt;
 if(!generator?.download)return toast('قالب وصل الرواتب غير متاح. حدّث الصفحة.',true);
 try{
  await generator.download(payrollReceiptPayload(payment));
  toast('تم تنزيل وصل راتب '+payrollReceiptPayload(payment).employeeName+' بقياس نصف A4.');
 }catch(error){toast('تعذر تنزيل الوصل: '+(error.message||String(error)),true)}
}
function openPayrollPayment(employeeId){
 if(!canAccess('payroll','edit'))return toast('صرف الرواتب يحتاج صلاحية الرواتب.',true);
 const employee=lookup('employees',employeeId);
 if(!employee)return toast('الموظف غير موجود.',true);
 if(!employee.active)return toast('الموظف غير فعال. فعّله قبل تسجيل صرف جديد.',true);
 s.modal={kind:'payrollPayment',data:{
  employee_id:employee.id,salary_month:today().slice(0,7),
  paid_at:today(),amount:Number(employee.salary_amount)||0,
  currency:employee.salary_currency||'IQD',paid_by:'',
  notes:''
 }};
 render();
}
function payrollPaymentHtml(){
 const v=s.modal?.data||{},employee=lookup('employees',v.employee_id);
 if(!employee)return '<div class="notice">الموظف غير موجود.</div>';
 const dept=EXPENSE_DEPARTMENTS.find(([code])=>code===employee.department)?.[1]||'—';
 return '<div class="overlay"><div class="modal payroll-payment-modal" role="dialog" aria-modal="true">'+
  '<div class="modalhead"><div><h2>صرف راتب موظف</h2>'+
  '<p class="subtle">تسجل الدفعة في كشف الرواتب حصراً، وتصدر وصل استلام مستقل بقياس نصف A4.</p></div>'+
  '<button class="close" type="button" data-action="close">'+uiIcon('x',18)+'</button></div>'+
  '<div class="payroll-payee"><div><small>اسم الموظف المستلم</small><strong>'+E(employee.name)+'</strong>'+
  '<span>'+E(employee.job_title||'موظف')+' • '+E(dept)+'</span></div>'+
  '<div><small>الراتب الشهري المسجّل</small><strong>'+E(money(employee.salary_amount,employee.salary_currency))+'</strong></div></div>'+
  '<form id="payrollPaymentForm" class="payroll-payment-form">'+
  '<input type="hidden" name="employee_id" value="'+E(employee.id)+'">'+
  '<div class="formgrid">'+
  '<label class="field"><span>راتب شهر *</span><input type="month" name="salary_month" required value="'+E(v.salary_month)+'"></label>'+
  '<label class="field"><span>تاريخ صرف المبلغ *</span><input type="date" name="paid_at" required value="'+E(v.paid_at)+'"></label>'+
  '<label class="field"><span>المبلغ الذي استلمه الموظف *</span><input type="number" name="amount" min="0.01" step="0.01" required value="'+E(v.amount)+'"></label>'+
  '<label class="field"><span>عملة الراتب</span><input value="'+E(employee.salary_currency==='USD'?'دولار أمريكي (USD)':'دينار عراقي (IQD)')+'" disabled></label>'+
  '<label class="field full"><span>اسم الشخص الذي سلّم الراتب للموظف *</span>'+
  '<input name="paid_by" required maxlength="150" autocomplete="off" list="payrollPayers" placeholder="مثال: مدير الحسابات أو مسؤول الصرف" value="'+E(v.paid_by)+'">'+
  '<datalist id="payrollPayers">'+(s.data.employees||[]).map(x=>'<option value="'+E(x.name)+'"></option>').join('')+'</datalist></label>'+
  '<label class="field full"><span>ملاحظات اختيارية</span><textarea name="notes" rows="2" placeholder="مثلاً: راتب جزئي أو صرف دفعة إضافية">'+E(v.notes||'')+'</textarea></label>'+
  '</div><div class="payroll-receipt-hint">'+uiIcon('file',18)+
  '<p>بعد اعتماد الصرف تظهر نافذة لتحميل وصل الاستلام، وفي الوصل اسم الموظف، رقم السند، راتب الشهر، المبلغ، اسم مسؤول الصرف، وخانتان فارغتان للتوقيع.</p></div>'+
  '<div class="actions"><button class="btn" type="submit">'+uiIcon('check',16)+' اعتماد الصرف وإصدار الوصل</button>'+
  '<button class="btn secondary" type="button" data-action="close">إلغاء</button></div>'+
  '</form></div></div>';
}
function payrollReceiptReadyHtml(){
 const payment=lookup('payroll_payments',s.modal.paymentId);
 if(!payment)return '<div class="notice">لا يمكن العثور على سند صرف الراتب.</div>';
 const payload=payrollReceiptPayload(payment);
 return '<div class="overlay"><div class="modal payroll-receipt-ready" role="dialog" aria-modal="true">'+
  '<div class="modalhead"><h2>تم تسجيل صرف الراتب</h2><button class="close" type="button" data-action="close">'+uiIcon('x',18)+'</button></div>'+
  '<div class="payroll-success-mark">'+uiIcon('check',26)+'</div>'+
  '<h3>'+E(payload.employeeName)+'</h3>'+
  '<p>تم اعتماد مبلغ '+E(money(payload.amount,payload.currency))+' مقابل راتب '+E(payload.salaryMonth)+'.</p>'+
  '<p class="subtle">رقم الوصل: <b>'+E(payload.receiptNumber)+'</b> — الصرف بواسطة '+E(payload.paidBy)+'</p>'+
  '<p class="subtle">وصل رسمي A5 (نصف A4) جاهز للطباعة والتوقيع من الموظف ومسؤول الصرف.</p>'+
  '<div class="actions"><button class="btn" type="button" data-payroll-receipt="'+E(payment.id)+'">'+
   uiIcon('download',17)+' تحميل وصل استلام الراتب PDF</button>'+
   '<button class="btn secondary" type="button" data-action="close">إغلاق</button></div></div></div>';
}
async function savePayrollPayment(form){
 if(s.savingPayroll)return;
 if(!canAccess('payroll','edit'))return toast('ليس لديك صلاحية صرف الرواتب.',true);
 const values=Object.fromEntries(new FormData(form).entries());
 const employee=lookup('employees',values.employee_id);
 if(!employee||!employee.active)return toast('اختر موظفاً فعالاً من القائمة.',true);
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(values.salary_month||'')))
  return toast('حدد شهر الراتب الصحيح.',true);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(values.paid_at||''))||
    Number.isNaN(Date.parse(values.paid_at+'T00:00:00Z')))
  return toast('حدد تاريخ صرف صحيحاً.',true);
 const amount=Number(values.amount),payer=String(values.paid_by||'').trim();
 if(!Number.isFinite(amount)||amount<=0||amount>100000000000)
  return toast('أدخل مبلغ الراتب الذي تم استلامه بشكل صحيح.',true);
 if(payer.length<2||payer.length>150)return toast('اكتب اسم الشخص المسؤول عن تسليم الراتب.',true);
 const record={
  employee_id:employee.id,salary_month:values.salary_month+'-01',
  paid_at:values.paid_at,amount:roundAmount(amount),currency:employee.salary_currency||'IQD',
  paid_by:payer,notes:String(values.notes||'').trim()||null,
  employee_name_snapshot:employee.name,job_title_snapshot:employee.job_title,
  department_snapshot:employee.department
 };
 s.savingPayroll=true;
 const button=form.querySelector?.('[type="submit"]');if(button)button.disabled=true;
 try{
  let saved;
  if(s.demo){
   const index=1+(s.data.payroll_payments||[]).length;
   saved={...record,id:uid(),receipt_number:'PR-'+serial4(index),created_at:new Date().toISOString()};
   s.data.payroll_payments.unshift(saved);
  }else{
   const {data,error}=await s.client.from('payroll_payments').insert(record).select().single();
   if(error||!data)throw Error(error?.message||'تعذر اعتماد الصرف.');
   saved=data;
  }
  s.view='employees';s.employeeFocus=employee.id;s.modal=null;
  if(!s.demo)await load();
  s.modal={kind:'payrollReceiptReady',paymentId:saved.id};
  render();
 }catch(error){toast('تعذر صرف الراتب: '+(error.message||String(error)),true);if(button)button.disabled=false}
 finally{s.savingPayroll=false}
}
function employeesOverview(){
 if(!canAccess('employees','read'))return '<div class="notice">هذا القسم محمي بصلاحيات الإدارة.</div>';
 const staff=s.data.employees||[],search=s.search.trim().toLocaleLowerCase();
 const shown=staff.filter(emp=>!search||[emp.name,emp.job_title,emp.department,emp.phone]
  .some(x=>String(x||'').toLocaleLowerCase().includes(search)));
 const active=staff.filter(emp=>emp.active);
 const salaryBudget=active.reduce((total,x)=>total+convert(Number(x.salary_amount)||0,x.salary_currency||'IQD',s.displayCurrency),0);
 const payments=s.data.payroll_payments||[];
 const legacy=(s.data.company_expenses||[]).filter(expense=>
  expense.employee_id&&expenseLineItems(expense).some(item=>item.category==='salaries'));
 const settled=payments.reduce((total,row)=>total+convert(row.amount,row.currency,s.displayCurrency),0)+
  legacy.reduce((total,row)=>total+convert(expensePaidAmount(row),row.currency,s.displayCurrency),0);
 const selected=s.employeeFocus?lookup('employees',s.employeeFocus):null;
 const history=selected?employeePayrollPayments(selected.id):[];
 const old=selected?employeeSalaryExpenses(selected.id):[];
 const cards=[
  ['الموظفون المسجّلون',staff.length],
  ['الموظفون الفعالون',active.length],
  ['الرواتب الشهرية المتوقعة',money(roundAmount(salaryBudget),s.displayCurrency)],
  ['الرواتب المصروفة المسجّلة',money(roundAmount(settled),s.displayCurrency)]
 ];
 return '<div class="hr-page"><div class="hr-stats">'+cards.map(([label,value])=>
  '<div class="box hr-stat"><small>'+E(label)+'</small><strong>'+E(value)+'</strong></div>').join('')+'</div>'+
  '<div class="notice">صرف الرواتب وأرشفتها وتحميل وصولات الاستلام صار من هنا فقط. الرواتب السابقة المسجلة داخل المصروفات محفوظة كأرشيف، وليست ضمن فواتير المصروفات الجديدة.</div>'+
  '<div class="toolbar"><input id="search" class="search" placeholder="بحث باسم الموظف أو قسمه..." value="'+E(s.search)+'">'+
   (canAccess('employees','edit')?'<button type="button" class="btn" data-new="employees">'+uiIcon('plus',16)+' إضافة موظف</button>':'')+
  '</div><div class="box tablewrap"><table class="table"><thead><tr>'+
  '<th>اسم الموظف</th><th>المسمّى والقسم</th><th>الراتب الشهري</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>'+
  (shown.length?shown.map(emp=>
   '<tr><td><strong>'+E(emp.name)+'</strong><small class="subtle hr-phone">'+E(emp.phone||'')+'</small></td>'+
   '<td>'+E(emp.job_title||'—')+'<small class="subtle hr-phone">'+
    E(EXPENSE_DEPARTMENTS.find(([code])=>code===emp.department)?.[1]||'—')+'</small></td>'+
   '<td>'+E(money(emp.salary_amount,emp.salary_currency||'IQD'))+'</td>'+
   '<td>'+E(emp.active?'فعال':'غير فعال')+'</td>'+
   '<td class="hr-actions">'+
   (canAccess('employees','edit')?'<button class="linkbtn" data-edit="employees:'+E(emp.id)+'">'+uiIcon('pencil',14)+' تعديل</button>':'')+
   (canAccess('payroll','edit')?'<button class="linkbtn" type="button" data-payroll-create="'+E(emp.id)+'">'+uiIcon('wallet',14)+' صرف راتب</button>':'')+
   '<button class="linkbtn" type="button" data-employee-history="'+E(emp.id)+'">'+uiIcon('history',14)+' سجل الرواتب</button></td></tr>'
  ).join(''):'<tr><td colspan="5" class="empty">لا يوجد موظفون مطابقون.</td></tr>')+'</tbody></table></div>'+
  (selected?'<section class="box hr-history"><div class="hr-history-top"><h3>الرواتب والسندات — '+E(selected.name)+'</h3>'+
  '<button class="btn secondary mini" type="button" data-employee-history="">إغلاق السجل</button></div>'+
  (history.length?'<div class="tablewrap"><table class="table"><thead><tr>'+
    '<th>رقم السند</th><th>راتب شهر</th><th>تاريخ الصرف</th><th>المبلغ المصروف</th><th>مسؤول الصرف</th><th>الوصل</th>'+
    '</tr></thead><tbody>'+history.map(pay=>
    '<tr><td>'+E(pay.receipt_number)+'</td><td>'+E(String(pay.salary_month).slice(0,7))+'</td>'+
    '<td>'+E(pay.paid_at)+'</td><td>'+E(money(pay.amount,pay.currency))+'</td>'+
    '<td>'+E(pay.paid_by)+'</td><td><button type="button" class="linkbtn" data-payroll-receipt="'+E(pay.id)+'">'+
      uiIcon('download',15)+' تحميل PDF</button></td></tr>').join('')+'</tbody></table></div>':
   '<p class="notice">ماكو دفعات راتب حديثة لهذا الموظف بعد.</p>')+
  (old.length?'<div class="hr-legacy"><h4>الأرشيف السابق من المصروفات</h4>'+
   old.map(row=>'<p>'+E(row.expense_date)+' — '+E(row.title)+' — '+E(money(expensePaidAmount(row),row.currency))+
   ' — الصرف بواسطة '+E(row.paid_by||'—')+'</p>').join('')+'</div>':'')+
  '</section>':'')+'</div>';
}
function activityDetail(log){
 const map={
  status:'الحالة',active:'الفعالية',amount:'المبلغ',currency:'العملة',rent_total:'الإيجار',
  paid_amount:'المدفوع',start_date:'البداية',end_date:'النهاية',
  salary_amount:'الراتب الشهري',salary_currency:'عملة الراتب',category:'التصنيف',
  payment_method:'طريقة الدفع',payment_frequency:'الدورية',department:'القسم',
  site_type:'نوع الموقع',expense_date:'تاريخ الفاتورة',employee_id:'الموظف المستفيد',
  due_date:'الاستحقاق',quantity:'الكمية',price:'السعر',job_title:'المنصب',code:'رمز القطعة',
  name:'الاسم',title:'العنوان',address:'الموقع',governorate:'المحافظة',package_id:'الباقة',
  site_id:'قطعة الإعلان',landlord_id:'المالك',customer_id:'الزبون',property_id:'العقار',
  rooftop_property_id:'السطح المرتبط'
 };
 const pairs=Object.entries(log.changes||{});
 if(!pairs.length)return '—';
 return pairs.slice(0,8).map(([key,value])=>{
  const format=v=>v===null||v===undefined?'—':typeof v==='object'?JSON.stringify(v):String(v);
  return (map[key]||key)+': '+format(value?.old)+' ← '+format(value?.new);
 }).join(' • ');
}
function activityLogsView(){
 if(!canAccess('activity_logs','read'))return '<div class="notice">سجل الحركات يحتاج صلاحية خاصة.</div>';
 const labelsByTable={
  customers:'الزبائن',packages:'الباقات',package_rates:'أسعار الباقات',
  landlords:'مالكو الأسطح',properties:'العقارات',ad_sites:'المواقع الإعلانية',
  campaigns:'الحملات',campaign_sites:'لوحات الحملات',campaign_payments:'دفعات الحملات',
  leases:'عقود الأسطح',lease_installments:'أقساط الإيجارات',
  customer_contracts:'عقود الزبائن',company_expenses:'الفواتير والمصروفات',
  employees:'الموظفون',settings:'إعدادات الشركة',staff_members:'صلاحيات المستخدمين'
 };
 const q=(s.activityQuery||'').trim().toLocaleLowerCase(),filter=s.activityAction||'all';
 const rows=(s.activityLogs||[]).filter(item=>(filter==='all'||item.action===filter)&&
  (!q||[item.table_name,item.record_label,item.actor_email,item.actor_id,
    labelsByTable[item.table_name],activityDetail(item)].some(val=>String(val||'').toLocaleLowerCase().includes(q))));
 return '<div class="activity-page"><div class="notice">سجل تلقائي موثق من قاعدة البيانات للإضافات والتعديلات والحذف. تظهر أحدث 300 حركة فقط، وليس تعديلات حصلت قبل تفعيل السجل. السجل للقراءة فقط.</div>'+
 '<div class="toolbar"><input id="activitySearch" class="search" placeholder="بحث عن سجل أو مستخدم أو تغيير..." value="'+E(s.activityQuery||'')+'">'+
 '<select id="activityAction" class="search">'+[
  ['all','كل الحركات'],['INSERT','إضافة'],['UPDATE','تعديل'],['DELETE','حذف']
 ].map(([value,label])=>'<option value="'+value+'"'+(filter===value?' selected':'')+'>'+label+'</option>').join('')+'</select>'+
 '<button type="button" class="btn secondary" data-activity-refresh>'+uiIcon('refresh',15)+' تحديث الحركات</button></div>'+
 '<div class="box tablewrap"><table class="table activity-table"><thead><tr><th>التوقيت</th><th>الإجراء</th><th>القسم</th><th>السجل</th><th>المستخدم</th><th>تفاصيل التغيير</th></tr></thead><tbody>'+
 (rows.length?rows.map(item=>'<tr><td><small>'+E(new Date(item.occurred_at).toLocaleString('ar-IQ',{timeZone:'Asia/Baghdad',dateStyle:'short',timeStyle:'short'}))+'</small></td>'+
 '<td><span class="activity-action activity-action-'+E(item.action.toLowerCase())+'">'+
 E(({INSERT:'إضافة',UPDATE:'تعديل',DELETE:'حذف'})[item.action]||item.action)+'</span></td>'+
 '<td>'+E(labelsByTable[item.table_name]||item.table_name)+'</td><td>'+E(item.record_label)+'</td>'+
 '<td title="'+E(item.actor_id||'')+'">'+E(item.actor_email||item.actor_id?.slice(0,12)||'النظام')+'</td>'+
 '<td class="activity-description">'+E(activityDetail(item))+'</td></tr>').join(''):
 '<tr><td colspan="6" class="empty">لا توجد حركات مطابقة للفلاتر.</td></tr>')+'</tbody></table></div>'+
 '<p class="subtle">عدد الحركات المعروضة: '+rows.length+'</p></div>';
}
async function refreshActivityLogs(){
 if(!s.demo&&(!s.client||!canAccess('activity_logs','read')))return;
 if(s.demo){s.activityLogs=[];render();return}
 const {data,error}=await s.client.from('activity_logs').select('*').order('occurred_at',{ascending:false}).limit(300);
 if(error)return toast('تعذّر تحديث سجل الحركات: '+error.message,true);
 s.activityLogs=data||[];render();
}
function openSalaryExpense(employeeId){return openPayrollPayment(employeeId)}


function contractDeleteAction(table,row){
 if(!row?.id||(!s.demo&&s.staff?.role!=='admin'))return '';
 return '<button type="button" class="lease-row-action customer-delete-link" data-delete-contract="'+E(table+':'+row.id)+'">'+uiIcon('trash',15)+'<span>حذف العقد</span></button>';
}
function openContractDelete(table,id){
 if(!['leases','customer_contracts'].includes(table))return;
 if(!s.demo&&s.staff?.role!=='admin')return toast('حذف العقود متاح للمدير الرئيسي فقط.',true);
 const row=lookup(table,id);
 if(!row)return toast('هذا العقد غير موجود.',true);
 s.modal={kind:'deleteContract',table,data:{...row}};render();
}
function contractDeleteDialog(){
 const m=s.modal,lease=m.table==='leases',row=m.data;
 const installments=lease?s.data.lease_installments.filter(x=>x.lease_id===row.id):[];
 const paid=installments.reduce((sum,x)=>sum+Number(x.paid_amount||0),0);
 return '<div class="overlay"><div class="modal" role="dialog" aria-modal="true">'+
 '<div class="modalhead"><h2>حذف العقد نهائياً — '+E(numberedContract(row.contract_number))+'</h2><button class="close" type="button" data-action="close">'+uiIcon('x',18)+'</button></div>'+
 '<div class="error"><strong>تحذير: لا يمكن التراجع عن الحذف النهائي من داخل النظام.</strong></div>'+
 (lease?'<p>سيُحذف عقد السطح وجميع أقساطه المرتبطة به فقط، بدون حذف المالك أو السطح أو العقود الأخرى.</p>'+
 '<div class="notice">عدد الأقساط: '+installments.length+' · المسدّد: '+E(money(paid,row.currency))+'. احتفظ بوصولاتك والنسخة الاحتياطية قبل الحذف.</div>':
 '<p>سيُحذف عقد الزبون فقط. بيانات الزبون والحملة ودفعاتها والعقود الأخرى لن تُحذف.</p>')+
 '<form id="deleteContractForm"><label class="field"><span>اكتب «حذف» للتأكيد *</span><input id="deleteContractConfirmation" autocomplete="off" required></label>'+
 '<div class="actions"><button id="deleteContractSubmit" class="btn danger" type="submit" disabled>'+uiIcon('trash',16)+' حذف نهائي</button><button type="button" class="btn secondary" data-action="close">إلغاء</button></div></form></div></div>';
}
async function deleteContractConfirmed(form){
 if(s.deletingContract||s.modal?.kind!=='deleteContract')return;
 if(!s.demo&&s.staff?.role!=='admin')return toast('الحذف متاح للمدير الرئيسي فقط.',true);
 if(form.querySelector('#deleteContractConfirmation')?.value?.trim()!=='حذف')return toast('اكتب كلمة حذف للتأكيد.',true);
 const table=s.modal.table,row=s.modal.data;
 s.deletingContract=true;
 const button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
 try{
  if(s.demo){
   s.data[table]=s.data[table].filter(x=>x.id!==row.id);
   if(table==='leases'){
    s.data.lease_installments=s.data.lease_installments.filter(x=>x.lease_id!==row.id);
    s.data.leases=s.data.leases.map(x=>x.renewed_from===row.id?{...x,renewed_from:null}:x);
   }
  }else{
   const {data,error}=await s.client.from(table).delete().eq('id',row.id).select('id').single();
   if(error||!data)throw Error(error?.message||'قاعدة البيانات لم تؤكد حذف العقد.');
  }
  s.modal=null;s.view=table;s.search='';
  if(s.demo)render();else await load();
  toast('تم حذف العقد '+numberedContract(row.contract_number)+' بنجاح.');
 }catch(e){toast('تعذر حذف العقد: '+(e.message||String(e)),true);if(button)button.disabled=false}
 finally{s.deletingContract=false}
}

function leaseRowActions(row){
 const id=E(row.id),number=E(numberedContract(row.contract_number));
 return '<div class="lease-row-actions" role="group" aria-label="إجراءات عقد '+number+'">'+
  '<button type="button" class="lease-row-action" data-preview="'+id+'">'+uiIcon('file',15)+'<span>التفاصيل</span></button>'+
  '<button type="button" class="lease-row-action" data-edit="leases:'+id+'">'+uiIcon('pencil',15)+'<span>تعديل العقد</span></button>'+
  '<button type="button" class="lease-row-action lease-row-action-primary" data-landlord-pdf="'+id+'" data-pdf-mode="preview">'+uiIcon('printer',15)+'<span>مراجعة وطباعة</span></button>'+
  '<button type="button" class="lease-row-action" data-lease-payments="'+id+'">'+uiIcon('receipt',15)+'<span>الأقساط والدفعات</span></button>'+contractDeleteAction('leases',row)+
 '</div>';
}
function customerContractPaymentAction(row){
 const linked=Boolean(row?.campaign_id&&lookup('campaigns',row.campaign_id));
 const allowed=canAccess('campaign_payments','read');
 const disabled=!linked||!allowed;
 const tip=!linked?'العقد غير مرتبط بحملة محفوظة':
  !allowed?'ما عندك صلاحية لعرض دفعات الحملات':'فتح الدفعات التابعة لحملة هذا العقد';
 return '<button type="button" class="lease-row-action" data-customer-payments="'+E(row?.id||'')+'"'+
  (disabled?' disabled title="'+E(tip)+'"':' title="'+E(tip)+'"')+'>'+
  uiIcon('receipt',15)+'<span>دفعات الحملة</span></button>';
}
function customerContractRowActions(row){
 const id=E(row.id),number=E(numberedContract(row.contract_number));
 return '<div class="lease-row-actions" role="group" aria-label="إجراءات عقد الزبون '+number+'">'+
  '<button type="button" class="lease-row-action" data-customer-preview="'+id+'">'+uiIcon('file',15)+'<span>التفاصيل</span></button>'+
  '<button type="button" class="lease-row-action" data-edit="customer_contracts:'+id+'">'+uiIcon('pencil',15)+'<span>تعديل العقد</span></button>'+
  '<button type="button" class="lease-row-action lease-row-action-primary" data-customer-pdf="'+id+'" data-pdf-mode="preview">'+uiIcon('printer',15)+'<span>مراجعة وطباعة</span></button>'+
  customerContractPaymentAction(row)+contractDeleteAction('customer_contracts',row)+'</div>';
}
function customerContractEditTools(row){
 const id=E(row.id);
 return '<section class="lease-form-tools"><div class="lease-form-tools-head">'+
  '<strong>إجراءات عقد الزبون</strong><small>احفظ تعديلات التواقيع والشروط أعلاه أولاً. مراجعة PDF مستقلة عن بيانات العقد المحفوظة.</small>'+
  '</div><div class="lease-row-actions lease-row-actions-modal">'+
  '<button type="button" class="lease-row-action" data-customer-preview="'+id+'">'+uiIcon('file',15)+' التفاصيل</button>'+
  '<button type="button" class="lease-row-action lease-row-action-primary" data-customer-pdf="'+id+'" data-pdf-mode="preview">'+uiIcon('printer',15)+' مراجعة وطباعة العقد</button>'+
  customerContractPaymentAction(row)+contractDeleteAction('customer_contracts',row)+'</div></section>';
}
function listing(k){
 if(k==='campaign_payments')return campaignPaymentOverview();
 if(k==='company_expenses')return expenseOverview();
 if(k==='lease_installments')return leaseInstallmentsOverview();
 const rows=visibleTable(k).filter(x=>{
  let q=s.search.trim().toLocaleLowerCase(),match=!q||JSON.stringify(x).toLocaleLowerCase().includes(q)||
   (x.landlord_id&&nameOf('landlords',x.landlord_id).toLocaleLowerCase().includes(q))||
   (x.customer_id&&nameOf('customers',x.customer_id).toLocaleLowerCase().includes(q))||
   (x.property_id&&nameOf('properties',x.property_id).toLocaleLowerCase().includes(q));
  return match&&(k!=='customers'||s.filter==='all'||x.status===s.filter);
 });
 let labelsBy={campaign_payments:'تسجيل دفعة'};
 return (k==='packages'?packageCatalog():'')+(k==='leases'?'<div class="notice">هذه العقود بين شركة رأفت ومالكي البنايات لاستئجار الأسطح فقط، وليست عقود الزبائن.</div>':k==='customer_contracts'?'<div class="notice">عقود الزبائن للكابينات أو الأسطح تُنشأ من الباقات الإعلانية، وهي مستقلة عن عقود ملاك البنايات.</div>':'')+'<div class="toolbar"><div class="filters"><input class="search" style="width:min(320px,85vw)" id="search" placeholder="'+(k==='customers'?'ابحث باسم العميل أو رقم هاتفه...':k==='leases'?'ابحث باسم المالك أو رقم العقد أو اسم السطح...':k==='customer_contracts'?'ابحث باسم الزبون أو رقم العقد...':'بحث بالاسم أو الرقم أو الموقع...')+'" value="'+E(s.search)+'">'+(k==='customers'?'<select id="statusfilter" class="search" style="width:150px">'+[['all','جميع الحالات'],['active','فعال'],['inactive','غير فعال'],['inquiry','استفسار']].map(([v,t])=>'<option value="'+v+'" '+(s.filter===v?'selected':'')+'>'+t+'</option>').join('')+'</select>':'')+'</div><button class="btn" data-new="'+k+'">'+uiIcon('plus',16)+(labelsBy[k]||'إضافة جديد')+'</button></div><div class="box tablewrap"><table class="table"><thead><tr>'+columns[k].map(x=>'<th>'+x[1]+'</th>').join('')+'<th>إجراءات</th></tr></thead><tbody>'+ (rows.length?rows.map(row=>'<tr>'+columns[k].map(([f])=>'<td>'+showVal(k,row,f)+'</td>').join('')+'<td'+(['leases','customer_contracts'].includes(k)?' class="lease-row-actions-cell"':'')+'>'+(k==='leases'?leaseRowActions(row):k==='customer_contracts'?customerContractRowActions(row):'<button class="linkbtn" data-edit="'+k+':'+row.id+'">'+uiIcon('pencil',14)+' تفاصيل / تعديل</button>')+(k==='landlords'&&s.staff?.role==='admin'?'<button class="linkbtn customer-delete-link" type="button" data-delete-landlord="'+E(row.id)+'">'+uiIcon('trash',14)+' حذف المالك</button>':'')+
 (k==='ad_sites'&&(s.demo||s.staff?.role==='admin')?'<button type="button" class="linkbtn customer-delete-link" data-delete-site="'+E(row.id)+'">'+uiIcon('trash',14)+' حذف الموقع</button>':'')+(k==='customers'?'<button class="linkbtn" data-new-linked="campaigns|customer_id|'+row.id+'">'+uiIcon('plus',14)+' حملة</button>'+(s.staff?.role==='admin'?'<button type="button" class="linkbtn customer-delete-link" data-delete-customer="'+E(row.id)+'">'+uiIcon('trash',14)+' حذف</button>':''):'')+'</td></tr>').join(''):'<tr><td colspan="9" class="empty">لا توجد سجلات مطابقة</td></tr>')+'</tbody></table></div><p class="subtle" style="margin-top:13px">عدد السجلات الظاهرة: '+rows.length+'. يتم تحميل كل السجلات الموجودة حالياً بالقاعدة.</p>';
}

function reports(){
 const counts=[['جميع العملاء',s.data.customers.length],['فعال',s.data.customers.filter(x=>x.status==='active').length],['غير فعال',s.data.customers.filter(x=>x.status==='inactive').length],['استفسار',s.data.customers.filter(x=>x.status==='inquiry').length]];
 const receipts=s.data.campaign_payments.reduce((total,p)=>total+convert(p.amount,originalCurrency('campaign_payments',p),s.displayCurrency),0);
 const outstanding=s.data.campaigns.reduce((total,v)=>total+convert(campaignBalance(v),v.currency,s.displayCurrency),0);
 const rents=s.data.lease_installments.reduce((total,v)=>total+convert(Math.max(0,Number(v.amount)-Number(v.paid_amount)),originalCurrency('lease_installments',v),s.displayCurrency),0);
 const late=s.data.lease_installments.filter(x=>x.due_date<=today()&&Number(x.paid_amount)<Number(x.amount));
 return '<div class="cards">'+counts.map(([a,b])=>'<div class="box stat"><small>'+a+'</small><b>'+b+'</b></div>').join('')+'</div><div class="box"><h2>التقرير المالي المترابط</h2><div class="summary"><div><small>الدفعات المستلمة من الحملات</small><b>'+E(money(receipts,s.displayCurrency))+'</b></div><div><small>الذمم المتبقية على العملاء</small><b>'+E(money(outstanding,s.displayCurrency))+'</b></div><div><small>أقساط الإيجار غير المسددة</small><b>'+E(money(rents,s.displayCurrency))+'</b></div><div><small>أقساط إيجار مستحقة حتى اليوم</small><b>'+late.length+'</b></div></div><p class="subtle" style="margin-top:12px">التقرير يعرض بالعملة المختارة بالأعلى وبسعر الصرف المحدد في الإعدادات؛ العقود والدفعات تبقى بعملتها الأصلية.</p><hr><h2>تقرير العملاء</h2><p class="muted">تصدير CSV يتضمن بيانات هوية حساسة — احفظ التقرير بشكل آمن.</p><button class="btn" data-action="exportCustomers" >'+uiIcon('download',16)+' تصدير العملاء CSV</button><hr><h2>التقارير المالية</h2><div class="inline"><button class="btn secondary" data-action="exportCampaigns" >'+uiIcon('download',16)+' تصدير الحملات</button><button class="btn secondary" data-action="exportInstallments" >'+uiIcon('download',16)+' تصدير أقساط الإيجار</button></div></div>';
}

function settings(){
 const editable=canAccess('settings','edit');
 const val=key=>E(s.settings?.[key]??COMPANY_DEFAULTS[key]??'');
 const field=(name,label,type='text',placeholder='',required=false)=>
  name==='company_governorate'?governorateField(name,label,s.settings?.[name],required):
  '<label class="field"><span>'+label+(required?' *':'')+'</span><input name="'+name+'" type="'+type+'" maxlength="250" '+(required?'required':'')+' value="'+val(name)+'" placeholder="'+E(placeholder)+'"></label>';
 const logo=companyLogoUrl();
 return '<div class="settings-page">'+
  '<div class="settings-intro"><div><span class="settings-eyebrow">إعدادات الشركة</span><h2>هوية الشركة وإعدادات النظام</h2><p>عدّل بيانات الشركة التي تظهر في واجهة النظام. العقود وملفات PDF مستقلة حتى نعتمد التصميم النهائي.</p></div><span class="settings-state">'+(s.demo?'وضع تجريبي':editable?'صلاحية المدير':'عرض فقط')+'</span></div>'+
  '<div class="settings-layout"><div class="settings-main"><form id="settingsForm">'+
   '<section class="settings-panel"><div class="settings-section-title"><span class="settings-section-icon">'+uiIcon('image',22)+'</span><div><h3>الهوية والعلامة التجارية</h3><p>الاسم الرسمي للشركة والاسم المختصر الظاهر بالقائمة</p></div></div>'+
    '<div class="formgrid">'+field('company_name','اسم الشركة الرسمي','text','اسم الشركة كما يظهر في النظام',true)+field('company_short_name','الاسم المختصر','text','مثال: رأفت',true)+
    '<label class="field full"><span>الوصف المختصر / الشعار النصي</span><input name="company_tagline" maxlength="250" type="text" value="'+val('company_tagline')+'" placeholder="للدعاية والإعلان والتجارة العامة"></label></div>'+
    '<div class="settings-logo-row"><div class="settings-logo-visual" id="settingsLogoPreview">'+(logo?'<img id="settingsLogoImage" src="'+E(logo)+'" alt="شعار الشركة الحالي"><span id="settingsLogoFallback" hidden>'+E(String(companyValue('company_short_name')).trim().slice(0,1))+'</span>':'<img id="settingsLogoImage" alt="معاينة الشعار" hidden><span id="settingsLogoFallback">'+E(String(companyValue('company_short_name')).trim().slice(0,1))+'</span>')+'</div>'+
    '<div class="settings-logo-fields"><h4>شعار الشركة</h4><p>ارفع شعار PNG أو JPG أو WebP بحجم حتى 4MB. يُفضّل شعار واضح بخلفية شفافة؛ سيظهر في واجهة النظام.</p>'+
    '<label class="settings-file-button" for="companyLogoFile">'+uiIcon('image',15)+' اختيار ملف الشعار</label><input type="file" id="companyLogoFile" name="company_logo_file" accept="image/png,image/jpeg,image/webp" class="settings-file-input"'+(editable?'':' disabled')+'>'+
    '<small id="settingsLogoFilename">'+(logo?'الشعار الحالي محفوظ':'لم يُرفع شعار بعد')+'</small>'+
    (logo?'<button type="button" class="settings-remove-logo" data-action="removeCompanyLogo">إزالة الشعار</button>':'')+
    '<input type="hidden" name="remove_logo" id="removeCompanyLogo" value="false"></div></div>'+
   '</section>'+
   '<section class="settings-panel"><div class="settings-section-title"><span class="settings-section-icon">'+uiIcon('pin',22)+'</span><div><h3>التواصل والموقع</h3><p>معلومات التواصل الرسمية المحفوظة في ملف الشركة</p></div></div>'+
    '<div class="formgrid">'+field('company_phone','رقم الهاتف','tel','07XXXXXXXXX')+field('company_whatsapp','رقم واتساب','tel','9647XXXXXXXXX')+
    field('company_email','البريد الإلكتروني','email','company@example.com')+field('company_website','الموقع الإلكتروني','url','https://example.com')+
    field('company_governorate','المحافظة','text','صلاح الدين')+field('company_city','المدينة','text','تكريت')+
    '<label class="field full"><span>العنوان التفصيلي</span><textarea name="company_address" maxlength="500" rows="2" placeholder="الشارع، المنطقة، أقرب نقطة دالة">'+val('company_address')+'</textarea></label>'+
    '<label class="field full"><span>رقم التسجيل / السجل التجاري (اختياري)</span><input name="company_registration" maxlength="250" type="text" value="'+val('company_registration')+'"></label></div>'+
   '</section>'+
   '<section class="settings-panel"><div class="settings-section-title"><span class="settings-section-icon">'+uiIcon('money',22)+'</span><div><h3>المالية وسعر الصرف</h3><p>تحويل الدولار والدينار في الباقات والحملات والدفعات دون تغيير أصل المبلغ</p></div></div>'+
    '<div class="formgrid"><label class="field"><span>سعر الدولار: 1 USD = كم IQD؟</span><input name="usd_iqd" type="number" min=".0001" step="any" required value="'+E(s.settings.usd_iqd)+'"></label><div class="settings-rate-note"><small>سعر الصرف المعتمد حالياً</small><strong>1 USD = '+E(fmt(s.settings.usd_iqd))+' IQD</strong></div></div>'+
   '</section>'+
   (editable?'<div class="settings-savebar"><div><strong>حفظ إعدادات الشركة</strong><small>التغييرات تُحدَّث في واجهة النظام فقط، ولا تؤثر في العقود.</small></div><button class="btn" type="submit">'+uiIcon('save',16)+' حفظ كل الإعدادات</button></div>':
    '<div class="notice">عرض فقط: تعديل معلومات الشركة والشعار وسعر الصرف متاح للمدير الرئيسي.</div>')+
  '</form></div>'+
  '<aside class="settings-preview-column"><div class="settings-preview-card"><small class="settings-preview-kicker">LIVE PREVIEW</small><h3>معاينة هوية الشركة</h3><div class="settings-preview-logo" id="settingsBrandPreview">'+companyLogoHtml('preview')+'</div><b id="settingsPreviewName">'+E(companyValue('company_name'))+'</b><p id="settingsPreviewTagline">'+E(companyValue('company_tagline'))+'</p><div class="settings-preview-contact" id="settingsPreviewContact">'+E([companyValue('company_governorate'),companyValue('company_city'),companyValue('company_phone')].filter(Boolean).join(' • ')||'بيانات التواصل تظهر هنا بعد إضافتها')+'</div><hr><span class="settings-preview-note">تظهر الهوية في واجهة النظام. تصميم العقود سيكون من قالب PDF منفصل.</span></div></aside>'+
  '</div></div>';
}
function accessDenied(){return '<div class="welcome"><div class="authbox"><h1>الصلاحية غير مفعلة</h1><p class="muted">تم تسجيل الدخول، لكن حسابك غير مضاف إلى موظفي نظام رأفت.</p><div class="notice">يجب إضافة معرّف حسابك إلى جدول staff_members من لوحة Supabase بدور admin أو staff، ثم تسجيل الدخول مجدداً.</div><button class="btn" data-action="logout">تسجيل خروج</button></div></div>'}
function render(){
 closeAppSelectPopup();
 if(![...keys,'dashboard','reports','settings','alerts','activity_logs','staff_admin','inventory'].includes(s.view))s.view='dashboard';
 if(s.staff&&s.view==='staff_admin'&&s.staff.role!=='admin')s.view='dashboard';
 if(s.staff&&s.view!=='dashboard'&&s.view!=='alerts'&&s.view!=='staff_admin'&&
    !canAccess(TABLE_ACCESS[s.view]||s.view,'read'))s.view='dashboard';
 if((s.staff||s.demo)&&s.view)localStorage.setItem('raafat-last-view',s.view);
 let target=$('#app');
 if(typeof document!=='undefined')document.title=companyValue('company_short_name')+' | نظام الإدارة';
 let content=s.view==='dashboard'?dashboard():s.view==='alerts'?alertsView():s.view==='reports'?reports():s.view==='settings'?settings():
  s.view==='activity_logs'?activityLogsView():s.view==='staff_admin'?staffAdminView():
   s.view==='employees'?employeesOverview():s.view==='inventory'?inventory.page():listing(s.view);
 if(s.passwordRecovery){target.innerHTML=passwordRecoveryPage();}
 else if(s.resetRequest){target.innerHTML=passwordResetRequestPage();}
 else if(!s.demo&&!s.session){target.innerHTML=authPage();}
 else if(!s.demo&&!s.staff&&!s.loading){target.innerHTML=accessDenied();}
 else{target.innerHTML=shell(content)+(s.modal?modalHtml():'')+(s.view==='inventory'?inventory.printSheet():'');}
 bind();
}

function rooftopSizeDetails(property){
 if(!property)return {dimensions:'القياس غير مسجل',area:'غير مسجلة',quantity:'غير مسجل'};
 const width=Number(property.width_m),height=Number(property.height_m);
 const dimensions=width>0&&height>0?fmt(width)+' × '+fmt(height)+' م':
  String(property.dimensions||'').trim()||'القياس غير مسجل';
 const area=Number(property.area_m2)>0?Number(property.area_m2):
  width>0&&height>0?width*height:0;
 const quantity=Number(property.quantity)>0?fmt(property.quantity):'غير مسجل';
 return {dimensions,area:area>0?fmt(area)+' م²':'غير مسجلة',quantity};
}
function rooftopChoiceLabel(property){
 const size=rooftopSizeDetails(property);
 return String(property?.title||'سطح دون اسم')+' — '+size.dimensions+
  ' · المساحة '+size.area+' · العدد '+size.quantity;
}
function leasePropertyPicker(lease){
 const owner=lookup('landlords',lease?.landlord_id);
 const roofs=owner?s.data.properties.filter(row=>row.landlord_id===owner.id):[];
 if(!owner)return '<div class="lease-roof-guide full">'+
  '<div class="lease-roof-guide-heading">'+uiIcon('house',19)+
  '<span><strong>اختيار السطح المؤجّر</strong><small>اختر اسم المالك أولاً حتى تظهر أسطحه مع الأبعاد والمساحات.</small></span></div></div>';
 const choices=roofs.map((property,index)=>{
  const m=rooftopSizeDetails(property),chosen=String(lease?.property_id||'')===String(property.id);
  return '<button type="button" class="lease-roof-choice'+(chosen?' selected':'')+
   '" data-lease-property="'+E(property.id)+'" aria-pressed="'+chosen+'">'+
   '<span class="lease-roof-choice-top"><span class="lease-roof-number">السطح '+serial4(index+1)+'</span>'+
   '<span class="lease-roof-check">'+(chosen?uiIcon('check',16):uiIcon('house',16))+'</span></span>'+
   '<strong class="lease-roof-name">'+E(property.title||'سطح بدون اسم')+'</strong>'+
   '<span class="lease-roof-metrics"><span><small>الطول × العرض</small><b>'+E(m.dimensions)+'</b></span>'+
   '<span><small>المساحة</small><b>'+E(m.area)+'</b></span>'+
   '<span><small>العدد</small><b>'+E(m.quantity)+'</b></span></span>'+
   (property.notes?'<span class="lease-roof-hint">'+E(String(property.notes).slice(0,150))+'</span>':'')+
   '</button>';
 }).join('');
 const selected=roofs.find(x=>String(x.id)===String(lease?.property_id||''));
 return '<section class="lease-roof-guide full" aria-label="الأسطح والعقارات المسجّلة للمالك">'+
 '<div class="lease-roof-guide-heading">'+uiIcon('house',19)+
 '<span><strong>أسطح المالك: '+E(owner.name)+'</strong>'+
 '<small>'+(roofs.length?'راجع قياس كل سطح ومساحته واضغط على القطعة الصحيحة. اختيارك يتزامن مع حقل العقار بالأعلى.':
 'هذا المالك ما عنده أسطح مسجّلة. أضف العقار أولاً من قسم مالكي الأسطح.')+'</small></span>'+
 '<span class="lease-roof-count">'+roofs.length+' سطح</span></div>'+
 (selected?'<div class="lease-roof-selected">'+uiIcon('check',15)+
  'المحدد حالياً: <b>'+E(rooftopChoiceLabel(selected))+'</b></div>':'')+
 (roofs.length?'<div class="lease-roof-grid">'+choices+'</div>':'<div class="notice">لا توجد عقارات مسجّلة لهذا المالك.</div>')+
 '</section>';
}

function optionText(k,x){return k==='landlords'||k==='customers'?x.name:k==='properties'?rooftopChoiceLabel(x)+' — '+nameOf('landlords',x.landlord_id):k==='packages'?x.name+' ('+x.code+' / '+(labels[x.package_type]||x.package_type||'')+')':k==='ad_sites'?x.code+' — '+x.name:k==='leases'?numberedContract(x.contract_number)+' — '+nameOf('landlords',x.landlord_id):k==='customer_contracts'?numberedContract(x.contract_number)+' — '+nameOf('customers',x.customer_id):k==='campaigns'?x.title+' — '+nameOf('customers',x.customer_id):'—';}

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
 const ids=s.modal?.siteIds||[],roofMode=pkg.pricing_mode==='sqm_month';
 const roofs=selectedRooftopAreas(ids);
 const q=quoteCampaign(v,ids);
 const formula=roofMode?
  'مساحة الأسطح المختارة ('+fmt(roofs.area)+' م²) × سعر المتر الشهري × '+Number(v.months||0)+' أشهر':
  'سعر القطعة لمدة '+Number(v.months||0)+' أشهر × '+Math.max(1,Number(v.quantity)||1,ids.length)+' قطعة × '+(campaignFaces(v,pkg)===1?'50% (خصم وجه واحد)':'100% (وجهان)');
 const details=roofMode?'<div class="campaign-auto-area"><strong>المساحة المحتسبة تلقائياً: '+E(fmt(roofs.area))+' م²</strong>'+
  '<small>من القياسات المسجلة مسبقاً في قسم الأسطح والعقارات، دون إدخال الأمتار من جديد.</small>'+
  (roofs.sites.length?'<small>'+E(roofs.sites.map(x=>(x.code||x.name)+' ('+fmt(x.area)+' م²)').join('، '))+'</small>':'')+
  (roofs.invalid.length?'<small class="campaign-area-error">هذه القطع بلا سطح مرتبط بقياس صحيح: '+E(roofs.invalid.join('، '))+'. صحّح ربط السطح وقياسه أولاً.</small>':'')+
  (!ids.length?'<small class="campaign-area-error">اختَر سطحاً من قائمة قطع الباقة E حتى تظهر المساحة والسعر.</small>':'')+
  '</div>':'';
 return '<div class="notice full"><b>'+E(pkg.name)+'</b> · '+E(formula)+details+
  '<div style="margin-top:6px">'+
  (q&&(!roofMode||!roofs.invalid.length)?'<strong>'+E(money(q.total,v.currency||'USD'))+'</strong> <small>('+E(money(q.usd,'USD'))+')</small>':
   '<b>'+E(roofMode?'اختَر سطحاً مسجلاً بقياس صحيح ومدة تسعير معتمدة':'الرجاء اختيار مدة مسعّرة صحيحة')+'</b>')+
  '</div></div>';
}



function campaignContractData(campaign){
 if(!campaign)return {campaign_id:'',customer_id:'',package_id:'',site_id:'',contract_type:'',ad_faces:2,
  duration_months:3,rented_area_m2:null,start_date:'',end_date:'',amount:0,currency:'USD'};
 const pkg=lookup('packages',campaign.package_id);
 const sites=linkedSites(campaign.id);
 const siteIds=sites.map(site=>site.id);
 const start=campaign.start_date||'';
 const months=Number(campaign.months||0);
 const area=Number(campaign.requested_area_m2)>0?Number(campaign.requested_area_m2):campaignSiteArea(siteIds)||null;
 return {
  campaign_id:campaign.id,customer_id:campaign.customer_id,package_id:campaign.package_id||'',
  site_id:sites[0]?.id||'',contract_type:pkg?.package_type||'cabin',
  duration_months:months,rented_area_m2:pkg?.pricing_mode==='sqm_month'?area:null,
  start_date:start,end_date:start&&months>0?addDays(plusMonths(start,months),-1):'',
  amount:Number(campaign.price),currency:campaign.currency,ad_faces:campaignFaces(campaign,pkg),
  campaign_title_snapshot:campaign.title,
  campaign_quantity_snapshot:Math.max(1,Number(campaign.quantity)||1,sites.length),
  campaign_sites_snapshot:sites.map(site=>({
   id:site.id,code:site.code,name:site.name,address:site.address,governorate:site.governorate,site_type:site.site_type
  })),
  campaign_locations_snapshot:campaign.locations||'',
  campaign_notes_snapshot:campaign.notes||''
 };
}
function contractCampaignDetails(contract){
 const cam=lookup('campaigns',contract.campaign_id);
 const snapshots=Array.isArray(contract.campaign_sites_snapshot)?contract.campaign_sites_snapshot:
  cam?linkedSites(cam.id):[];
 const sites=snapshots.map(liveContractSite).filter(Boolean);
 const qty=Number(contract.campaign_quantity_snapshot||cam?.quantity||0);
 const total=Math.max(qty,sites.length,0);
 const locations=contract.campaign_locations_snapshot??cam?.locations??'';
 const notes=contract.campaign_notes_snapshot??cam?.notes??'';
 return {sites,total,locations,notes,cam};
}
function contractCampaignSummary(v){
 const cam=lookup('campaigns',v.campaign_id);
 if(!cam)return '<div class="notice full">اختَر الحملة المسجلة أولاً. بعدها تظهر كل بيانات العقد تلقائياً دون إعادة اختيار المواقع أو الأسعار.</div>';
 const pack=lookup('packages',cam.package_id),customer=lookup('customers',cam.customer_id);
 const current=v.id?v:campaignContractData(cam);
 const {sites,total,locations}=contractCampaignDetails(current);
 const date=current.start_date||cam.start_date;
 const warnings=[];
 if(!date&&!v.id)warnings.push('تاريخ بدء الحملة غير محدد؛ افتح الحملة وأضف التاريخ قبل إصدار العقد.');
 if(!pack)warnings.push('الحملة ما بيها باقة مسجلة. حدّد الباقة في الحملة أولاً.');
 if(!sites.length&&!String(locations||'').trim())warnings.push('الحملة بلا مواقع إعلانية. حدّد القطع من الحملة أولاً.');
 const line=(label,value)=>'<div class="contract-campaign-item"><small>'+E(label)+'</small><b>'+E(value??'—')+'</b></div>';
 const siteList=sites.map(site=>'<div class="contract-campaign-site"><strong>'+E((site.code||'')+' — '+(site.name||''))+'</strong><small>'+E([site.governorate,site.address].filter(Boolean).join('، '))+'</small></div>').join('');
 return '<section class="contract-campaign-info full"><h3>تفاصيل الحملة المنقولة تلقائياً إلى العقد</h3>'+
  '<div class="contract-campaign-grid">'+
  line('العميل',customer?.name||v.customer_name_snapshot||'—')+
  line('الباقة',pack?.name||v.package_name_snapshot||'—')+
  line('عدد القطع المتفق عليها',total)+
  line('عدد الأوجه',campaignFacesText(current,pack))+
  line('المواقع المعيّنة فعلياً',sites.length)+
  line('مدة الحملة',current.duration_months+' أشهر')+
  line('بداية الحملة',date||'غير محددة')+
  line('نهاية الحملة',current.end_date||'غير محددة')+
  line('القيمة الإجمالية',money(current.amount,current.currency))+
  (pack?.pricing_mode==='sqm_month'?line('مساحة الإعلان',String(current.rented_area_m2??'—')+' م²'):'')+
  '</div><div class="contract-campaign-sites"><h4>القطع والمواقع التابعة لهذه الحملة</h4>'+
  (siteList||'<p>لم تسجّل قطع محددة على الحملة.</p>')+
  (locations?'<div class="contract-campaign-extra">مواقع إضافية مسجلة: '+E(locations)+'</div>':'')+
  '</div>'+(warnings.length?'<div class="notice">'+warnings.map(E).join(' ')+'</div>':'')+
  '<p class="subtle">رموز وأسماء وعناوين القطع تُعرض بأحدث تعديل. الأسعار والتواريخ والشروط المسجلة لا تتغير تلقائياً.</p></section>';
}

function quoteCustomerContract(v){
 const pkg=lookup('packages',v.package_id);
 if(!pkg)return null;
 const months=Number(v.duration_months||pkg.default_months||3);
 const area=Number(v.rented_area_m2)>0?Number(v.rented_area_m2):0;
 const baseUsd=quotePackageUSD(pkg,months,1,area);
 const usd=baseUsd===null?null:roundAmount(baseUsd*(discountedByFaces(pkg,campaignFaces(v,pkg))?0.5:1));
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
 if(k==='ad_sites'&&id==='code'){
  const prefix=String(lookup('packages',v.package_id)?.code||'').trim().toUpperCase();
  const number=siteNumberFromCode(val);
  return '<label class="field site-code-field"><span>رقم القطعة * (حرف الفئة تلقائياً)</span>'+
   '<span class="site-code-control"><b data-site-code-prefix>'+E(/^[A-E]$/.test(prefix)?prefix+'-':'اختر الفئة')+'</b>'+
   '<input name="site_number" type="text" inputmode="numeric" pattern="[0-9]+" maxlength="10" required placeholder="1" value="'+E(number)+'" aria-label="رقم القطعة فقط"></span>'+
   '<input type="hidden" name="code" value="'+E(siteCodeForPackage(number,v.package_id))+'">'+
   '<small class="subtle" data-site-code-example>'+(prefix&&number?'الرمز النهائي: '+E(prefix+'-'+number):'اختر الفئة ثم اكتب الرقم، مثلاً A-1')+'</small></label>';
 }
 if(k==='customer_contracts'&&id==='duration_months'&&v.package_id){const pack=lookup('packages',v.package_id);return '<label class="field"><span>مدة عقد الزبون</span><select name="duration_months" required>'+(v.id?[1,3,6,12]:packageMonths(pack)).map(m=>'<option value="'+m+'" '+(Number(val)===m?'selected':'')+'>'+m+' '+(m===1?'شهر':'أشهر')+'</option>').join('')+'</select></label>';}
 if(k==='campaigns'&&id==='ad_faces'){
   const pkg=lookup('packages',v.package_id);
   if(!pkg)return '';
   if(pkg.pricing_mode==='sqm_month'||String(pkg.code||'').toUpperCase()==='E')
    return '<div class="notice full">الباقة E تُحسب بالمتر المربع وتبقى على سعرها الأصلي؛ لا ينطبق عليها خصم الأوجه.</div>';
   return '<label class="field"><span>عدد أوجه الإعلان *</span><select name="ad_faces" required>'+
    '<option value="2"'+(campaignFaces(v,pkg)===2?' selected':'')+'>وجهان — السعر الكامل</option>'+
    '<option value="1"'+(campaignFaces(v,pkg)===1?' selected':'')+'>وجه واحد — خصم 50%</option>'+
    '</select><small>الخصم ينطبق على الباقات A وB وC وD فقط.</small></label>';
  }
  if(k==='campaigns'&&id==='quantity'&&lookup('packages',v.package_id)?.pricing_mode==='sqm_month')return '';
 if(k==='campaigns'&&id==='requested_area_m2')return ''; // E takes the area directly from selected registered rooftops.
 if(k==='campaigns'&&id==='months'&&v.package_id){const pack=lookup('packages',v.package_id);return '<label class="field"><span>مدة الإعلان بالأشهر</span><select name="months" required>'+packageMonths(pack).map(m=>'<option value="'+m+'" '+(Number(val)===m?'selected':'')+'>'+m+' '+(m===1?'شهر':'أشهر')+'</option>').join('')+'</select></label>';}
 if(id==='governorate')return governorateField(id,label,val,required);
 if(type==='computed')return '<label class="field"><span>'+E(label)+'</span><output class="computed-area" data-area-output>'+E(fmt(Number(v?.width_m||0)*Number(v?.height_m||0)))+' م²</output><small class="subtle">تُحسب تلقائياً: الطول × العرض</small></label>';
 if(k==='customer_contracts'&&id==='contract_type'){const type=lookup('packages',v.package_id)?.package_type||v.contract_type||'cabin';return '<label class="field"><span>نوع العقد من الباقة الإعلانية</span><output class="computed-area">'+E(labels[type]||type)+'</output><input type="hidden" name="contract_type" value="'+E(type)+'"></label>';}
 if(type==='file')return '<label class="field full"><span>'+E(label)+' — PNG/JPEG/WebP حتى 5MB</span><input name="'+id+'" type="file" accept="image/png,image/jpeg,image/webp"><span class="subtle">'+(v?.card_image_path?'صورة محفوظة خاصة':'ترفع إلى مساحة خاصة بعد الحفظ')+'</span></label>';
 if(type==='textarea')return '<label class="field full"><span>'+E(label)+'</span><textarea name="'+id+'">'+E(val)+'</textarea></label>';
 if(type.startsWith('lookup:')){
  let table=type.slice(7),rows=s.data[table].filter(x=>{
   if(id==='property_id'&&k==='leases')return Boolean(all?.landlord_id)&&x.landlord_id===all.landlord_id;
   if(id==='property_id'&&all?.landlord_id)return x.landlord_id===all.landlord_id;
   if(k==='customer_contracts'&&id==='campaign_id'&&all?.customer_id)return x.customer_id===all.customer_id;
   if(k==='customer_contracts'&&id==='site_id'){
    if(!siteMatchesPackage(x,all?.package_id))return false;
    if(all?.campaign_id){
     const ids=s.data.campaign_sites.filter(link=>link.campaign_id===all.campaign_id).map(link=>link.site_id);
     return !ids.length||ids.includes(x.id);
    }
   }
   return true;
  });
  const note=k==='leases'&&id==='property_id'?'<small class="lease-roof-field-help">اختر السطح حسب القياس والمساحة والعدد؛ أو اضغط على بطاقته المفصّلة أدناه.</small>':'';
  return '<label class="field"><span>'+E(label)+(required?' *':'')+'</span><select name="'+id+'" '+req+
   (k==='leases'&&id==='property_id'&&!all?.landlord_id?' disabled':'')+
   '><option value="">'+(k==='leases'&&id==='property_id'?'— اختر السطح الصحيح مع قياساته —':'— اختر —')+'</option>'+
   rows.map(x=>'<option value="'+E(x.id)+'" '+(val===x.id?'selected':'')+'>'+E(optionText(table,x))+'</option>').join('')+'</select>'+note+'</label>';
 }
 if(type==='select')return '<label class="field"><span>'+E(label)+'</span><select name="'+id+'" '+req+'>'+opts.map(x=>'<option value="'+x+'" '+(String(val)===String(x)?'selected':'')+'>'+E((k==='company_expenses'?EXPENSE_CATEGORY_LABELS[x]:null)||labels[x]||x)+'</option>').join('')+'</select></label>';
 let monetary=['price','rent_total','amount','paid_amount','initial_payment_amount'].includes(id);
 let extra=type==='number'?'min="0" step="'+(['months','default_months','quantity','grace_days'].includes(id)?'1':'0.01')+'"':type==='tel'?'inputmode="numeric" pattern="[0-9]{11}" maxlength="11"':id==='national_id'?'inputmode="numeric" pattern="[0-9]{12}" maxlength="12"':'';
 return '<label class="field"><span>'+E(label)+(required?' *':'')+'</span><input name="'+id+'" type="'+type+'" '+req+' '+extra+' value="'+E(val)+'">'+(monetary?'<small class="conversion-hint" data-money-hint="'+id+'">'+E(moneyHint(val,fieldCurrency(k,v)))+'</small>':'')+'</label>';
}
function selectedSiteCards(v){
 const selected=s.modal?.siteIds||[];
 const pkg=lookup('packages',v.package_id);
 if(!pkg)return '<div class="notice full">اختَر نوع الإعلان / الباقة A–E أولاً حتى تظهر القطع التابعة إلها فقط.</div>';
 const matches=s.data.ad_sites.filter(x=>siteMatchesPackage(x,pkg.id));
 const rows=matches.filter(x=>(x.active!==false||selected.includes(x.id))&&!campaignSiteConflict(x.id,v));
 const reservedCount=matches.filter(x=>campaignSiteConflict(x.id,v)).length;
 const conflicts=reservedCampaignChoices(v,selected);
 const mismatch=selected.filter(id=>!siteMatchesPackage(lookup('ad_sites',id),pkg.id));
 const notice=(mismatch.length?'<div class="notice full">توجد '+mismatch.length+' قطع مرتبطة سابقاً بالحملة من باقة مختلفة. غيّر الباقة أو صحّح تصنيف القطع قبل الحفظ.</div>':'')+
  (conflicts.length?'<div class="notice full">'+E(reservedCampaignMessage(conflicts))+' — غيّر مدة الحملة أو اختر قطعاً غير محجوزة.</div>':'');
 const bookingHint=reservedCount?'<small>'+reservedCount+' قطعة محجوزة خلال فترة الحملة المحددة، لذلك مخفية من الاختيار.</small>':'';
 if(!rows.length)return notice+'<div class="notice full">لا توجد قطع متاحة للباقة <b>'+E(pkg.code)+'</b> خلال الفترة المختارة. '+(reservedCount?'غيّر تاريخ البداية أو المدة للحصول على قطع متاحة.':'أضف قطعاً من قسم المواقع الإعلانية أو أدخل موقعاً إضافياً.')+'</div>';
 return notice+'<div class="full"><strong>القطع المتاحة للباقة '+E(pkg.code)+'</strong><p class="subtle">'+rows.length+' قطعة متاحة من نوع '+E(pkg.name)+' — المحجوزة بحملات متداخلة لا تظهر هنا. '+bookingHint+'</p><div class="site-picker">'+rows.map(x=>'<label class="site-option"><input type="checkbox" data-site-id="'+E(x.id)+'" '+(selected.includes(x.id)?'checked':'')+'><span><b>'+E(x.code)+' — '+E(x.name)+'</b><small>'+E(labels[x.site_type]||x.site_type)+' · '+E(x.governorate)+' · '+E(x.address)+(x.active===false?' · غير متاحة حالياً':'')+(x.rooftop_property_id?' · '+E(nameOf('properties',x.rooftop_property_id)):'')+(pkg.pricing_mode==='sqm_month'?' · '+(rooftopSiteArea(x)>0?E(fmt(rooftopSiteArea(x)))+' م²':'السطح بلا قياس مسجّل'):'')+'</small></span></label>').join('')+'</div></div>';
}

function relatedDetails(k,v){
 if(!v?.id)return '';
 const list=(label,rows,table,title)=>rows.length?'<div class="related-group"><strong>'+E(label)+' <span class="pill">'+rows.length+'</span></strong>'+rows.map(x=>'<div class="related-item"><span>'+E(title(x))+'</span><button type="button" class="linkbtn" data-edit="'+table+':'+x.id+'">فتح</button></div>').join('')+'</div>':'';
 let parts='';
 if(k==='customers'){
  parts+=list('حملات هذا العميل',s.data.campaigns.filter(x=>x.customer_id===v.id),'campaigns',x=>x.title+' — '+displayMoneyText(x.price,x.currency));
  parts+=list('عقود هذا الزبون',s.data.customer_contracts.filter(x=>x.customer_id===v.id),'customer_contracts',x=>x.contract_number+' — '+(labels[x.contract_type]||x.contract_type));
  parts+='<div class="inline"><button type="button" class="btn secondary mini" data-new-linked="campaigns|customer_id|'+v.id+'">+ إنشاء حملة واختيار نوع الإعلان</button><button type="button" class="btn secondary mini" data-new-linked="customer_contracts|customer_id|'+v.id+'">+ عقد زبون</button>'+(s.staff?.role==='admin'?'<button type="button" class="btn danger mini" data-delete-customer="'+E(v.id)+'">'+uiIcon('trash',16)+' حذف الزبون وجميع سجلاته</button>':'')+'</div>';
 }
 if(k==='landlords'){
  if(s.staff?.role==='admin')parts+='<div class="inline"><button class="btn danger mini" type="button" data-delete-landlord="'+E(v.id)+'">'+uiIcon('trash',16)+' حذف المالك وكل سجلاته</button></div>';
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
  parts+=list('حملات الباقة',s.data.campaigns.filter(x=>x.package_id===v.id),'campaigns',x=>x.title);
  parts+=list('عقود الزبائن على الباقة',s.data.customer_contracts.filter(x=>x.package_id===v.id),'customer_contracts',x=>x.contract_number);
  parts+='<button type="button" class="btn secondary mini" data-new-linked="campaigns|package_id|'+v.id+'">+ إنشاء حملة بهذه الباقة</button>';
 }
 if(k==='ad_sites')parts+=list('حملات هذا الموقع',s.data.campaign_sites.filter(x=>x.site_id===v.id).map(x=>lookup('campaigns',x.campaign_id)).filter(Boolean),'campaigns',x=>x.title);
 if(k==='campaigns'){
  parts+=list('عقود الزبائن التابعة للحملة',s.data.customer_contracts.filter(x=>x.campaign_id===v.id),'customer_contracts',x=>x.contract_number);
  parts+=list('دفعات الحملة',s.data.campaign_payments.filter(x=>x.campaign_id===v.id),'campaign_payments',x=>x.paid_at+' — '+displayMoneyText(x.amount,v.currency));
  parts+='<div class="notice">المدفوع: '+E(money(campaignPaid(v.id),v.currency))+' · المتبقي: '+E(money(campaignBalance(v),v.currency))+'</div>';
  parts+='<div class="inline"><button type="button" class="btn secondary mini" data-new-linked="campaign_payments|campaign_id|'+v.id+'">+ تسجيل دفعة للحملة</button><button type="button" class="btn secondary mini" data-new-linked="customer_contracts|campaign_id|'+v.id+'">+ إنشاء عقد زبون لهذه الحملة</button></div>';
 }
 if(k==='customer_contracts'){
   parts+='<div class="notice">هذا عقد بين الشركة والزبون، وليس عقد استئجار السطح من مالك البناية.</div>';
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

function updateSiteCodeInput(form){
 const number=form?.elements.namedItem('site_number'),code=form?.elements.namedItem('code');
 if(!number||!code)return;
 const digits=String(number.value||'')
  .replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x0660))
  .replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x06f0))
  .replace(/[^0-9]/g,'').replace(/^0+(?=\d)/,'');
 number.value=digits;
 const packageId=form.elements.namedItem('package_id')?.value;
 const prefix=String(lookup('packages',packageId)?.code||'').trim().toUpperCase();
 code.value=siteCodeForPackage(digits,packageId);
 const label=form.querySelector('[data-site-code-prefix]');
 if(label)label.textContent=/^[A-E]$/.test(prefix)?prefix+'-':'اختر الفئة';
 const hint=form.querySelector('[data-site-code-example]');
 if(hint)hint.textContent=code.value?'الرمز النهائي: '+code.value:'اختر الفئة واكتب رقم القطعة، مثلاً A-1';
}


function leasePlanControls(v){
 if(s.modal?.table!=='leases')return '';
 if(v.id){
  const locked=s.data.lease_installments.filter(r=>r.lease_id===v.id&&Number(r.paid_amount||0)>0).sort((a,b)=>a.due_date.localeCompare(b.due_date));
  const open=s.modal.leaseDraft||[];
  const rows=[...locked.map(r=>({...r,locked:true})),...open.map((r,draftIndex)=>({...r,locked:false,draftIndex}))].sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)));
  const paidScheduled=locked.reduce((n,r)=>n+Number(r.amount||0),0);
  const remaining=roundAmount(Number(v.rent_total||0)-Number(v.advance_amount||0)-paidScheduled);
  const current=open.reduce((n,r)=>n+Number(r.amount||0),0);
  return '<section class="lease-custom-plan full"><h3>تعديل جدول الأقساط مع العقد</h3>'+
   '<p class="subtle">تگدر تعدّل تواريخ ومبالغ الأقساط غير المدفوعة وتضيف أو تحذف أقساطاً. الأقساط المسدّدة جزئياً أو كلياً تبقى ثابتة ومحمية. تحفظ كل تغييرات العقد والأقساط معاً.</p>'+
   '<div class="notice">المتبقي المطلوب توزيعه على الأقساط المفتوحة: <b>'+E(money(remaining,v.currency))+
    '</b> · المجموع الحالي: <b>'+E(money(current,v.currency))+'</b></div>'+
   '<div class="lease-custom-rows">'+rows.map((r,i)=>'<div class="lease-custom-row"'+(r.locked?'':' data-lease-draft-row data-lease-saved-id="'+E(r.id||'')+'"')+'>'+
    '<b>القسط '+serial4(i+1)+'</b>'+
    '<label class="field"><span>تاريخ الاستحقاق</span><input type="date" '+(r.locked?'':'data-lease-due ')+'data-lease-saved-due="'+E(r.id||'')+'" value="'+E(r.due_date||'')+'"'+(r.locked?' disabled':'')+'></label>'+
    '<label class="field"><span>مبلغ القسط</span><input type="number" '+(r.locked?'':'data-lease-amount ')+'min="0.01" step="0.01" value="'+E(r.amount||'')+'"'+(r.locked?' disabled':'')+'></label>'+
    (r.locked?'<small>محمي — تم تسجيل تسديد</small>':
     '<button class="linkbtn" type="button" data-lease-remove-row="'+r.draftIndex+'" aria-label="حذف القسط غير المسدد">'+uiIcon('trash',15)+'</button>')+
    '</div>').join('')+'</div>'+
   '<div class="lease-custom-footer"><button class="btn secondary mini" type="button" data-lease-add-row>'+uiIcon('plus',15)+' إضافة قسط</button>'+
   '<button class="btn secondary mini" type="button" data-lease-spread>توزيع المبلغ على الأقساط المفتوحة</button>'+
   '<small>بعد تعديل مبلغ الإيجار أو المقدم، اضغط توزيع المبلغ أو عدّل الأقساط يدوياً ثم احفظ العقد.</small></div></section>';
 }
 const manual=s.modal.leasePlanMode==='manual';
 const plan=manual?s.modal.leaseDraft||[]:leaseInstallmentPlan(v);
 const remaining=Math.max(0,roundAmount(Number(v.rent_total||0)-Number(v.advance_amount||0)));
 const sum=plan.reduce((n,r)=>n+Number(r.amount||0),0);
 return '<section class="lease-custom-plan full"><div class="lease-custom-head"><div><h3>مواعيد الأقساط قبل حفظ العقد</h3>'+
   '<p class="subtle">اختَر حساب تلقائي أو حدّد تاريخ وقيمة كل قسط بنفسك.</p></div>'+
   '<div class="lease-plan-mode"><button type="button" class="btn mini '+(manual?'secondary':'')+
    '" data-lease-mode="auto">تلقائي</button><button type="button" class="btn mini '+(manual?'':'secondary')+
    '" data-lease-mode="manual">تحديد يدوي</button></div></div>'+
   '<p class="lease-custom-balance">المتبقي بعد المقدم: <strong>'+E(money(remaining,v.currency))+'</strong>'+
   (manual?' • مجموع الأقساط: <strong>'+E(money(sum,v.currency))+'</strong>':'')+'</p>'+
   '<div class="lease-custom-rows">'+plan.map((r,i)=>'<div class="lease-custom-row"'+(manual?' data-lease-draft-row':'')+'>'+
    '<b>القسط '+serial4(i+1)+'</b><label class="field"><span>تاريخ الاستحقاق</span>'+
    (manual?'<input type="date" data-lease-due value="'+E(r.due_date||'')+'">':
     '<strong>'+E(r.due_date||'—')+'</strong>')+'</label>'+
    '<label class="field"><span>المبلغ</span>'+
    (manual?'<input type="number" data-lease-amount min=".01" step=".01" value="'+E(r.amount??'')+'">':
     '<strong>'+E(money(r.amount,v.currency))+'</strong>')+'</label>'+
    (manual?'<button type="button" class="linkbtn" data-lease-remove-row="'+i+'" aria-label="حذف القسط">'+uiIcon('trash',15)+'</button>':'')+
    '</div>').join('')+'</div>'+
   (manual?'<div class="lease-custom-footer"><button type="button" class="btn secondary mini" data-lease-add-row>'+
    uiIcon('plus',15)+' إضافة قسط</button><small>يجب أن يساوي مجموع الأقساط المتبقي بعد المقدم حتى ينحفظ العقد.</small></div>':
    '<p class="subtle">اضغط «تحديد يدوي» حتى تختار المواعيد والمبالغ المتفق عليها مع المالك.</p>')+'</section>';
}
async function saveLeaseDueDate(id,form){
 if(s.leaseSavingDue)return;
 const row=lookup('lease_installments',id),lease=s.modal?.table==='leases'?s.modal.data:null;
 if(!row||!lease?.id||row.lease_id!==lease.id)return toast('القسط غير مرتبط بالعقد.',true);
 if(Number(row.paid_amount||0)>0)return toast('لا يمكن تغيير موعد قسط مسدّد جزئياً أو كلياً.',true);
 const date=form?.querySelector?.('[data-lease-saved-due="'+id+'"]')?.value||'';
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z')))return toast('اختر موعداً صحيحاً.',true);
 if(date===row.due_date)return toast('الموعد مسجّل بالفعل.');
 s.leaseSavingDue=true;
 try{
  if(s.demo)await persist('lease_installments',{due_date:date},id);
  else{
   const {data,error}=await s.client.from('lease_installments').update({due_date:date}).eq('id',id)
    .eq('lease_id',lease.id).eq('paid_amount',0).select('id,due_date').single();
   if(error||!data)throw Error(error?.message||'تعذر تأكيد التحديث.');
  }
  if(s.demo)render();else await load();
  toast('تم حفظ الموعد الجديد في دفعات إيجار الأسطح.');
 }catch(e){toast(e.message||String(e),true)}
 finally{s.leaseSavingDue=false}
}
function leasePlanSummary(v){
 if(v.id){
  const saved=s.data.lease_installments.filter(x=>x.lease_id===v.id);
  const locked=saved.filter(x=>Number(x.paid_amount||0)>0);
  const paid=locked.reduce((n,x)=>n+Number(x.amount||0),0);
  const open=s.modal?.table==='leases'?s.modal.leaseDraft||[]:saved.filter(x=>!Number(x.paid_amount||0));
  const due=roundAmount(Number(v.rent_total||0)-Number(v.advance_amount||0)-paid);
  const planned=roundAmount(open.reduce((n,x)=>n+Number(x.amount||0),0));
  return '<div class="lease-plan-preview full"><strong>ملخّص تعديل أقساط عقد السطح</strong>'+
   '<div class="lease-plan-values"><span>الإيجار الجديد: <b>'+E(money(v.rent_total,v.currency))+'</b></span>'+
   '<span>المقدم: <b>'+E(money(v.advance_amount,v.currency))+'</b></span>'+
   '<span>الأقساط المدفوعة (محميّة): <b>'+E(money(paid,v.currency))+'</b></span>'+
   '<span>المتبقي لتوزيعه: <b>'+E(money(due,v.currency))+'</b></span>'+
   '<span>الأقساط غير المدفوعة: <b>'+E(money(planned,v.currency))+'</b></span>'+
   '<span>عدد الأقساط: <b>'+E(open.length+locked.length)+'</b></span></div></div>';
 }
 if(!v.start_date||!v.end_date)return '<div class="lease-plan-preview full"><strong>جدول الأقساط المتوقع</strong><small>حدد تاريخ بداية ونهاية العقد حتى تظهر الأقساط بدقة قبل الحفظ.</small></div>';
 const rows=s.modal?.table==='leases'&&s.modal.leasePlanMode==='manual'&&!v.id?
  (s.modal.leaseDraft||[]).map(r=>({due_date:r.due_date,amount:Number(r.amount)||0})):leaseInstallmentPlan(v);
 const upfront=leaseAdvance(v),total=Number(v.rent_total||0);
 const currency=v.currency||'USD';
 const pieces=rows.length;
 return '<div class="lease-plan-preview full"><strong>معاينة جدول دفع الإيجار</strong>'+
  '<div class="lease-plan-values">'+
  '<span>الإيجار المتفق عليه: <b>'+E(money(total,currency))+'</b></span>'+
  '<span>المقدم المدفوع: <b>'+E(money(upfront,currency))+'</b></span>'+
  '<span>المتبقي للأقساط: <b>'+E(money(Math.max(0,total-upfront),currency))+'</b></span>'+
  '<span>عدد الأقساط: <b>'+pieces+'</b></span></div>'+
  '<div class="lease-plan-dates">'+(rows.length?rows.map((r,i)=>'<span>القسط '+serial4(i+1)+' · '+E(r.due_date)+' · '+E(money(r.amount,currency))+'</span>').join(''):
  '<span>لا توجد أقساط متبقية إذا كان المقدم يساوي كامل الإيجار.</span>')+'</div>'+
  '<small>السنة الواحدة: سنوي = قسط واحد، ونصف سنوي = قسطين. المقدم لا ينشئ قسطاً ثالثاً.</small></div>';
}


function expenseOptionList(options,value,allowEmpty=true){
 const current=String(value??'');
 let html=allowEmpty?'<option value="">— يرجى الاختيار —</option>':'';
 html+=options.map(([code,label])=>'<option value="'+E(code)+'"'+(current===code?' selected':'')+'>'+E(label)+'</option>').join('');
 if(current&&!options.some(([code])=>code===current))
  html+='<option value="'+E(current)+'" selected>قيمة مسجّلة سابقاً: '+E(current)+'</option>';
 return html;
}
function expenseInvoiceForm(v){
 const editing=Boolean(v?.id),items=s.modal.expenseItems||expenseLineItems(v);
 const status=v.status||expensePaymentStatus(v),currency=v.currency||s.displayCurrency;
 const departmentOptions=EXPENSE_DEPARTMENTS;
 const categoryOptions=EXPENSE_CATEGORY_OPTIONS.map(id=>[id,EXPENSE_CATEGORY_LABELS[id]]);
 const employeeOptions=(s.data.employees?.length?
   s.data.employees.filter(row=>row.active||row.name===v.paid_by)
    .map(row=>[row.name,row.name+' — '+(row.job_title||'موظف')]):
   EXPENSE_EMPLOYEES.map(([name,role])=>[name,name+' — '+role]));
 const payrollOptions=(s.data.employees||[]).filter(row=>row.active||row.id===v.employee_id)
   .map(row=>[row.id,row.name+' — '+(row.job_title||'موظف')]);
 const hasSalaryItem=items.some(item=>item.category==='salaries');
 const line=(item,index)=>'<article class="expense-line" data-expense-item>'+
  '<div class="expense-line-heading"><strong>الصنف '+serial4(index+1)+'</strong>'+
  (items.length>1?'<button type="button" class="expense-remove-line" data-expense-remove="'+index+'" title="حذف الصنف">'+uiIcon('trash',15)+' حذف الصنف</button>':'')+
  '</div><div class="expense-line-fields">'+
  '<label class="field expense-line-description"><span>المنتج / بيان الخدمة *</span>'+
   '<input type="text" data-expense-field="description" maxlength="200" required placeholder="مثال: ورق تصوير A4 أو اشتراك برنامج" value="'+E(item.description||'')+'"></label>'+
  '<label class="field"><span>التصنيف المحاسبي *</span><select required data-expense-field="category">'+
   expenseOptionList(categoryOptions,item.category)+'</select></label>'+
  '<label class="field"><span>القسم المستفيد *</span><select required data-expense-field="department">'+
   expenseOptionList(departmentOptions,item.department)+'</select></label>'+
  '<label class="field expense-line-number"><span>الكمية *</span><input type="number" data-expense-field="quantity" min="1" max="100000" step="1" required value="'+E(item.quantity??1)+'"></label>'+
  '<label class="field expense-line-number"><span>سعر الوحدة *</span><input type="number" data-expense-field="unit_price" min="0.01" step="0.01" required value="'+E(item.unit_price??'')+'"></label>'+
  '<div class="expense-line-subtotal"><span>إجمالي الصنف</span><strong data-expense-subtotal>'+E(money(expenseLineTotal(item),currency))+'</strong></div>'+
  '</div></article>';
 const originalImage=v.transfer_proof_path;
 return '<div class="overlay"><div class="modal expense-form-modal expense-invoice-modal">'+
  '<div class="modalhead"><div><h2>'+(editing?'تعديل الفاتورة':'تسجيل فاتورة مصروفات')+'</h2>'+
  '<p class="subtle">يمكن إدراج عدة أصناف ضمن فاتورة واحدة، مع تحديد المستفيد والتصنيف لكل صنف.</p></div>'+
  '<button type="button" class="close" data-action="close">'+uiIcon('x',19)+'</button></div>'+
  '<form id="recordForm" class="expense-invoice-form">'+
  '<p class="error expense-form-error" id="expenseFormError" role="alert" hidden></p>'+
  '<section class="expense-invoice-section"><div class="expense-invoice-section-title"><strong>بيانات الفاتورة</strong><span>01</span></div>'+
  '<div class="expense-invoice-grid">'+
   '<label class="field"><span>تاريخ الفاتورة *</span><input name="expense_date" type="date" required value="'+E(v.expense_date||today())+'"></label>'+
   '<label class="field"><span>رقم الفاتورة / الوصل (اختياري)</span><input name="receipt_number" maxlength="80" placeholder="وفقاً للرقم المطبوع على الوصل" value="'+E(v.receipt_number||'')+'"></label>'+
   '<label class="field"><span>الموظف المسؤول عن صرف الفاتورة *</span><select name="paid_by" required>'+expenseOptionList(employeeOptions,v.paid_by)+'</select></label>'+
   '<label class="field" id="expenseSalaryEmployeeField"'+(hasSalaryItem?'':' hidden')+'><span>الموظف المستفيد من الراتب *</span>'+
    '<select name="employee_id"'+(hasSalaryItem?' required':' disabled')+'>'+expenseOptionList(payrollOptions,v.employee_id)+'</select>'+
    '<small class="subtle">يرتبط الراتب بسجل الموظف ويظهر في كشف رواتبه.</small></label>'+
   '<label class="field"><span>عملة الفاتورة *</span><select name="currency" required>'+expenseOptionList([['IQD','دينار عراقي (IQD)'],['USD','دولار أمريكي (USD)']],currency,false)+'</select></label>'+
   '<label class="field expense-full"><span>موضوع الفاتورة (اختياري)</span><input name="title" type="text" maxlength="200" placeholder="يُستكمل تلقائياً من بيانات الأصناف إذا تُرك فارغاً" value="'+E(v.title||'')+'"></label>'+
  '</div></section>'+
  '<section class="expense-invoice-section"><div class="expense-invoice-section-title"><strong>الأصناف والخدمات</strong><span>02</span></div>'+
   '<div class="expense-lines">'+items.map(line).join('')+'</div>'+
   '<div class="expense-add-row"><button type="button" class="btn secondary mini" data-expense-add>'+uiIcon('plus',16)+' إضافة صنف آخر</button>'+
   '<span>'+items.length+' '+(items.length===1?'صنف':'أصناف')+' ضمن الفاتورة</span></div>'+
  '</section>'+
  '<section class="expense-invoice-section"><div class="expense-invoice-section-title"><strong>تفاصيل السداد</strong><span>03</span></div>'+
   '<div class="expense-payment-box"><div><small>القيمة الإجمالية للفاتورة</small><strong id="expenseInvoiceTotal">'+E(money(expenseInvoiceTotal(items),currency))+'</strong></div>'+
   '<div><small>المبلغ المدفوع</small><strong id="expenseInvoicePaid">'+E(money(Number(v.paid_amount)||0,currency))+'</strong></div>'+
   '<div><small>الرصيد المتبقي</small><strong id="expenseInvoiceBalance">—</strong></div></div>'+
   '<input type="hidden" name="amount" value="'+E(expenseInvoiceTotal(items))+'">'+
   '<div class="expense-invoice-grid">'+
    '<label class="field"><span>حالة الدفع *</span><select name="expense_payment_status" required>'+
     expenseOptionList([['paid','مدفوعة بالكامل'],['partial','مدفوعة جزئياً'],['unpaid','غير مدفوعة']],status,false)+'</select></label>'+
    '<label class="field"><span>طريقة الدفع *</span><select name="payment_method" required>'+
     expenseOptionList([['cash','نقداً'],['mastercard','ماستر كارد / تحويل']],v.payment_method||'cash',false)+'</select></label>'+
    '<label class="field expense-full" id="expensePartialField"><span>المبلغ المدفوع فعلياً *</span>'+
     '<input name="paid_amount" type="number" min="0.01" step="0.01" placeholder="أدخل المبلغ الذي تم تسديده من الفاتورة" value="'+E(v.paid_amount??'')+'">'+
     '<small class="subtle">يُحتسب الرصيد المتبقي تلقائياً من إجمالي الفاتورة.</small></label>'+
    '<div class="expense-full expense-transfer-field" id="expenseTransferField">'+
     '<label class="field"><span>صورة تحويل الماستر كارد * (عند وجود مبلغ مدفوع)</span>'+
     '<input name="transfer_image" type="file" accept="image/png,image/jpeg,image/webp">'+
     '<small class="subtle">PNG أو JPG أو WebP، بحد أقصى 5 ميغابايت. المرفق خاص بموظفي الشركة.</small></label>'+
     '<div class="expense-transfer-info" id="expenseFileInfo">'+(s.modal.transferFile?'ملف محدد: '+E(s.modal.transferFile.name):originalImage?'صورة تحويل محفوظة ضمن المرفقات':'لم تُرفق صورة تحويل بعد')+'</div>'+
     (originalImage?'<button type="button" class="btn secondary mini" data-expense-proof="'+E(v.id)+'">'+uiIcon('image',15)+' عرض الصورة المحفوظة</button>':'')+
    '</div>'+
   '</div>'+
  '</section>'+
  '<section class="expense-invoice-section"><label class="field"><span>ملاحظات داخلية (اختياري)</span>'+
  '<textarea name="notes" rows="2" placeholder="معلومات إضافية تخص الفاتورة أو عملية السداد">'+E(v.notes||'')+'</textarea></label></section>'+
  '<div class="expense-save-actions"><button type="button" class="btn secondary" data-action="close">إلغاء</button>'+
  '<button type="submit" class="btn">'+uiIcon('save',16)+(editing?' حفظ تعديل الفاتورة':' اعتماد الفاتورة')+'</button></div>'+
  '</form></div></div>';
}
function expenseCurrentItems(form){
 return [...form.querySelectorAll('[data-expense-item]')].map(row=>{
  const get=name=>row.querySelector('[data-expense-field="'+name+'"]')?.value??'';
  return {description:get('description'),category:get('category'),department:get('department'),
   quantity:get('quantity'),unit_price:get('unit_price')};
 });
}
function captureExpenseDraft(form){
 if(!s.modal||s.modal.table!=='company_expenses'||!form)return;
 captureForm(form);
 s.modal.expenseItems=expenseCurrentItems(form);
 s.modal.data.status=form.elements.namedItem('expense_payment_status')?.value||'paid';
}
function updateExpenseInvoiceTotals(form){
 if(!form||s.modal?.table!=='company_expenses')return;
 const items=expenseCurrentItems(form),currency=form.elements.namedItem('currency')?.value||s.displayCurrency;
 const total=expenseInvoiceTotal(items);
 items.forEach((item,i)=>{
  const label=form.querySelectorAll('[data-expense-subtotal]')[i];
  if(label)label.textContent=money(expenseLineTotal(item),currency);
 });
 const status=form.elements.namedItem('expense_payment_status')?.value||'paid';
 const paidField=form.elements.namedItem('paid_amount');
 const paid=status==='paid'?total:status==='unpaid'?0:Number(paidField?.value||0);
 const due=Math.max(0,roundAmount(total-paid));
 const t=form.querySelector('#expenseInvoiceTotal'),p=form.querySelector('#expenseInvoicePaid'),
  b=form.querySelector('#expenseInvoiceBalance'),hidden=form.elements.namedItem('amount'),
  partial=form.querySelector('#expensePartialField'),transfer=form.querySelector('#expenseTransferField');
 if(t)t.textContent=money(total,currency);
 if(p)p.textContent=money(paid,currency);
 if(b)b.textContent=money(due,currency);
 if(hidden)hidden.value=String(total);
 if(partial)partial.hidden=status!=='partial';
 // Hidden numeric fields with min=0.01 still block native submission when
 // their value is 0. Disabling inactive fields removes them from validation.
 if(paidField){paidField.disabled=status!=='partial';paidField.required=status==='partial';}
 const isTransfer=form.elements.namedItem('payment_method')?.value==='mastercard';
 if(transfer)transfer.hidden=!isTransfer;
 const picture=form.elements.namedItem('transfer_image');
 if(picture){
  picture.disabled=!isTransfer;
  picture.required=isTransfer&&paid>0&&!s.modal.transferFile&&!s.modal.data.transfer_proof_path;
 }
}
function bindExpenseInvoiceForm(form){
 // Native browser invalid events do not bubble; capture to show which field
 // prevents the form submit event from firing.
 const clearIssue=()=>{
  const error=form.querySelector('#expenseFormError');
  if(error){error.hidden=true;error.textContent='';}
 };
 form.addEventListener('invalid',event=>{
  const field=event.target.closest('.field');
  const label=field?.querySelector('span')?.textContent?.replace(/\s*\*\s*$/,'').trim()||'أحد الحقول المطلوبة';
  const error=form.querySelector('#expenseFormError');
  if(error&&error.hidden){
   error.textContent='يرجى مراجعة حقل «'+label+'» وإدخال قيمة صحيحة قبل اعتماد الفاتورة.';
   error.hidden=false;
   toast(error.textContent,true);
  }
 },true);
 const salaryRecipient=form.elements.namedItem('employee_id');
 const toggleSalaryRecipient=()=>{
  const usesSalary=expenseCurrentItems(form).some(row=>row.category==='salaries');
  const holder=form.querySelector('#expenseSalaryEmployeeField');
  if(holder)holder.hidden=!usesSalary;
  if(salaryRecipient){salaryRecipient.disabled=!usesSalary;salaryRecipient.required=usesSalary;}
 };
 form.addEventListener('input',event=>{
  clearIssue();
  if(event.target.matches('[data-expense-field], [name="paid_amount"]'))updateExpenseInvoiceTotals(form);
 });
 form.addEventListener('change',event=>{
  clearIssue();
  if(event.target.matches('[name="expense_payment_status"], [name="payment_method"]'))updateExpenseInvoiceTotals(form);
  if(event.target.matches('[data-expense-field="category"]'))toggleSalaryRecipient();
 });
 const add=form.querySelector('[data-expense-add]');
 if(add)add.onclick=()=>{
  captureExpenseDraft(form);
  if(s.modal.expenseItems.length>=100)return toast('الحد الأقصى 100 صنف في الفاتورة الواحدة',true);
  s.modal.expenseItems.push({description:'',category:'',department:'',quantity:1,unit_price:''});
  render();
 };
 form.querySelectorAll('[data-expense-remove]').forEach(button=>button.onclick=()=>{
  captureExpenseDraft(form);
  if(s.modal.expenseItems.length<=1)return toast('يجب إبقاء صنف واحد على الأقل',true);
  s.modal.expenseItems.splice(Number(button.dataset.expenseRemove),1);
  render();
 });
 const file=form.elements.namedItem('transfer_image');
 if(file)file.onchange=()=>{
  const selected=file.files?.[0]||null;
  if(selected&&(!['image/png','image/jpeg','image/webp'].includes(selected.type)||
    selected.size>5242880||selected.size<=0)){
   toast('يُقبل مرفق PNG أو JPG أو WebP بحد أقصى 5 ميغابايت.',true);
   file.value='';return;
  }
  s.modal.transferFile=selected;
  const info=form.querySelector('#expenseFileInfo');
  if(info)info.textContent=selected?'الملف المحدد: '+selected.name:
   (s.modal.data.transfer_proof_path?'صورة تحويل محفوظة':'لم يتم إرفاق صورة التحويل');
  updateExpenseInvoiceTotals(form);
 };
 const currency=form.elements.namedItem('currency');
 if(currency)currency.onchange=()=>{
  const previous=s.modal.data.currency||s.displayCurrency,next=currency.value;
  captureExpenseDraft(form);
  if(previous!==next){
   s.modal.expenseItems=s.modal.expenseItems.map(item=>({...item,
    unit_price:item.unit_price===''?'':roundAmount(convert(item.unit_price,previous,next))}));
   if(s.modal.data.paid_amount!=='')
    s.modal.data.paid_amount=roundAmount(convert(s.modal.data.paid_amount||0,previous,next));
  }
  s.modal.data.currency=next;
  render();
 };
 toggleSalaryRecipient();
 updateExpenseInvoiceTotals(form);
}

function customerContractSnapshotFields(v){
 const ids=s.modal?.contractSiteIds||[];
 const sites=s.data.ad_sites.filter(site=>siteMatchesPackage(site,v.package_id)||ids.includes(site.id));
 const input=(name,label,type='text')=>'<label class="field"><span>'+label+'</span><input name="'+name+'" type="'+type+'"'+(type==='number'?' min="1" step="1"':'')+' value="'+E(v[name]??'')+'"></label>';
 return '<div class="full"><h3>البيانات الفنية والمواقع في العقد</h3></div>'+
 input('campaign_quantity_snapshot','عدد القطع المتفق عليها','number')+
 (lookup('packages',v.package_id)?.pricing_mode==='sqm_month'?'':'<label class="field"><span>عدد الأوجه</span><select name="ad_faces"><option value="1"'+(campaignFaces(v)===1?' selected':'')+'>وجه واحد</option><option value="2"'+(campaignFaces(v)===2?' selected':'')+'>وجهان</option></select></label>')+
 input('package_dimensions_snapshot','قياسات الإعلان المكتوبة بالعقد')+
 input('campaign_title_snapshot','اسم الحملة في العقد')+
 '<label class="field full"><span>المواصفات بالعقد</span><textarea name="package_specifications_snapshot">'+E(v.package_specifications_snapshot||'')+'</textarea></label>'+
 '<label class="field full"><span>مواقع إضافية متفق عليها</span><textarea name="campaign_locations_snapshot">'+E(v.campaign_locations_snapshot||'')+'</textarea></label>'+
 '<label class="field full"><span>ملاحظات الحملة بالعقد</span><textarea name="campaign_notes_snapshot">'+E(v.campaign_notes_snapshot||'')+'</textarea></label>'+
 '<section class="full"><h3>القطع المشمولة بهذا العقد</h3><p class="subtle">التعديل على العقد لا يغيّر مواقع الحملة الأصلية.</p><div class="site-picker">'+
 (sites.length?sites.map(site=>'<label class="site-option"><input type="checkbox" data-contract-site-id="'+E(site.id)+'"'+(ids.includes(site.id)?' checked':'')+'><span><b>'+E(site.code)+' — '+E(site.name)+'</b><small>'+E(site.address||'')+'</small></span></label>').join(''):
 '<span class="subtle">لا توجد قطع لهذه الباقة؛ اكتب المواقع في الحقل أعلاه.</span>')+'</div></section>';
}
function modalHtml(){
 if(s.modal?.kind==='reminderMessage')return reminderMessageDialog();
 if(s.modal?.kind==='customerPdfEditor')return customerPdfEditorHtml();
 if(s.modal?.kind==='landlordPdfEditor')return landlordPdfEditorHtml();
 if(s.modal?.kind==='staffRoleEditor')return staffRoleEditorHtml();
 if(s.modal?.kind==='payrollPayment')return payrollPaymentHtml();
 if(s.modal?.kind==='payrollReceiptReady')return payrollReceiptReadyHtml();
 let m=s.modal,k=m.table,v=m.data||{},meta=defs[k];if(m.kind==='preview')return k==='customer_contracts'?customerContractPreview(v):previewHtml(v);
 if(m.kind==='deleteCustomer')return customerDeleteDialog(v);
 if(m.kind==='deleteLandlord')return landlordDeleteDialog(v);
 if(m.kind==='deleteExpense')return expenseDeleteDialog(v);
 if(m.kind==='deleteSite')return deleteSiteDialog(v);
 if(m.kind==='deleteContract')return contractDeleteDialog();
 let fields=meta.fields;
 if(k==='company_expenses')return expenseInvoiceForm(v);
 if(k==='campaigns'){
  const steps=[['العميل والحملة',['customer_id','title','start_date']],['نوع الإعلان والمواقع',['package_id','locations','quantity']],['الأسعار والأشهر',['months','ad_faces','price','currency','next_payment_due_date']],['الدفعات والملاحظات',['notes']],['مراجعة وحفظ',[]]];
  const stepFields=s.formStep<4?fields.filter(x=>steps[s.formStep][1].includes(x[0])).map(f=>fieldHtml(f,v,v)).join('')+(s.formStep===2?packagePricingInfo(v):''):review(v);
  const client=lookup('customers',v.customer_id);
  const extra=s.formStep===0&&client?'<div class="notice full"><b>بيانات العميل:</b> '+E(client.name)+' · '+E(client.phone)+' · '+E(labels[client.status]||client.status)+'</div>':
   s.formStep===1?selectedSiteCards(v)+packagePricingInfo(v):
   s.formStep===3&&!v.id?'<label class="field"><span>الدفعة الأولى (اختياري، بنفس عملة الحملة)</span><input type="number" name="initial_payment_amount" min="0" step="0.01" value="'+E(v.initial_payment_amount??'')+'"><small class="conversion-hint" data-money-hint="initial_payment_amount">'+E(moneyHint(v.initial_payment_amount||0,v.currency))+'</small></label><label class="field"><span>تاريخ الدفعة</span><input type="date" name="initial_payment_date" value="'+E(v.initial_payment_date||today())+'"></label>':'';
  return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+(v.id?'تعديل':'إضافة')+' حملة إعلانية</h2><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div><div class="steps">'+steps.map((x,i)=>'<span class="step '+(s.formStep===i?'current':'')+'">'+(i+1)+'. '+x[0]+'</span>').join('')+'</div><form id="recordForm"><div class="formgrid">'+stepFields+extra+'</div><div class="actions">'+(s.formStep>0?'<button type="button" class="btn secondary" data-action="prevStep">السابق</button>':'')+'<button class="btn" type="submit">'+(s.formStep<4?'التالي':'حفظ الحملة')+'</button></div></form>'+relatedDetails('campaigns',v)+'</div></div>';
 }
 if(k==='campaign_payments'){
  const parent=lookup('campaigns',v.campaign_id);
  if(!parent)return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>دفعة حملة</h2><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div><div class="notice">اختر الحملة أولاً من صفحة دفعات الحملات.</div></div></div>';
  const paidOthers=s.data.campaign_payments.filter(payment=>payment.campaign_id===parent.id&&payment.id!==v.id)
   .reduce((sum,payment)=>sum+Number(payment.amount||0),0);
  const canPay=Math.max(0,roundAmount(Number(parent.price)-paidOthers));
  const editableFields=[
   ['entry_currency','عملة استلام الدفعة','select',true,['IQD','USD']],
   ['paid_at','تاريخ استلام الدفعة','date',true],
   ['amount','المبلغ المستلم','number',true],
   ['notes','ملاحظات على الدفعة','textarea']
  ];
  return '<div class="overlay"><div class="modal campaign-payment-modal"><div class="modalhead"><h2>'+(v.id?'تعديل دفعة مسجلة':'تسجيل دفعة للحملة')+'</h2><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div>'+
   '<div class="campaign-payment-modal-parent"><strong>'+E(parent.title)+'</strong><span>الزبون: '+E(nameOf('customers',parent.customer_id))+(v.id?' · رقم الوصل: '+E(receiptNumber(v)):'')+'</span></div>'+
   '<div class="campaign-payment-modal-balances">'+
   '<div><small>إجمالي الحملة</small><b>'+currencyAmount(parent.price,parent.currency)+'</b></div>'+
   '<div><small>المبلغ الواصل سابقاً'+(v.id?' باستثناء الدفعة الحالية':'')+'</small><b>'+currencyAmount(paidOthers,parent.currency)+'</b></div>'+
   '<div><small>المتاح لهذه الدفعة</small><b>'+currencyAmount(canPay,parent.currency)+'</b></div></div>'+
   '<form id="recordForm"><input type="hidden" name="campaign_id" value="'+E(parent.id)+'">'+
   '<div class="formgrid">'+editableFields.map(field=>fieldHtml(field,v,v)).join('')+'</div>'+
   '<div class="notice" id="paymentParentInfo"></div>'+
   '<div class="actions"><button class="btn" type="submit">'+(v.id?'حفظ تعديل الدفعة':'حفظ الدفعة وتحديث رصيد الحملة')+'</button></div></form>'+
   '<p class="subtle">تُحفظ الدفعة بعملة الحملة الأصلية، ويُحتسب المبلغ المقابل تلقائياً عند اختلاف عملة الاستلام.</p></div></div>';
 }
 if(k==='leases'){
  return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+(v.renewed_from?'تجديد العقد':v.id?'تعديل عقد '+E(numberedContract(v.contract_number)):'عقد إيجار جديد')+'</h2><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div><p class="subtle">تُسحب عقارات المالك تلقائياً. اختر الأقساط التلقائية أو حدد مواعيدها يدوياً، وبعد الحفظ اختر «مراجعة وطباعة العقد» لتعديل الشروط والتواقيع قبل إصدار PDF.</p><form id="recordForm"><div class="formgrid">'+fields.map(f=>fieldHtml(f,v,v)+(f[0]==='property_id'?leasePropertyPicker(v):'')).join('')+leasePlanSummary(v)+leasePlanControls(v)+'</div><div class="actions"><button class="btn" type="submit">'+(v.id?'حفظ التعديلات':'حفظ العقد وإنشاء الأقساط')+'</button></div></form>'+(v.id?'<section class="lease-form-tools"><div class="lease-form-tools-head"><strong>إجراءات العقد</strong><small>لحفظ البيانات اضغط «حفظ التعديلات» أعلاه. المراجعة والطباعة تُفتح في نافذة مستقلة.</small></div><div class="lease-row-actions lease-row-actions-modal">'+
 '<button type="button" class="lease-row-action" data-preview="'+E(v.id)+'">'+uiIcon('file',15)+' التفاصيل</button>'+
 '<button type="button" class="lease-row-action lease-row-action-primary" data-landlord-pdf="'+E(v.id)+'" data-pdf-mode="preview">'+uiIcon('printer',15)+' مراجعة وطباعة العقد</button>'+
 '<button type="button" class="lease-row-action" data-lease-payments="'+E(v.id)+'">'+uiIcon('receipt',15)+' الأقساط والدفعات</button>'+
 '<button type="button" class="lease-row-action" data-renew="'+E(v.id)+'">'+uiIcon('refresh',15)+' تجديد العقد</button>'+contractDeleteAction('leases',v)+
 '</div></section>':'')+relatedDetails(k,v)+'</div></div>';
 }

 if(k==='customer_contracts'){
  const legacy=Boolean(v.id&&!v.campaign_id);
  if(legacy){
   return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>عقد سابق — '+E(numberedContract(v.contract_number))+'</h2><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div><div class="notice">هذا عقد قديم غير مربوط بحملة. بياناته محفوظة مثل ما كانت؛ العقود الجديدة تُنشأ فقط من الحملات.</div><form id="recordForm"><div class="formgrid">'+fields.map(f=>fieldHtml(f,v,v)).join('')+'</div><div class="actions"><button class="btn" type="submit">حفظ تعديلات العقد السابق</button></div></form>'+customerContractEditTools(v)+relatedDetails(k,v)+'</div></div>';
  }
  const campaigns=s.data.campaigns.filter(cam=>!s.modal.contractCustomerFilter||cam.customer_id===s.modal.contractCustomerFilter||cam.id===v.campaign_id);
  const chosen=lookup('campaigns',v.campaign_id);
  const campaignSelect=v.id?
   '<div class="notice"><b>الحملة المعتمدة:</b> '+E(v.campaign_title_snapshot||chosen?.title||'—')+' · <b>رقم العقد:</b> '+E(numberedContract(v.contract_number))+'</div>':
   '<label class="field full"><span>اختَر الحملة التي تريد إنشاء عقد لها *</span><select name="campaign_id" required><option value="">— اختر حملة محفوظة —</option>'+
   campaigns.map(cam=>'<option value="'+E(cam.id)+'" '+(v.campaign_id===cam.id?'selected':'')+'>'+E(cam.title+' — '+nameOf('customers',cam.customer_id)+' — '+nameOf('packages',cam.package_id))+'</option>').join('')+
   '</select></label>';
  const fieldsToEdit=v.id?fields.filter(f=>f[0]!=='campaign_id'):fields.filter(f=>['company_representative','customer_representative','terms','notes'].includes(f[0]));
  return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+(v.id?'تفاصيل وتعديل عقد '+E(numberedContract(v.contract_number)):'إنشاء عقد من حملة إعلانية')+'</h2><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div>'+
   '<div class="notice">'+(v.id?'عدّل جميع بيانات العقد واحفظها على رقمه نفسه. الحملة الأصلية ودفعاتها لا تتأثر، والتغييرات تظهر عند إعادة طباعة PDF.':'تفاصيل العقد تنقل تلقائياً من الحملة عند إنشائه، ثم يمكن تعديلها لاحقاً.')+'</div>'+
   '<form id="recordForm"><div class="formgrid">'+(v.id?'<p class="subtle full">الحملة المرجعية الأصلية: '+E(chosen?.title||v.campaign_title_snapshot||'—')+' (لا تتغير عند تعديل العقد)</p>':campaignSelect+contractCampaignSummary(v))+
   '<div class="full"><h3>معلومات التوقيع والشروط</h3><p class="subtle">يمكن تعديل كل بيانات العقد ثم حفظها بشكل دائم. أصل الحملة لا يتغير.</p></div>'+
   fieldsToEdit.map(f=>fieldHtml(f,v,v)).join('')+
   (v.id?customerContractSnapshotFields(v):'')+
   '</div><div class="actions"><button class="btn" type="submit">'+(v.id?'حفظ جميع تعديلات العقد':'إنشاء العقد من الحملة')+'</button></div></form>'+
   (v.id?customerContractEditTools(v):'')+
   relatedDetails(k,v)+'</div></div>';
 }

 if(k==='lease_installments'){
  const lease=lookup('leases',v.lease_id);
  if(!lease)return '<div class="overlay"><div class="modal"><div class="notice">اختر قسطاً من جدول دفعات إيجار الأسطح أولاً.</div><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div></div>';
  const balance=Math.max(0,roundAmount(Number(v.amount)-Number(v.paid_amount)));
  return '<div class="overlay"><div class="modal lease-ledger-modal"><div class="modalhead"><h2>تسديد قسط إيجار السطح</h2><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div>'+
   '<div class="lease-ledger-modal-owner"><b>'+E(nameOf('landlords',lease.landlord_id))+'</b><small>'+E(nameOf('properties',lease.property_id))+
   ' · العقد '+E(numberedContract(lease.contract_number))+'</small></div>'+
   '<div class="lease-ledger-metrics">'+[
     ['قيمة القسط',v.amount],['المسدد سابقاً',v.paid_amount],['المتبقي',balance]
   ].map(([label,n])=>'<div><small>'+label+'</small><strong>'+currencyAmount(n,lease.currency)+'</strong></div>').join('')+'</div>'+
   '<form id="recordForm"><input type="hidden" name="lease_id" value="'+E(lease.id)+'">'+
   '<input type="hidden" name="due_date" value="'+E(v.due_date||'')+'">'+
   '<input type="hidden" name="amount" value="'+E(v.amount)+'">'+
   '<div class="formgrid">'+[
    ['entry_currency','عملة إدخال التسديد','select',true,['IQD','USD']],
    ['paid_amount','إجمالي المبلغ المسدد لهذا القسط حتى الآن','number',true],
    ['notes','ملاحظات الدفعة','textarea']
   ].map(field=>fieldHtml(field,v,v)).join('')+'</div>'+
   '<div class="notice" id="paymentParentInfo"></div>'+
   '<div class="actions"><button class="btn" type="submit">حفظ التسديد</button></div></form>'+
   '<p class="subtle">أدخل مجموع ما تم دفعه لهذا القسط حتى الآن، وليس إضافة مستقلة. لا يسمح النظام بتجاوز قيمة القسط.</p></div></div>';
 }
 if(k==='lease_installments'||k==='campaign_payments'){
  fields=[k==='lease_installments'?['lease_id','العقد','lookup:leases',true]:['campaign_id','الحملة','lookup:campaigns',true],['entry_currency','عملة إدخال المبلغ','select',true,['IQD','USD']],...(k==='lease_installments'?[['due_date','تاريخ الاستحقاق','date',true]]:[['paid_at','تاريخ الدفع','date',true]]),['amount',k==='lease_installments'?'قيمة القسط':'قيمة الدفعة','number',true],...(k==='lease_installments'?[['paid_amount','المبلغ المسدد','number',true]]:[]),['notes','الملاحظات','textarea']];
 }
 return '<div class="overlay"><div class="modal"><div class="modalhead"><h2>'+ (v.id?'تعديل':'إضافة')+' — '+meta.title+'</h2><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div><form id="recordForm"><div class="formgrid">'+fields.map(f=>fieldHtml(f,v,v)).join('')+'</div>'+(k==='packages'?packageRatesEditor():'')+(k==='landlords'?landlordRoofMarkup():'')+(k==='campaign_payments'||k==='lease_installments'?'<div class="notice" id="paymentParentInfo"></div>':'')+'<div class="actions"><button class="btn" type="submit">حفظ البيانات</button></div></form>'+(k==='landlords'&&v.card_image_path?'<button class="btn secondary mini" data-card="'+v.id+'">عرض صورة البطاقة المرفوعة</button>':'')+relatedDetails(k,v)+'</div></div>';
}

function review(v){
 let ids=s.modal?.siteIds||[],names=ids.map(id=>lookup('ad_sites',id)).filter(Boolean).map(x=>x.code+' — '+x.name).join('، ');
 return '<div class="summary full">'+[['العميل',nameOf('customers',v.customer_id)],['الحملة',v.title],['الباقة',nameOf('packages',v.package_id)],['المواقع المختارة',names||v.locations||'—'],['تاريخ البداية',v.start_date||'لم يُحدد'],['الأشهر',v.months],['عدد الأوجه',campaignFacesText(v)],...(lookup('packages',v.package_id)?.pricing_mode==='sqm_month'?[['المساحة المحسوبة من الأسطح',fmt(campaignSiteArea(ids))+' م²']]:[]),['السعر الأصلي',money(v.price,v.currency)],['ما يعادله',money(equivalent(v.price,v.currency),s.displayCurrency)],['الدفعة الأولى',money(v.initial_payment_amount||0,v.currency)],['الملاحظات',v.notes]].map(([a,b])=>'<div><small>'+E(a)+'</small><b>'+E(b||'—')+'</b></div>').join('')+'</div>';
}



// PDF data are taken from the saved customer contract snapshots and their
// originating campaign; company branding is supplied by the exact PDF template,
// NOT dynamically inserted from the settings page.
function landlordContractPdfPayload(v){
 if(!v?.id)throw Error('احفظ عقد المالك أولاً حتى تقدر تحمّل PDF الرسمي');
 const landlord=lookup('landlords',v.landlord_id),property=lookup('properties',v.property_id);
 const installments=s.data.lease_installments.filter(x=>x.lease_id===v.id)
  .sort((a,b)=>String(a.due_date||'').localeCompare(String(b.due_date||'')));
 const total=Number(v.rent_total||0),advance=leaseAdvance(v);
 const width=Number(property?.width_m||0),height=Number(property?.height_m||0);
 const area=Number(property?.area_m2||0)>0?Number(property.area_m2):
  width>0&&height>0?roundAmount(width*height):null;
 return {
  kind:'landlord',number:numberedContract(v.contract_number),
  landlordName:landlord?.name||'—',landlordPhone:landlord?.phone||'—',
  landlordAddress:[landlord?.governorate,landlord?.residential_address].filter(Boolean).join('، ')||'—',
  governorate:landlord?.governorate||'—',
  companyRepresentative:v.company_representative||'—',
  landlordRepresentative:v.landlord_representative||'—',
  companyPhones:'07766663304 - 07866663304',
  firstSignatureLabel:'الطرف الأول — المؤجر (مالك السطح)',
  firstSignatureName:v.landlord_representative||landlord?.name||'—',
  firstSignatureDate:v.start_date||'',
  secondSignatureLabel:'المدير المفوض — شركة رأفت (الطرف الثاني)',
  secondSignatureName:v.company_representative||'—',
  secondSignatureDate:v.start_date||'',
  extraTerms:'',
  propertyName:property?.title||'—',
  dimensions:width>0&&height>0?fmt(width)+' × '+fmt(height)+' م':property?.dimensions||'—',
  area:area==null?'—':fmt(area),quantity:Number(property?.quantity)||1,
  startDate:v.start_date||'—',endDate:v.end_date||'—',
  paymentFrequency:labels[v.payment_frequency]||v.payment_frequency||'—',
  graceDays:Number(v.grace_days)||0,rentTotal:total,
  advanceAmount:advance,remainingAfterAdvance:roundAmount(Math.max(0,total-advance)),
  currency:v.currency||'IQD',
  installments:installments.map(x=>({dueDate:x.due_date,amount:Number(x.amount||0)})),
  notes:v.notes||''
 };
}
async function generateLandlordContractPdf(id,mode='download',editablePayload=null){
 const lease=lookup('leases',id);
 if(!lease){toast('عقد المالك غير موجود أو لم يتم حفظه',true);return}
 const generator=typeof window!=='undefined'?window.RaafatContractPdf:null;
 if(!generator){toast('مكوّن PDF لم يكتمل تحميله. حدّث الصفحة وأعد المحاولة',true);return}
 if(s.generatingContractPdf)return toast('إنشاء ملف PDF جارٍ بالفعل');
 const win=mode==='preview'&&typeof window!=='undefined'?window.open('','_blank'):null;
 if(win){win.document.title='جارٍ إعداد عقد إيجار السطح';win.document.body.textContent='جارٍ تجهيز قالب رأفت الأصلي...'}
 s.generatingContractPdf=true;
 document.querySelectorAll('[data-landlord-pdf]').forEach(button=>{button.disabled=true});
 try{
  const payload=editablePayload||landlordContractPdfPayload(lease);
  if(mode==='preview')await generator.preview(payload,win);
  else await generator.download(payload);
  toast(mode==='preview'?'تم إعداد معاينة عقد المالك بالقالب الأصلي':'تم تحميل عقد إيجار السطح بقالب رأفت');
 }catch(error){
  if(win&&!win.closed)win.close();
  toast('تعذّر توليد عقد المالك PDF: '+(error?.message||String(error)),true);
 }finally{
  s.generatingContractPdf=false;
  document.querySelectorAll('[data-landlord-pdf]').forEach(button=>{button.disabled=false});
 }
}

function customerContractPdfPayload(v){
 if(!v?.id)throw Error('احفظ عقد الزبون أولاً حتى تنزّل ملف PDF الرسمي');
 const customer=lookup('customers',v.customer_id);
 const pkg=lookup('packages',v.package_id);
 const campaign=lookup('campaigns',v.campaign_id);
 const site=lookup('ad_sites',v.site_id);
 const details=contractCampaignDetails(v);
 const dimension=v.package_dimensions_snapshot||
  (pkg?.width_m&&pkg?.height_m?fmt(pkg.width_m)+' × '+fmt(pkg.height_m)+' م':'—');
 const effectiveArea=Number(v.rented_area_m2)>0?fmt(v.rented_area_m2):
  Number(v.package_area_snapshot)>0?fmt(v.package_area_snapshot):
  Number(pkg?.area_m2)>0?fmt(pkg.area_m2):'—';
 const sites=details.sites.length?details.sites:
  site?[{id:site.id,code:site.code,name:site.name,address:site.address,governorate:site.governorate}]:[];
 return {
  number:numberedContract(v.contract_number),
  customerName:v.customer_name_snapshot||customer?.name||'—',
  customerPhone:customer?.phone||'—',
  companyPhones:'07766663304 - 07866663304',
  companyRepresentative:v.company_representative||'—',
  customerRepresentative:v.customer_representative||'—',
  campaignTitle:v.campaign_title_snapshot||campaign?.title||'—',
  packageName:v.package_name_snapshot||pkg?.name||'—',
  dimensions:dimension,
  area:effectiveArea,
  quantity:details.total||1,
  months:Number(v.duration_months)||0,
  adFaces:campaignFaces(v,pkg),
  startDate:v.start_date,
  endDate:v.end_date,
  amount:Number(v.amount)||0,
  currency:v.currency||'USD',
  specifications:v.package_specifications_snapshot||pkg?.specifications||'',
  sites:sites.map(x=>({code:x.code||'',name:x.name||'',address:x.address||'',governorate:x.governorate||''})),
  additionalLocations:details.locations,
  campaignNotes:details.notes,
  terms:v.terms||'',
  extraTerms:v.terms||'',
  notes:v.notes||'',
  firstSignatureLabel:'المدير المفوض — شركة رأفت (الطرف الأول)',
  firstSignatureName:v.company_representative||'—',
  firstSignatureDate:v.start_date,
  secondSignatureLabel:'الطرف الثاني — الزبون',
  secondSignatureName:v.customer_representative||v.customer_name_snapshot||customer?.name||'—',
  secondSignatureDate:v.start_date
 };
}
async function generateCustomerContractPdf(id,mode='download',editablePayload=null){
 const contract=lookup('customer_contracts',id);
 if(!contract){toast('العقد غير موجود أو لم يتم حفظه',true);return}
 const generator=typeof window!=='undefined'?window.RaafatContractPdf:null;
 if(!generator){toast('مكوّن إنشاء PDF لم يكتمل تحميله. حدّث الصفحة وأعد المحاولة',true);return}
 if(s.generatingContractPdf)return toast('إنشاء ملف العقد جارٍ بالفعل');
 const win=mode==='preview'&&typeof window!=='undefined'?
  window.open('','_blank'):null;
 if(win){win.document.title='جارٍ إعداد عقد رأفت';win.document.body.textContent='جارٍ إعداد ملف PDF بالقالب الأصلي...'}
 s.generatingContractPdf=true;
 document.querySelectorAll('[data-customer-pdf]').forEach(button=>{button.disabled=true});
 try{
  const payload=editablePayload||customerContractPdfPayload(contract);
  if(mode==='preview')await generator.preview(payload,win);
  else await generator.download(payload);
  toast(mode==='preview'?'تم إنشاء معاينة PDF باستخدام القالب الأصلي':'تم تنزيل عقد الزبون بالقالب الرسمي الأصلي');
 }catch(e){
  if(win&&!win.closed)win.close();
  toast('تعذّر إعداد PDF: '+(e?.message||String(e)),true);
 }finally{
  s.generatingContractPdf=false;
  document.querySelectorAll('[data-customer-pdf]').forEach(button=>{button.disabled=false});
 }
}



function openLandlordPdfEditor(id,preferredMode='preview'){
 const lease=lookup('leases',id);
 if(!lease)return toast('عقد إيجار السطح غير موجود أو لم يُحفظ.',true);
 const generator=typeof window!=='undefined'?window.RaafatContractPdf:null;
 if(typeof generator?.defaultLandlordClauses!=='function')
  return toast('مكوّن شروط الإيجار لم يكتمل تحميله. حدّث الصفحة وحاول مجدداً.',true);
 const payload=landlordContractPdfPayload(lease);
 payload.clauses=generator.defaultLandlordClauses(payload).map((clause,index)=>({...clause,number:String(index+1)}));
 payload._autoLandlordClauses=payload.clauses.map(item=>item.text);
 s.modal={kind:'landlordPdfEditor',table:'leases',data:lease,
  printDraft:payload,preferredMode};
 render();
}
function landlordPrintField(payload,[name,title,type='text']){
 const value=payload[name]??'';
 let input;
 if(type==='textarea')
  input='<textarea name="'+E(name)+'" rows="2">'+E(value)+'</textarea>';
 else if(type==='currency')
  input='<select name="'+E(name)+'">'+[['IQD','دينار عراقي (IQD)'],['USD','دولار أمريكي (USD)']]
   .map(([code,label])=>'<option value="'+code+'"'+(value===code?' selected':'')+'>'+label+'</option>').join('')+'</select>';
 else input='<input name="'+E(name)+'" type="'+E(type)+'" '+(type==='number'?'min="0" step="any" ':'')+
  'value="'+E(value)+'">';
 return '<label class="field '+(type==='textarea'?'full':'')+'"><span>'+E(title)+'</span>'+input+'</label>';
}
function landlordPdfEditorHtml(){
 const m=s.modal,v=m.printDraft,field=tuple=>landlordPrintField(v,tuple);
 const clauses=(v.clauses||[]).map((clause,index)=>
  '<div class="customer-print-clause" data-print-clause="'+index+'"><b>'+(index+1)+'.</b>'+
  '<textarea rows="2" aria-label="نص الشرط '+(index+1)+'">'+E(clause.text||'')+'</textarea>'+
  '<button type="button" class="linkbtn customer-print-clause-remove" data-print-clause-remove="'+index+
  '" aria-label="حذف الشرط '+(index+1)+'">'+uiIcon('trash',14)+'</button></div>').join('');
 const installments=(v.installments||[]).map((item,index)=>
  '<div class="landlord-print-installment" data-print-installment>'+
   '<strong>القسط '+serial4(index+1)+'</strong>'+
   '<label class="field"><span>تاريخ الاستحقاق</span><input data-print-installment-field="dueDate" type="date" value="'+E(item.dueDate||'')+'"></label>'+
   '<label class="field"><span>المبلغ</span><input data-print-installment-field="amount" type="number" min="0.01" step="any" value="'+E(item.amount??'')+'"></label>'+
   '<button type="button" class="linkbtn" data-print-installment-remove="'+index+'" title="إزالة قسط من نسخة الطباعة">'+uiIcon('trash',15)+'</button>'+
  '</div>').join('');
 const party=(first,title,entries)=>'<div class="customer-signature-party">'+
  '<strong>'+E(title)+'</strong>'+entries.map(field).join('')+'</div>';
 return '<div class="overlay"><div class="modal customer-pdf-editor landlord-pdf-editor" role="dialog" aria-modal="true" aria-labelledby="landlordPdfEditorTitle">'+
  '<div class="modalhead"><div><h2 id="landlordPdfEditorTitle">مراجعة وتحرير عقد إيجار السطح للطباعة</h2>'+
  '<p class="subtle">صفحتان بقالب رأفت الأصلي: عقد السطح أولاً، ثم شروط الإيجار والتواقيع. التعديلات هنا تخص PDF فقط. لتغيير مواعيد الأقساط المحفوظة فعلياً افتح «تفاصيل / تعديل» عقد السطح؛ الشروط العشرة قابلة للتعديل والإضافة والحذف قبل الطباعة.</p></div>'+
  '<button type="button" class="close" data-action="close">'+uiIcon('x',19)+'</button></div>'+
  '<form id="landlordPdfEditorForm">'+
  '<section class="customer-print-section"><h3>رقم العقد</h3><div class="customer-print-fields">'+
   field(['number','رقم العقد الموحد في الصفحتين'])+'</div></section>'+
  '<section class="customer-print-section"><h3>بيانات طرفي عقد السطح</h3>'+
    '<div class="customer-signature-parties">'+
     party(true,'الطرف الأول — يمين: المؤجر (مالك السطح)',[
      ['landlordName','اسم مالك السطح'],['landlordPhone','هاتف المالك'],
      ['landlordRepresentative','ممثل المالك'],['landlordAddress','عنوان المالك']])+
     party(false,'الطرف الثاني — يسار: المستأجر (شركة رأفت)',[
      ['companyRepresentative','اسم المدير المفوض'],['companyPhones','أرقام هواتف الشركة']])+
    '</div></section>'+
  '<section class="customer-print-section"><h3>بيانات السطح والمساحات</h3>'+
   '<div class="customer-print-fields">'+[
    ['propertyName','اسم السطح / البناية'],['governorate','المحافظة'],
    ['dimensions','الطول × العرض'],['area','مساحة السطح م²'],
    ['quantity','عدد المساحات','number']
   ].map(field).join('')+'</div></section>'+
  '<section class="customer-print-section"><h3>مدة الإيجار والسداد</h3>'+
   '<div class="customer-print-fields">'+[
    ['startDate','تاريخ بدء الإيجار','date'],['endDate','تاريخ انتهاء الإيجار','date'],
    ['paymentFrequency','دورية تسديد الإيجار'],['graceDays','أيام فترة السماح','number'],
    ['currency','عملة العقد','currency'],['rentTotal','الإيجار الإجمالي بعملة الطباعة','number'],
    ['advanceAmount','المقدم عند التعاقد','number']
   ].map(field).join('')+'</div>'+
   '<p class="subtle">تُحدّث الأجرة وفترة السماح وتواريخ الإيجار داخل الشروط تلقائياً عند تغييرها، ويمكن مراجعة صياغة كل شرط قبل الطباعة.</p>'+
   '<div class="landlord-print-fx-note" role="note">'+
    'سعر الصرف المعتمد: 1 دولار = '+E(Number(s.settings?.usd_iqd||0).toLocaleString('en-US'))+
    ' دينار عراقي. عند تغيير عملة نسخة الطباعة تُحوَّل كل مبالغ العقد والأقساط؛ ويمكنك كتابة القيمة المطلوبة بالدينار يدوياً بعد التحويل. <strong>العقد الأصلي لا يتغير.</strong></div>'+
   '<div class="customer-print-section-head"><h3>الأقساط الواردة في نسخة العقد</h3>'+
    '<button type="button" class="btn secondary mini" data-print-installment-add>'+uiIcon('plus',15)+' إضافة قسط</button></div>'+
   '<div class="landlord-print-installments">'+installments+'</div></section>'+
  '<section class="customer-print-section"><h3>شروط عقد السطح — الصفحة الثانية</h3>'+
   '<div class="customer-print-section-head"><p class="subtle">عشرة شروط أساسية قابلة للتعديل والإضافة والحذف، مع ترقيم متسلسل تلقائي.</p>'+
    '<button class="btn secondary mini" type="button" data-print-clause-add>'+uiIcon('plus',15)+' إضافة شرط</button></div>'+
   '<div class="customer-print-clauses">'+clauses+'</div>'+
   '<div class="customer-print-fields">'+[
    ['extraTerms','شروط خاصة إضافية','textarea'],
    ['notes','ملاحظات عقد الإيجار','textarea']
   ].map(field).join('')+'</div></section>'+
  '<section class="customer-print-section"><h3>التواقيع والتواريخ — الصفحة الثانية</h3>'+
   '<div class="customer-signature-parties">'+
    party(true,'الطرف الأول — يمين: المؤجر (المالك)',[
     ['firstSignatureLabel','عنوان توقيع المالك'],['firstSignatureName','اسم ممثل المالك للتوقيع'],
     ['firstSignatureDate','تاريخ توقيع المالك','date']])+
    party(false,'الطرف الثاني — يسار: المستأجر (شركة رأفت)',[
     ['secondSignatureLabel','صفة المدير المفوض / الشركة'],['secondSignatureName','اسم المدير المفوض للتوقيع'],
     ['secondSignatureDate','تاريخ توقيع الشركة','date']])+
   '</div></section>'+
  '<div class="customer-print-actions"><button type="button" class="btn secondary" data-pdf-editor-preview>'+
   uiIcon('file',16)+' معاينة ملف PDF</button>'+
   '<button type="button" class="btn" data-pdf-editor-download>'+uiIcon('download',16)+' تنزيل نسخة الطباعة</button>'+
   '<button type="button" class="btn secondary" data-action="close">إغلاق</button></div>'+
  '</form></div></div>';
}

function openCustomerPdfEditor(id,preferredMode='preview'){
 const contract=lookup('customer_contracts',id);
 if(!contract)return toast('عقد الزبون غير موجود، يرجى مراجعة السجل.',true);
 const payload=customerContractPdfPayload(contract);
 // Snapshot the company rate in this print-only draft. Neither the stored
 // contract amount nor any campaign receipts are modified by PDF edits.
 payload.exchangeRate=Number(s.settings?.usd_iqd)||0;
 const pdf=typeof window!=='undefined'?window.RaafatContractPdf:null;
 const standard=typeof pdf?.defaultCustomerClauses==='function'?
  pdf.defaultCustomerClauses(payload):pdf?.defaultClauses;
 const fallback=[
  ['1','تتعهد شركتنا بحماية إعلان المشترك من تاريخ توقيع العقد لغاية الانتهاء.'],
  ['2','تتعهد شركتنا بتوفير إنارة الكابينة وإدامتها وحسب الحاجة.'],
  ['4','في حالة تلف إعلان المشترك من قبل العناصر المجهولة تتعهد الشركة بإعادة تصميم وطبع إعلان المشترك من تاريخ توقيع العقد لغاية الانتهاء.'],
  ['5','تتعهد الشركة بترويج إعلان المشترك على مشروع الشاشات العملاقة ولمدة 30 يوم وبسعر 25$ فقط من تاريخ التشغيل التابع لنا.'],
  ['6','تتعهد الشركة بترويج إعلان المشترك على مواقع التواصل الاجتماعي التابعة لنا.'],
  ['7','يتعهد المشترك بدفع جميع أجور الإعلان الخاصة به.'],
  ['8','ترفع جميع الإعلانات التجارية في وقت الانتخابات المحددة ويتم إعادتها من قبلنا بعد انتهاء فترة الانتخابات.'],
  ['9','يتعهد المشترك بتصميم وتبديل الإعلان الخاص به كل ستة أشهر ويكون مع الشركة حصراً.'],
  ['10','حرر هذا العقد من نسختين ووقعه الطرفان بعد الاطلاع على البنود المدرجة أعلاه.']
 ].map(([,text],index)=>({number:String(index+1),text}));
 payload.clauses=(standard||fallback).map((item,index)=>({...item,number:String(index+1)}));
 payload._autoCustomerClauses=payload.clauses.map(item=>item.text);
 s.modal={kind:'customerPdfEditor',table:'customer_contracts',data:contract,
  printDraft:payload,preferredMode};
 render();
}
const CUSTOMER_PRINT_FIELDS=[
 ['customerName','اسم الزبون'],['customerPhone','هاتف الزبون'],
 ['companyPhones','أرقام هواتف الشركة'],['customerRepresentative','ممثل الزبون'],
 ['companyRepresentative','اسم المدير المفوض'],['campaignTitle','عنوان الحملة'],
 ['packageName','الباقة الإعلانية'],['quantity','عدد القطع','number'],
 ['months','مدة الحجز بالأشهر','number'],['startDate','بداية العقد','date'],
 ['endDate','نهاية العقد','date'],['dimensions','القياسات'],['area','المساحة م²'],
 ['amount','القيمة المتفق عليها','number'],['currency','العملة','currency'],
 ['additionalLocations','مواقع إعلانية إضافية','textarea'],
 ['specifications','مواصفات الإعلان','textarea'],
 ['campaignNotes','ملاحظات الحملة','textarea'],
 ['notes','ملاحظات العقد','textarea'],['extraTerms','شروط خاصة إضافية','textarea']
];
function customerPdfEditorHtml(){
 const m=s.modal,v=m.printDraft;
 const field=([id,label,type='text'])=>{
  let control=type==='textarea'?
   '<textarea name="'+E(id)+'" rows="2">'+E(v[id]||'')+'</textarea>':
   type==='currency'?'<select name="currency">'+['IQD','USD'].map(code=>'<option value="'+code+'"'+(v.currency===code?' selected':'')+'>'+E(labels[code]||code)+'</option>').join('')+'</select>':
   '<input name="'+E(id)+'" type="'+E(type)+'" '+(type==='number'?'min="0" step="any"':'')+' value="'+E(v[id]??'')+'">';
  return '<label class="field '+(type==='textarea'?'full':'')+'"><span>'+E(label)+'</span>'+control+'</label>';
 };
 const line=(site,index)=>'<div class="customer-print-site" data-print-site><div class="customer-print-site-head">'+
  '<strong>القطعة '+serial4(index+1)+'</strong>'+
  '<button type="button" class="linkbtn" data-print-site-remove="'+index+'">'+uiIcon('trash',14)+' إزالة من نسخة الطباعة</button></div>'+
  '<div class="customer-print-site-grid">'+
   [['code','رمز القطعة'],['name','اسم الموقع'],['governorate','المحافظة'],['address','العنوان']].map(([id,label])=>
    '<label class="field"><span>'+label+'</span><input data-print-site-field="'+id+'" value="'+E(site[id]||'')+'"></label>').join('')+
  '</div></div>';
 return '<div class="overlay"><div class="modal customer-pdf-editor" role="dialog" aria-modal="true" aria-labelledby="customerPdfEditorTitle">'+
  '<div class="modalhead"><div><h2 id="customerPdfEditorTitle">مراجعة وتحرير نسخة العقد للطباعة</h2>'+
  '<p class="subtle">صفحتان بالقالب الأصلي: العقد أولاً، ثم الشروط والتواقيع. تعديلات هذه النافذة خاصة بملف PDF ولا تغيّر البيانات المحفوظة.</p></div>'+
  '<button class="close" type="button" data-action="close">'+uiIcon('x',19)+'</button></div>'+
  '<form id="customerPdfEditorForm">'+
  '<section class="customer-print-section"><h3>بيانات العقد والأطراف — الصفحة الأولى</h3>'+
   '<div class="customer-print-fields">'+
    '<label class="field"><span>رقم عقد الزبون</span><input name="number" value="'+E(v.number||'')+'"></label>'+
    CUSTOMER_PRINT_FIELDS.slice(0,15).map(field).join('')+'</div>'+
   '<p class="customer-print-currency-note">عملة الطباعة: <strong>'+E(v.currency==='IQD'?'دينار عراقي (IQD)':'دولار أمريكي (USD)')+
   '</strong> • سعر الصرف المعتمد: 1$ = '+E(fmt(v.exchangeRate||s.settings?.usd_iqd||0))+
   ' د.ع. عند تغيير العملة تتحول قيمة العقد تلقائياً، وتكدر تعدّل المبلغ بعدها قبل الطباعة بدون تغيير بيانات العقد المحفوظ.</p>'+
  '</section>'+
  '<section class="customer-print-section"><h3>مواصفات الإعلان — الصفحة الأولى</h3>'+
    '<div class="customer-print-fields">'+field(CUSTOMER_PRINT_FIELDS[16])+'</div></section>'+
  '<section class="customer-print-section"><div class="customer-print-section-head"><h3>القطع والمواقع المشمولة</h3>'+
    '<button type="button" class="btn secondary mini" data-print-site-add>'+uiIcon('plus',15)+' إضافة قطعة لنسخة الطباعة</button></div>'+
    '<p class="subtle">يمكن تعديل الرموز والعناوين قبل الطباعة. يتم تصغير عرض القطع تلقائياً عند زيادة عددها.</p>'+
    '<div class="customer-print-sites">'+(v.sites||[]).map(line).join('')+'</div>'+
    '<div class="customer-print-fields">'+field(CUSTOMER_PRINT_FIELDS[15])+'</div></section>'+
  '<section class="customer-print-section"><h3>الشروط والملاحظات — الصفحة الثانية</h3>'+
   '<div class="customer-print-section-head"><p class="subtle">الترقيم متسلسل تلقائياً، وأي شرط جديد يُضاف قبل بند تحرير العقد الختامي.</p>'+
   '<button class="btn secondary mini" type="button" data-print-clause-add>'+uiIcon('plus',15)+' إضافة شرط</button></div>'+
   '<div class="customer-print-clauses">'+(v.clauses||[]).map((clause,index)=>
    '<div class="customer-print-clause" data-print-clause="'+index+'"><b>'+E(index+1)+'.</b>'+
    '<textarea rows="2" aria-label="نص الشرط '+E(index+1)+'">'+E(clause.text)+'</textarea>'+
    '<button type="button" class="linkbtn customer-print-clause-remove" data-print-clause-remove="'+index+'" aria-label="حذف الشرط '+(index+1)+'">'+uiIcon('trash',14)+'</button></div>').join('')+'</div>'+
   '<div class="customer-print-fields">'+CUSTOMER_PRINT_FIELDS.slice(17).map(field).join('')+'</div></section>'+
  '<section class="customer-print-section"><h3>بيانات التوقيع — الصفحة الثانية</h3>'+
   '<div class="customer-signature-parties">'+
    '<div class="customer-signature-party"><strong>الطرف الأول — جهة اليمين (الشركة)</strong>'+
    [
     ['firstSignatureLabel','عنوان الطرف الأول'],
     ['firstSignatureName','اسم المدير المفوض'],
     ['firstSignatureDate','تاريخ توقيع الطرف الأول','date']
    ].map(field).join('')+'</div>'+
    '<div class="customer-signature-party"><strong>الطرف الثاني — جهة اليسار (الزبون)</strong>'+
    [
     ['secondSignatureLabel','عنوان الطرف الثاني'],
     ['secondSignatureName','اسم ممثل الزبون'],
     ['secondSignatureDate','تاريخ توقيع الطرف الثاني','date']
    ].map(field).join('')+'</div>'+
   '</div></section>'+
  '<div class="customer-print-actions"><button type="button" class="btn secondary" data-pdf-editor-preview>'+
   uiIcon('file',16)+' معاينة ملف PDF</button><button type="button" class="btn" data-pdf-editor-download>'+
   uiIcon('download',16)+' تنزيل نسخة الطباعة</button>'+
   '<button type="button" class="btn secondary" data-action="close">إغلاق</button></div>'+
  '</form></div></div>';
}
function captureCustomerPdfEditor(form){
 const modal=s.modal;
 if(!['customerPdfEditor','landlordPdfEditor'].includes(modal?.kind)||!form)return;
 const previous=modal.printDraft;
 const payload={...previous};
 for(const [name,val] of new FormData(form).entries()){
  if(!(val instanceof File))payload[name]=String(val).trim();
 }
 // Capture clauses *before* recomputing lease terms. The old code rebuilt
 // terms, then overwrote them with stale textarea values on every save.
 payload.clauses=[...form.querySelectorAll('[data-print-clause]')].map((row,index)=>({
  number:String(index+1),text:row.querySelector('textarea')?.value?.trim()||''
 }));
 if(modal.kind==='customerPdfEditor'){
  payload.amount=Number(payload.amount);
  // A currency switch changes the actual numeric value on the *print draft*,
  // not merely the printed currency symbol. A subsequent manual edit is kept.
  if(previous.currency!==payload.currency){
   const rate=Number(s.settings?.usd_iqd);
   if(!['USD','IQD'].includes(previous.currency)||!['USD','IQD'].includes(payload.currency)||
      !Number.isFinite(rate)||rate<=0)
    throw Error('سعر الصرف غير صالح. راجع إعدادات العملة قبل طباعة العقد.');
   const converted=convert(payload.amount,previous.currency,payload.currency);
   payload.amount=payload.currency==='IQD'?Math.round(converted):roundAmount(converted);
  }
  payload.exchangeRate=Number(s.settings?.usd_iqd)||previous.exchangeRate;
  // Update only legal clauses still matching the generated standard wording.
  // Custom edits to conditions always remain exactly as the user entered.
  const standard=window.RaafatContractPdf?.defaultCustomerClauses?.(payload)?.map(item=>item.text);
  if(standard){
   const old=previous._autoCustomerClauses||[];
   payload.clauses=payload.clauses.map(clause=>{
    const index=old.indexOf(clause.text);
    return index>=0&&index<standard.length?{...clause,text:standard[index]}:clause;
   });
   payload._autoCustomerClauses=standard;
  }
  payload.sites=[...form.querySelectorAll('[data-print-site]')].map(row=>{
   const get=name=>row.querySelector('[data-print-site-field="'+name+'"]')?.value?.trim()||'';
   return {code:get('code'),name:get('name'),governorate:get('governorate'),address:get('address')};
  });
 }else{
  payload.installments=[...form.querySelectorAll('[data-print-installment]')].map(row=>{
   const get=name=>row.querySelector('[data-print-installment-field="'+name+'"]')?.value||'';
   return {dueDate:get('dueDate'),amount:Number(get('amount')||0)};
  });
  payload.rentTotal=Number(payload.rentTotal);
  payload.advanceAmount=Number(payload.advanceAmount);
  payload.graceDays=Number(payload.graceDays);
  payload.quantity=Number(payload.quantity)||0;
  // Currency changes affect the entire *print copy*: rent, upfront amount,
  // each installment, balance, and auto-generated legal clauses together.
  // Never change the original saved agreement or the live finance ledger.
  const from=previous.currency,to=payload.currency;
  if(from!==to){
   const rate=Number(s.settings?.usd_iqd);
   if(!['IQD','USD'].includes(from)||!['IQD','USD'].includes(to)||
      !Number.isFinite(rate)||rate<=0)throw Error('سعر الصرف غير صالح. راجع إعدادات العملة قبل تجهيز نسخة العقد.');
   const fx=n=>{
    const value=convert(n,from,to);
    return to==='IQD'?Math.round(value):roundAmount(value);
   };
   payload.rentTotal=fx(payload.rentTotal);
   payload.advanceAmount=fx(payload.advanceAmount);
   payload.installments=payload.installments.map(item=>({...item,amount:fx(item.amount)}));
  }
  payload.remainingAfterAdvance=roundAmount(Math.max(0,payload.rentTotal-payload.advanceAmount));
  // Only replace clauses whose text is still the previously generated version;
  // user-written clauses and added custom conditions must never be overwritten.
  const autoTerms=window.RaafatContractPdf?.defaultLandlordClauses?.(payload)?.map(item=>item.text);
  if(autoTerms){
   const oldAuto=previous._autoLandlordClauses||[];
   payload.clauses=payload.clauses.map(clause=>{
    const oldIndex=oldAuto.indexOf(clause.text);
    return oldIndex>=0&&oldIndex<autoTerms.length?
     {...clause,text:autoTerms[oldIndex]}:clause;
   });
   payload._autoLandlordClauses=autoTerms;
  }
 }
 payload.quantity=Number(payload.quantity)||0;
 payload.months=Number(payload.months)||0;
 payload.amount=Number(payload.amount)||0;
 modal.printDraft=payload;
}
function bindCustomerPdfEditor(){
 const form=$('#customerPdfEditorForm')||$('#landlordPdfEditorForm');
 if(!form)return;
 document.querySelectorAll('[data-pdf-editor-preview],[data-pdf-editor-download]').forEach(button=>button.onclick=async()=>{
  captureCustomerPdfEditor(form);
  const m=s.modal,mode=button.hasAttribute('data-pdf-editor-preview')?'preview':'download';
  if(!m||!['customerPdfEditor','landlordPdfEditor'].includes(m.kind))return;
  const draft=m.printDraft;
  if(m.kind==='customerPdfEditor'){
   if(!draft.customerName||!draft.number||!draft.campaignTitle)return toast('تأكد من رقم العقد واسم الزبون وعنوان الحملة.',true);
   if(draft.amount<0||!Number.isFinite(draft.amount))return toast('القيمة المتفق عليها غير صالحة.',true);
  }else{
   if(!draft.number||!draft.landlordName||!draft.propertyName)return toast('راجع رقم العقد واسم المالك واسم السطح.',true);
   if(!Number.isFinite(draft.rentTotal)||draft.rentTotal<=0)return toast('أدخل قيمة إيجار صحيحة أكبر من صفر.',true);
   if(!Number.isFinite(draft.advanceAmount)||draft.advanceAmount<0||draft.advanceAmount>draft.rentTotal)
    return toast('المبلغ المقدم يجب أن يكون بين صفر والإيجار الإجمالي.',true);
   if(draft.installments.some(x=>!x.dueDate||!Number.isFinite(x.amount)||x.amount<=0))
    return toast('راجع تواريخ ومبالغ أقساط الإيجار في نسخة الطباعة.',true);
  }
  const blankClause=draft.clauses.findIndex(item=>!item.text.trim());
  if(blankClause>=0)return toast('أدخل نص الشرط رقم '+(blankClause+1)+' أو احذف الشرط الفارغ قبل الطباعة.',true);
  button.disabled=true;
  try{
   if(m.kind==='landlordPdfEditor')await generateLandlordContractPdf(m.data.id,mode,draft);
   else await generateCustomerContractPdf(m.data.id,mode,draft);
  }finally{if(button.isConnected)button.disabled=false;}
 });
 if(s.modal?.kind==='customerPdfEditor'){
  const currency=form.querySelector('[name="currency"]');
  if(currency)currency.addEventListener('change',()=>{
   try{captureCustomerPdfEditor(form);render();}
   catch(e){toast(e.message||String(e),true);render();}
  });
 }
 if(s.modal?.kind==='landlordPdfEditor'){
  form.querySelectorAll('[name="rentTotal"],[name="currency"],[name="advanceAmount"],[name="graceDays"],[name="startDate"],[name="endDate"],[data-print-installment-field="amount"]').forEach(input=>{
   input.addEventListener('change',()=>{
    try{captureCustomerPdfEditor(form);render();}
    catch(e){toast(e.message||String(e),true);render();}
   });
  });
 }
 const addClause=form.querySelector('[data-print-clause-add]');
 if(addClause)addClause.onclick=()=>{
  captureCustomerPdfEditor(form);
  const clauses=s.modal.printDraft.clauses;
  if(clauses.length>=30)return toast('الحد الأقصى 30 شرطاً لنسخة الطباعة.',true);
  const closingIndex=clauses.findIndex(item=>/حرر هذا العقد/.test(item.text));
  clauses.splice(closingIndex>=0?closingIndex:clauses.length,0,{number:'',text:''});
  clauses.forEach((item,index)=>item.number=String(index+1));
  render();
 };
 form.querySelectorAll('[data-print-clause-remove]').forEach(button=>button.onclick=()=>{
  captureCustomerPdfEditor(form);
  const clauses=s.modal.printDraft.clauses;
  if(clauses.length<=1)return toast('يجب إبقاء شرط واحد على الأقل.',true);
  clauses.splice(Number(button.dataset.printClauseRemove),1);
  clauses.forEach((item,index)=>item.number=String(index+1));
  render();
 });
 const addInstallment=form.querySelector('[data-print-installment-add]');
 if(addInstallment)addInstallment.onclick=()=>{
  captureCustomerPdfEditor(form);
  const installments=s.modal.printDraft.installments;
  if(installments.length>=30)return toast('الحد الأقصى 30 قسطاً في نسخة الطباعة.',true);
  installments.push({dueDate:'',amount:0});
  render();
 };
 form.querySelectorAll('[data-print-installment-remove]').forEach(button=>button.onclick=()=>{
  captureCustomerPdfEditor(form);
  s.modal.printDraft.installments.splice(Number(button.dataset.printInstallmentRemove),1);
  render();
 });
 const add=form.querySelector('[data-print-site-add]');
 if(add)add.onclick=()=>{
  captureCustomerPdfEditor(form);
  if(s.modal.printDraft.sites.length>=100)return toast('الحد الأقصى 100 قطعة في نسخة الطباعة.',true);
  s.modal.printDraft.sites.push({code:'',name:'',governorate:'',address:''});
  render();
 };
 form.querySelectorAll('[data-print-site-remove]').forEach(button=>button.onclick=()=>{
  captureCustomerPdfEditor(form);
  s.modal.printDraft.sites.splice(Number(button.dataset.printSiteRemove),1);
  render();
 });
}

function customerContractPreview(v){
 const customer=lookup('customers',v.customer_id),pkg=lookup('packages',v.package_id),site=lookup('ad_sites',v.site_id),campaign=lookup('campaigns',v.campaign_id);
 const dimension=v.package_dimensions_snapshot||(pkg?.width_m&&pkg?.height_m?fmt(pkg.width_m)+' × '+fmt(pkg.height_m)+' م':'غير مسجل');
 const specs=v.package_specifications_snapshot||pkg?.specifications||'لم يتم إدخال المواصفات';
 const {sites,total,locations,notes}=contractCampaignDetails(v);
 const selectedLocations=sites.map(x=>(x.code||'')+' — '+(x.name||'')).join('، ');
 const siteCards=sites.map(x=>'<div class="contract-preview-board"><b>'+E((x.code||'')+' — '+(x.name||''))+'</b><small>'+E([x.governorate,x.address].filter(Boolean).join('، ')||'—')+'</small></div>').join('');
 const record=(label,value)=>'<div><small>'+E(label)+'</small><strong>'+E(value??'—')+'</strong></div>';
 return '<div class="overlay print-overlay"><div class="modal print-modal"><div class="modalhead noprint"><h2>معاينة عقد الزبون</h2><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div><article class="contract printed-contract" dir="rtl"><div class="contract-head"><div class="contract-number-top">رقم العقد: '+E(numberedContract(v.contract_number))+'</div><h3>معاينة بيانات عقد حجز وتأجير مساحة إعلانية للزبون</h3><small>نوع العقد: '+E(labels[v.contract_type]||v.contract_type)+'</small></div><div class="summary">'+record('الطرف الأول','الشركة')+record('الطرف الثاني (الزبون)',customer?.name||v.customer_name_snapshot||'—')+record('هاتف الشركة','07766663304 - 07866663304')+record('رقم هاتف الزبون',customer?.phone||'—')+record('اسم الباقة',pkg?.name||v.package_name_snapshot||'—')+record('عدد القطع المتفق عليها',total||'غير مسجل')+record('عدد الأوجه',campaignFacesText(v,pkg))+record('عدد المواقع المحددة',sites.length)+record('نوع المساحة',labels[v.contract_type]||v.contract_type)+record('الطول والعرض',dimension)+record('مدة العقد',v.duration_months+' شهر')+record('المساحة م²',v.package_area_snapshot?fmt(v.package_area_snapshot):(pkg?.area_m2?fmt(pkg.area_m2):'—'))+record('المواقع الإعلانية',selectedLocations||site?.name||v.site_name_snapshot||'لم يتم تحديد الموقع')+record('مواقع إضافية مسجلة',locations||'—')+record('الحملة',campaign?.title||'لا توجد حملة مرتبطة')+record('تاريخ البداية',v.start_date)+record('تاريخ النهاية',v.end_date)+record('القيمة المتفق عليها',money(v.amount,v.currency))+record('المدير المفوض',v.company_representative||'—')+record('ممثل الزبون',v.customer_representative||'—')+'</div><h3>القطع والمواقع الإعلانية المشمولة بالعقد</h3><div class="contract-preview-sites">'+(siteCards||'<p>لا توجد قطع محددة بالرموز، راجع معلومات الموقع الإضافية.</p>')+'</div><h3>مواصفات المساحة الإعلانية</h3><p class="legal-text">'+E(specs)+'</p><h3>ملاحظات الحملة المسجلة</h3><p class="legal-text">'+E(notes||'—')+'</p><h3>الشروط والتواقيع — الصفحة الثانية</h3><p class="legal-text">تُطبع الشروط والتواقيع في صفحة مستقلة بعد العقد. يمكن تعديل نصوص الشروط وبيانات الطرفين قبل إصدار ملف PDF.</p><p class="print-note">تُراجع هذه المسودة مع الإدارة القانونية قبل اعتمادها كصيغة تعاقد نهائية.</p></article><div class="lease-preview-actions noprint"><button type="button" class="btn" data-customer-pdf="'+E(v.id)+'" data-pdf-mode="preview">'+uiIcon('printer',16)+' مراجعة البنود وتجهيز PDF</button><button type="button" class="btn secondary" data-edit="customer_contracts:'+E(v.id)+'">'+uiIcon('pencil',16)+' تعديل بيانات العقد</button>'+customerContractPaymentAction(v)+'<button class="btn secondary" data-action="close">إغلاق</button></div><p class="subtle contract-pdf-source-note noprint">المحتوى للمراجعة فقط؛ ملف PDF النهائي يستخدم قالب الشركة الأصلي في صفحتين مستقلتين، وأي تعديل قبل الطباعة لا يغيّر السجل المحفوظ.</p></div></div>';
}

function previewHtml(v){
 let p=nameOf('properties',v.property_id),l=nameOf('landlords',v.landlord_id);
 let rows=s.data.lease_installments.filter(x=>x.lease_id===v.id).sort((a,b)=>a.due_date.localeCompare(b.due_date));
 return '<div class="overlay"><div class="modal"><div class="modalhead noprint"><h2>معاينة العقد</h2><button class="close" data-action="close">'+uiIcon('x',19)+'</button></div><article class="contract"><h3 style="text-align:center">معاينة بيانات عقد إيجار سطح بين الشركة ومالك البناية — '+E(numberedContract(v.contract_number))+'</h3><div class="summary"><div><small>اسم المالك</small>'+E(l)+'</div><div><small>هاتف المالك</small>'+E(lookup('landlords',v.landlord_id)?.phone||'—')+'</div><div><small>المحافظة وعنوان السكن</small>'+E([lookup('landlords',v.landlord_id)?.governorate,lookup('landlords',v.landlord_id)?.residential_address].filter(Boolean).join(' — ')||'—')+'</div><div><small>العقار</small>'+E(p)+'</div><div><small>قياسات السطح</small>'+E(lookup('properties',v.property_id)?.dimensions||'—')+'</div><div><small>بداية العقد</small>'+E(v.start_date)+'</div><div><small>نهاية العقد</small>'+E(v.end_date)+'</div><div><small>الأجرة الإجمالية</small>'+E(money(v.rent_total,v.currency))+'</div><div><small>المقدم</small>'+E(money(leaseAdvance(v),v.currency))+'</div><div><small>المتبقي بعد المقدم</small>'+E(money(Math.max(0,Number(v.rent_total||0)-leaseAdvance(v)),v.currency))+'</div><div><small>المعادل بسعر الصرف الحالي — للاطلاع فقط</small>'+E(money(equivalent(v.rent_total,v.currency),s.displayCurrency))+'</div><div><small>الدورية</small>'+E(labels[v.payment_frequency])+'</div><div><small>فترة السماح</small>'+E(v.grace_days)+' يوم</div><div><small>المدير المفوض / ممثل المالك</small>'+E(v.company_representative||'—')+' / '+E(v.landlord_representative||'—')+'</div></div><p style="margin-top:18px">ملاحظات وشروط: '+E(v.notes||'لا توجد')+'</p><h3>جدول الدفعات</h3><table><thead><tr><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>المدفوع</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+E(x.due_date)+'</td><td>'+E(money(x.amount,v.currency))+'</td><td>'+E(money(x.paid_amount,v.currency))+'</td></tr>').join('')+'</tbody></table><div style="display:flex;justify-content:space-between;margin-top:55px"><span>توقيع المدير المفوض: ___________</span><span>توقيع ممثل المالك: ___________</span></div><p class="subtle" style="margin-top:25px">هذه معاينة للبيانات المسجلة وليست بديلاً عن نص عقد قانوني معتمد.</p></article><div class="lease-preview-actions noprint"><button type="button" class="btn" data-landlord-pdf="'+E(v.id)+'" data-pdf-mode="preview">'+uiIcon('printer',16)+' مراجعة البنود وتجهيز PDF</button><button type="button" class="btn secondary" data-edit="leases:'+E(v.id)+'">'+uiIcon('pencil',16)+' تعديل بيانات العقد</button><button type="button" class="btn secondary" data-lease-payments="'+E(v.id)+'">'+uiIcon('receipt',16)+' الأقساط والدفعات</button><button class="btn secondary" data-action="close">إغلاق</button></div></div></div>';
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
 enhanceAppSelects();
 inventory.bind();
 document.querySelectorAll('[data-inv-open-alerts]').forEach(button=>button.onclick=()=>{s.modal=null;s.view='inventory';inventory.setTab('notices')});

 const alertNav=document.querySelector('[data-alerts-nav]');
 if(alertNav)alertNav.onclick=()=>{s.view='alerts';s.modal=null;s.alertFilter='all';render()};
 document.querySelectorAll('[data-reminder-filter]').forEach(btn=>btn.onclick=()=>{
  s.alertFilter=btn.dataset.reminderFilter;render();
 });
 document.querySelectorAll('[data-reminder-compose]').forEach(btn=>btn.onclick=()=>{
  s.modal={kind:'reminderMessage',alertKey:btn.dataset.reminderCompose};render();
 });
 document.querySelectorAll('[data-reminder-open]').forEach(btn=>btn.onclick=()=>{
  const notice=alertsList().find(a=>a.key===btn.dataset.reminderOpen);
  if(notice){const rec=lookup(notice.table,notice.id);if(rec)openForm(notice.table,rec)}
 });
 const send=document.querySelector('[data-reminder-whatsapp]');
 if(send)send.onclick=()=>{
  const notice=alertsList().find(a=>a.key===s.modal?.alertKey);
  const phone=whatsappIraqNumber(notice?.phone);
  const message=document.querySelector('#reminderMessageText')?.value?.trim();
  if(!phone||!message)return toast('تأكد من رقم الهاتف ونص الرسالة',true);
  window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');
 };
 const copy=document.querySelector('[data-reminder-copy]');
 if(copy)copy.onclick=async()=>{
  const value=document.querySelector('#reminderMessageText')?.value||'';
  try{await navigator.clipboard.writeText(value);toast('تم نسخ رسالة التذكير')}
  catch(e){toast('تعذر النسخ التلقائي. حدّد النص وانسخه يدوياً.',true)}
 };

 document.querySelectorAll('[data-new]').forEach(x=>x.onclick=()=>openForm(x.dataset.new));
 document.querySelectorAll('[data-clear-campaign-payment-focus]').forEach(button=>button.onclick=()=>{
  s.campaignPaymentFocusId=null;s.search='';render();
 });
 document.querySelectorAll('[data-payroll-create]').forEach(x=>x.onclick=()=>openPayrollPayment(x.dataset.payrollCreate));
 document.querySelectorAll('[data-payroll-receipt]').forEach(x=>x.onclick=()=>downloadPayrollReceipt(x.dataset.payrollReceipt));
 document.querySelectorAll('[data-staff-new]').forEach(x=>x.onclick=()=>openStaffRoleEditor());
 document.querySelectorAll('[data-staff-edit]').forEach(x=>x.onclick=()=>openStaffRoleEditor(x.dataset.staffEdit));
 document.querySelectorAll('[data-staff-refresh]').forEach(x=>x.onclick=()=>refreshManagedStaff());
 const payrollForm=$('#payrollPaymentForm');
 if(payrollForm)payrollForm.onsubmit=event=>{event.preventDefault();savePayrollPayment(payrollForm)};
 const staffForm=$('#staffRoleForm');
 if(staffForm)staffForm.onsubmit=event=>{event.preventDefault();saveStaffRole(staffForm)};
 document.querySelectorAll('[data-employee-history]').forEach(x=>x.onclick=()=>{
  s.employeeFocus=x.dataset.employeeHistory||null;render();
 });
 document.querySelectorAll('[data-activity-refresh]').forEach(x=>x.onclick=()=>refreshActivityLogs());
 if($('#activitySearch'))$('#activitySearch').oninput=e=>{s.activityQuery=e.target.value;render();$('#activitySearch')?.focus()};
 if($('#activityAction'))$('#activityAction').onchange=e=>{s.activityAction=e.target.value;render()};
 document.querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>{let [k,id]=x.dataset.edit.split(':');openForm(k,lookup(k,id))});
 document.querySelectorAll('[data-delete-customer]').forEach(x=>x.onclick=()=>openCustomerDelete(x.dataset.deleteCustomer));
 document.querySelectorAll('[data-delete-landlord]').forEach(x=>x.onclick=()=>openLandlordDelete(x.dataset.deleteLandlord));
 document.querySelectorAll('[data-delete-expense]').forEach(x=>x.onclick=()=>openExpenseDelete(x.dataset.deleteExpense));
 document.querySelectorAll('[data-delete-site]').forEach(x=>x.onclick=()=>openSiteDelete(x.dataset.deleteSite));
 document.querySelectorAll('[data-delete-contract]').forEach(x=>x.onclick=()=>{const [table,id]=x.dataset.deleteContract.split(':');openContractDelete(table,id)});
 document.querySelectorAll('[data-site-deactivate]').forEach(x=>x.onclick=()=>deactivateSite(x.dataset.siteDeactivate));
 document.querySelectorAll('[data-expense-proof]').forEach(x=>x.onclick=()=>showExpenseTransferProof(x.dataset.expenseProof));
 for(const [formId,inputId,buttonId,handler] of [
  ['deleteLandlordForm','deleteLandlordConfirmation','deleteLandlordSubmit',deleteLandlordConfirmed],
  ['deleteExpenseForm','deleteExpenseConfirmation','deleteExpenseSubmit',deleteExpenseConfirmed],
  ['deleteSiteForm','deleteSiteConfirmation','deleteSiteSubmit',deleteSiteConfirmed]
 ]){
  const form=$('#'+formId),input=$('#'+inputId),button=$('#'+buttonId);
  if(form&&input&&button){
   input.oninput=()=>{button.disabled=input.value.trim()!=='حذف'};
   form.onsubmit=e=>{e.preventDefault();handler(form)};
  }
 }
 if($('#deleteContractForm')){
  const form=$('#deleteContractForm'),entry=$('#deleteContractConfirmation'),button=$('#deleteContractSubmit');
  entry.oninput=()=>{button.disabled=entry.value.trim()!=='حذف'||Boolean(s.deletingContract)};
  form.onsubmit=event=>{event.preventDefault();deleteContractConfirmed(form)};
 }
 if($('#deleteCustomerForm')){
  const form=$('#deleteCustomerForm'),entry=$('#deleteCustomerConfirmation'),button=$('#deleteCustomerSubmit');
  if(entry&&button)entry.oninput=()=>{button.disabled=entry.value.trim()!=='حذف'||Boolean(s.deletingCustomer)};
  form.onsubmit=event=>{event.preventDefault();deleteCustomerConfirmed(form)};
 }
 document.querySelectorAll('[data-new-linked]').forEach(x=>x.onclick=()=>{let [k,field,id]=x.dataset.newLinked.split('|');let data={[field]:id};if(field==='property_id')data.landlord_id=lookup('properties',id)?.landlord_id;if(field==='campaign_id'){
   const parent=lookup('campaigns',id);
   if(k==='campaign_payments')data.amount='';
   if(k==='customer_contracts'&&parent){data.customer_id=parent.customer_id;data.package_id=parent.package_id;data.amount=parent.price;data.currency=parent.currency;}
  }if(field==='site_id')data.siteIds=[id];openForm(k,data)});
 document.querySelectorAll('[data-preview]').forEach(x=>x.onclick=()=>{s.modal={kind:'preview',table:'leases',data:lookup('leases',x.dataset.preview)};render()});
 document.querySelectorAll('[data-lease-payments]').forEach(x=>x.onclick=()=>{
  const lease=lookup('leases',x.dataset.leasePayments);
  if(!lease)return toast('تعذّر فتح الأقساط: عقد السطح غير موجود.',true);
  s.modal=null;s.search=numberedContract(lease.contract_number);s.view='lease_installments';render();
 });
 document.querySelectorAll('[data-customer-preview]').forEach(x=>x.onclick=()=>{s.modal={kind:'preview',table:'customer_contracts',data:lookup('customer_contracts',x.dataset.customerPreview)};render()});
 document.querySelectorAll('[data-customer-payments]').forEach(button=>button.onclick=()=>{
  const contract=lookup('customer_contracts',button.dataset.customerPayments);
  const campaign=contract?.campaign_id?lookup('campaigns',contract.campaign_id):null;
  if(!campaign)return toast('هذا العقد غير مرتبط بحملة محفوظة، لذلك لا توجد دفعات حملة مرتبطة به.',true);
  if(!canAccess('campaign_payments','read'))return toast('ما عندك صلاحية لعرض دفعات الحملات.',true);
  s.modal=null;s.search='';s.campaignPaymentFocusId=campaign.id;s.view='campaign_payments';render();
 });
 document.querySelectorAll('[data-customer-pdf]').forEach(button=>button.onclick=()=>openCustomerPdfEditor(button.dataset.customerPdf,button.dataset.pdfMode||'preview'));
 bindCustomerPdfEditor();
 document.querySelectorAll('[data-landlord-pdf]').forEach(button=>button.onclick=()=>openLandlordPdfEditor(button.dataset.landlordPdf,button.dataset.pdfMode||'preview'));
 document.querySelectorAll('[data-print-record]').forEach(x=>x.onclick=()=>{const [table,id]=x.dataset.printRecord.split('|');s.modal={kind:'preview',table,data:lookup(table,id)};render()});
 document.querySelectorAll('[data-renew]').forEach(x=>x.onclick=()=>{let v=lookup('leases',x.dataset.renew);openForm('leases',{...v,id:undefined,contract_number:undefined,renewed_from:v.id,start_date:today(),end_date:'',rent_total:v.rent_total,advance_amount:0})});
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
  if($('#recordForm')){
   if(s.modal?.table==='company_expenses')captureExpenseDraft($('#recordForm'));
   else captureForm($('#recordForm'));
  }
  s.displayCurrency=e.target.value;
  localStorage.setItem('raafat-display-currency',s.displayCurrency);
  render();
 };
 if($('#search'))$('#search').oninput=e=>{let pos=e.target.selectionStart;s.search=e.target.value;const parent=e.target.closest('.content');parent.innerHTML=
 (s.view==='employees'?employeesOverview():listing(s.view));bind();let n=$('#search');n.focus();n.setSelectionRange(pos,pos)};
 if($('#statusfilter'))$('#statusfilter').onchange=e=>{s.filter=e.target.value;render()};
 if($('#expenseCategory'))$('#expenseCategory').onchange=e=>{s.expenseCategory=e.target.value;render()};
 if($('#connectForm'))$('#connectForm').onsubmit=e=>{e.preventDefault();connect()};
 if($('#passwordResetRequestForm'))$('#passwordResetRequestForm').onsubmit=e=>{e.preventDefault();sendPasswordReset()};
 if($('#passwordChangeForm'))$('#passwordChangeForm').onsubmit=e=>{e.preventDefault();saveNewPassword()};
 if($('#recordForm'))$('#recordForm').onsubmit=e=>{e.preventDefault();saveForm(e.target)};
 if($('#settingsForm')){
  const form=$('#settingsForm');
  form.onsubmit=e=>{e.preventDefault();saveSettings(e.target)};
  form.oninput=()=>updateSettingsPreview(form);
  if(!s.demo&&s.staff?.role!=='admin')form.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=true);
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
 if(k==='company_expenses'){bindExpenseInvoiceForm(form);return;}
 if(k==='leases'){
  document.querySelectorAll('[data-lease-mode]').forEach(button=>button.onclick=()=>{
   captureForm(form);
   if(button.dataset.leaseMode==='manual'){
    if(s.modal.leasePlanMode!=='manual'&&!s.modal.leaseDraft?.length)
     s.modal.leaseDraft=leaseInstallmentPlan(v).map(r=>({due_date:r.due_date,amount:r.amount}));
    s.modal.leasePlanMode='manual';
   }else s.modal.leasePlanMode='auto';
   render();
  });
  const add=document.querySelector('[data-lease-add-row]');
  if(add)add.onclick=()=>{
   captureForm(form);
   if(s.modal.leaseDraft.length>=30)return toast('الحد الأقصى 30 قسطاً.',true);
   s.modal.leaseDraft.push({due_date:v.start_date||today(),amount:''});
   render();
  };
  document.querySelectorAll('[data-lease-remove-row]').forEach(button=>button.onclick=()=>{
   captureForm(form);
   s.modal.leaseDraft.splice(Number(button.dataset.leaseRemoveRow),1);
   render();
  });
  document.querySelectorAll('[data-lease-draft-row] input').forEach(input=>{
   input.addEventListener('input',()=>captureLeasePlan(form));
  });
  document.querySelectorAll('[data-lease-save-due]').forEach(button=>button.onclick=()=>saveLeaseDueDate(button.dataset.leaseSaveDue,form));
  const distribute=document.querySelector('[data-lease-spread]');
  if(distribute)distribute.onclick=()=>{
   captureForm(form);
   const lease=s.modal.data,open=s.modal.leaseDraft||[];
   const locked=s.data.lease_installments.filter(x=>x.lease_id===lease.id&&Number(x.paid_amount||0)>0);
   const lockedAmount=locked.reduce((n,x)=>n+Number(x.amount||0),0);
   const total=Math.round((Number(lease.rent_total||0)-Number(lease.advance_amount||0)-lockedAmount)*100);
   if(!Number.isSafeInteger(total)||total<0)return toast('المقدم أو الأقساط المسددة أكبر من قيمة العقد الجديدة.',true);
   if(!open.length&&total>0)open.push({due_date:lease.start_date||today(),amount:0});
   if(total===0)s.modal.leaseDraft=[];
   else {
    const count=open.length,each=Math.floor(total/count),extra=total-each*count;
    s.modal.leaseDraft=open.map((row,i)=>({...row,amount:(each+(i===count-1?extra:0))/100}));
    if(s.modal.leaseDraft.some(row=>Number(row.amount)<=0))return toast('المبلغ المتبقي صغير بالنسبة لعدد الأقساط المفتوحة. احذف بعض الأقساط.',true);
   }
   render();
  };
 }
 for(const name of ['width_m','height_m','quantity']){
  const el=form.elements.namedItem(name);
  if(el)el.addEventListener('input',()=>updateAreaOutputs(form));
 }
 updateAreaOutputs(form);
 if(k==='ad_sites'){
  const number=form.elements.namedItem('site_number');
  if(number)number.addEventListener('input',()=>updateSiteCodeInput(form));
  const category=form.elements.namedItem('package_id');
  if(category)category.onchange=()=>{captureForm(form);v.package_id=category.value;updateSiteCodeInput(form)};
  updateSiteCodeInput(form);
 }
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
  for(const name of ['price','rent_total','advance_amount','amount','paid_amount','initial_payment_amount']){
   let input=form.elements.namedItem(name);
   if(input&&input.value!=='')input.value=String(roundAmount(convert(input.value,previous,next)));
  }
  if(k==='leases'&&s.modal?.leasePlanMode==='manual'){
   captureLeasePlan(form);
   s.modal.leaseDraft=s.modal.leaseDraft.map(r=>({...r,amount:String(r.amount).trim()===''?'':String(roundAmount(convert(r.amount,previous,next)))}));
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
   // The scheduled principal is in the lease's original currency and is immutable.
   if(k==='lease_installments'&&name==='amount')continue;
   const input=form.elements.namedItem(name);
   if(input&&input.value!=='')input.value=String(roundAmount(convert(input.value,previous,next)));
  }
  captureForm(form);v.entry_currency=next;updateMoneyHints();
 };
 if(k==='leases'){
  for(const field of ['rent_total','advance_amount','start_date','end_date','payment_frequency','grace_days','currency']){
   const el=form.elements.namedItem(field);
   if(el)el.addEventListener('input',()=>{
    captureForm(form);
    const preview=form.querySelector('.lease-plan-preview');
    if(preview)preview.outerHTML=leasePlanSummary(v);
   });
   if(el&&['start_date','end_date','payment_frequency','currency'].includes(field))
    el.addEventListener('change',()=>{
     captureForm(form);
     const preview=form.querySelector('.lease-plan-preview');
     if(preview)preview.outerHTML=leasePlanSummary(v);
    });
  }
 }
 const owner=form.elements.namedItem('landlord_id');
 if(owner&&k==='leases')owner.onchange=()=>{captureForm(form);v.landlord_id=owner.value;v.property_id='';render()};
 const roofSelect=form.elements.namedItem('property_id');
 if(roofSelect&&k==='leases')roofSelect.onchange=()=>{
  captureForm(form);v.property_id=roofSelect.value;render();
 };
 if(k==='leases')document.querySelectorAll('[data-lease-property]').forEach(button=>button.onclick=()=>{
  const choice=lookup('properties',button.dataset.leaseProperty);
  if(!choice||choice.landlord_id!==v.landlord_id)return toast('هذا السطح لا يتبع المالك المحدد.',true);
  captureForm(form);v.property_id=choice.id;render();
 });
 const client=form.elements.namedItem('customer_id');
 if(client&&k==='campaigns')client.onchange=()=>{
  captureForm(form);
  v.customer_id=client.value;
  render();
 };
 if(client&&k==='customer_contracts')client.onchange=()=>{
  captureForm(form);v.customer_id=client.value;
  render();
 };
 const pack=form.elements.namedItem('package_id');
 if(pack&&k==='customer_contracts')pack.onchange=()=>{
  captureForm(form);
  const p=lookup('packages',pack.value);
  v.package_id=pack.value;
  if(v.id)s.modal.contractSiteIds=(s.modal.contractSiteIds||[]).filter(id=>siteMatchesPackage(lookup('ad_sites',id),v.package_id));
  if(v.site_id&&!siteMatchesPackage(lookup('ad_sites',v.site_id),v.package_id))v.site_id='';
  if(p){v.contract_type=p.package_type;v.currency=p.currency;if(!v.id){v.duration_months=p.default_months;refreshCustomerContractQuote();}}
  render();
 };
 const linkedCampaign=form.elements.namedItem('campaign_id');
 if(linkedCampaign&&k==='customer_contracts')linkedCampaign.onchange=()=>{
  captureForm(form);
  const cam=lookup('campaigns',linkedCampaign.value);
  Object.assign(v,campaignContractData(cam));
  render();
 };
 if(pack&&k==='campaigns')pack.onchange=()=>{
  captureForm(form);
  const before=(s.modal.siteIds||[]).length;
  v.package_id=pack.value;
  s.modal.siteIds=(s.modal.siteIds||[]).filter(id=>siteMatchesPackage(lookup('ad_sites',id),v.package_id));
  const removed=before-s.modal.siteIds.length;
  if(!v.id)v.quantity=Math.max(1,s.modal.siteIds.length);
  const p=lookup('packages',v.package_id);
  if(p){v.months=p.default_months;v.currency=p.currency;v.ad_faces=campaignFaces(v,p);s.modal.autoPrice=true;refreshCampaignQuote();}
  render();
  if(removed)toast('تم إلغاء اختيار '+removed+' قطعة لا تتبع الباقة الجديدة');
 };
 const faceChoice=form.elements.namedItem('ad_faces');
 if(faceChoice&&k==='campaigns')faceChoice.onchange=()=>{
  captureForm(form);v.ad_faces=Number(faceChoice.value);
  s.modal.autoPrice=true;refreshCampaignQuote();render();
 };
 const months=form.elements.namedItem('months');
 if(months&&k==='campaigns')months.onchange=()=>{
  captureForm(form);
  v.months=Number(months.value);
  const blocked=removeUnavailableCampaignChoices(v);
  refreshCampaignQuote();
  if(blocked.length){
   s.formStep=1;render();
   toast(reservedCampaignMessage(blocked)+' — أزلناها من الاختيار، اختر قطعاً متاحة.',true);
   return;
  }
  render();
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
 if(!canAccess(TABLE_ACCESS[k]||k,row?.id?'edit':'create'))
  return toast('ليس لديك صلاحية الإضافة أو التعديل في هذا القسم.',true);
 if(k==='company_expenses'&&row?.id&&!canAccess('expenses','edit'))return toast('تعديل المصروفات يتطلب صلاحية المالية.',true);
 if(k==='employees'&&!canAccess('employees','edit'))return toast('تعديل بيانات الموظفين يتطلب صلاحية الموظفين.',true);
 const defaults={status:'inquiry',currency:s.displayCurrency,salary_currency:'IQD',salary_amount:0,
  department:'general',hired_at:'',expense_date:today(),category:'hospitality',ad_faces:2,advance_amount:0,site_type:'roadside',active:true,default_months:3,months:3,quantity:1,grace_days:0,payment_frequency:'annual',start_date:today(),paid_at:today(),due_date:today(),paid_amount:0,price:0,amount:0};
 let data={...defaults,...(row||{})};
 if(k==='employees'&&!row?.id)data.active=true;
 if(k==='campaign_payments'&&data.campaign_id)data.entry_currency=lookup('campaigns',data.campaign_id)?.currency||s.displayCurrency;
 if(k==='lease_installments'&&data.lease_id)data.entry_currency=lookup('leases',data.lease_id)?.currency||s.displayCurrency;
 if(k==='ad_sites'&&!data.package_id){
  const inferred=codedSitePackage(data.code);
  if(inferred)data.package_id=s.data.packages.find(p=>String(p.code||'').trim().toUpperCase()===inferred)?.id||'';
 }
 if(k==='campaigns')data.ad_faces=campaignFaces(data);
 if(k==='campaigns'&&data.package_id&&!row?.id){let pack=lookup('packages',data.package_id);if(pack){data.currency=row?.currency||pack.currency;data.months=Number(row?.months)>0?Number(row.months):pack.default_months;const initial=quoteCampaign(data,data.siteIds||[]);data.price=initial?initial.total:0;}}
 if(k==='customer_contracts'&&!data.id){
  const campaign=lookup('campaigns',data.campaign_id);
  if(campaign)Object.assign(data,campaignContractData(campaign));
  else Object.assign(data,{...campaignContractData(null),customer_id:data.customer_id||''});
 }
 const ids=k==='campaigns'?(data.siteIds||s.data.campaign_sites.filter(x=>x.campaign_id===data.id).map(x=>x.site_id)):[];
 const drafts={};
 if(k==='packages')packageRates(data).forEach(rate=>{drafts[rate.months]=roundAmount(convert(rate.usd_price,'USD',data.currency||'USD'));});
 s.modal={kind:'edit',table:k,data,siteIds:[...ids],roofs:k==='landlords'&&!data.id?[{}]:[],autoPrice:k==='campaigns'&&!data.id,rateDraft:drafts,rateChanged:new Set(),contractCustomerFilter:k==='customer_contracts'&&!data.id?(row?.customer_id||null):null,
 leasePlanMode:k==='leases'&&data.id?'manual':'auto',leaseDraft:k==='leases'&&data.id?s.data.lease_installments.filter(x=>x.lease_id===data.id&&!(Number(x.paid_amount)>0)).sort((a,b)=>a.due_date.localeCompare(b.due_date)).map(x=>({id:x.id,due_date:x.due_date,amount:x.amount})):[],contractSiteIds:k==='customer_contracts'&&data.id?(Array.isArray(data.campaign_sites_snapshot)?data.campaign_sites_snapshot.map(site=>site.id).filter(Boolean):[]):[]};
 if(k==='company_expenses'){
  s.modal.expenseItems=row?.id?expenseLineItems(row):[{description:'',category:'',department:'',quantity:1,unit_price:''}];
  s.modal.data.status=row?.id?expensePaymentStatus(row):'paid';
  s.modal.data.paid_amount=row?.id?expensePaidAmount(row):0;
  s.modal.transferFile=null;
 }
 s.formStep=0;render();
}
function captureForm(form){
 if(!s.modal||!form)return;
 const data=new FormData(form);
 for(let [k,v] of data.entries())if(!(v instanceof File))s.modal.data[k]=v;
 if(s.modal.table==='packages')form.querySelectorAll('[data-package-rate-month]').forEach(input=>{s.modal.rateDraft[Number(input.dataset.packageRateMonth)]=input.value;});
 const siteInputs=[...form.querySelectorAll('[data-site-id]')];
 if(siteInputs.length)s.modal.siteIds=siteInputs.filter(el=>el.checked).map(el=>el.dataset.siteId);
 if(s.modal.table==='leases')captureLeasePlan(form);
 if(s.modal.table==='customer_contracts'&&s.modal.data.id){
  s.modal.contractSiteIds=[...(form.querySelectorAll?.('[data-contract-site-id]')||[])].filter(x=>x.checked).map(x=>x.dataset.contractSiteId);
 }
}
function formValidate(k,v){
 if(k==='company_expenses'){
  if(!v.expense_date||!/^\d{4}-\d{2}-\d{2}$/.test(String(v.expense_date)))throw Error('حدد تاريخ المصروف');
  if(!String(v.title||'').trim()||String(v.title).trim().length<2)throw Error('اكتب اسم المصروف (حرفين على الأقل)');
  if(!EXPENSE_CATEGORY_LABELS[v.category])throw Error('اختر تصنيف المصروف من القائمة');
  if(!['IQD','USD'].includes(v.currency))throw Error('اختر عملة المصروف');
  if(!(Number(v.amount)>0)||!Number.isFinite(Number(v.amount)))throw Error('مبلغ المصروف يجب أن يكون أكبر من صفر');
 }
 if(k==='employees'){
  if(!String(v.name||'').trim()||!String(v.job_title||'').trim())
   throw Error('أدخل اسم الموظف ومسمّاه الوظيفي.');
  if(!['IQD','USD'].includes(v.salary_currency))throw Error('اختر عملة راتب صحيحة.');
  if(!Number.isFinite(Number(v.salary_amount))||Number(v.salary_amount)<0)
   throw Error('الراتب الشهري يجب أن يكون صفراً أو مبلغاً موجباً.');
 }
 if(k==='customers'){
  if(!/^[0-9]{11}$/.test(v.phone)||!/^[0-9]{12}$/.test(v.national_id))throw Error('الهاتف يجب أن يكون 11 رقم، والبطاقة الموحدة 12 رقم');
 }
 if(k==='properties'||(k==='packages'&&v.pricing_mode!=='sqm_month')){
  if(!(Number(v.width_m)>0&&Number(v.height_m)>0))throw Error('أدخل طول وعرض أكبر من صفر بالمتر');
 }
 if(k==='customer_contracts'){
  if(!v.id&&!v.campaign_id)throw Error('عقد الزبون الجديد يجب أن يُنشأ من حملة إعلانية محفوظة');
  const campaign=lookup('campaigns',v.campaign_id);
  if(v.campaign_id&&!campaign)throw Error('الحملة المرتبطة بالعقد غير موجودة');
  if(campaign&&!v.id){
   if(!campaign.start_date)throw Error('حدد تاريخ بدء الحملة أولاً حتى يتم تحديد مدة العقد');
   const expected=campaignContractData(campaign);
   for(const key of ['customer_id','package_id','contract_type','duration_months','site_id','currency','start_date','end_date','amount']){
    if(String(v[key]??'')!==String(expected[key]??''))throw Error('بيانات العقد يجب أن تتطابق مع الحملة؛ لا تغيّر التفاصيل المنقولة منها');
   }
   if(v.ad_faces!=null&&Number(v.ad_faces)!==expected.ad_faces)throw Error('عدد الأوجه بالعقد يجب أن يطابق الحملة المسجلة');
   if(String(v.rented_area_m2??'')!==String(expected.rented_area_m2??''))throw Error('مساحة العقد يجب أن تتطابق مع الحملة');
  }
  const customer=lookup('customers',v.customer_id),pkg=lookup('packages',v.package_id);
  if(!customer||!pkg)throw Error('اختر زبوناً وباقة إعلانية مسجلين');
  if((v.contract_type||pkg.package_type)!==pkg.package_type)throw Error('نوع عقد الزبون يجب أن يطابق نوع الباقة');
  if(!v.id&&packageRates(pkg).length&&!packageRate(pkg,v.duration_months))throw Error('مدة العقد غير مدرجة بتعرفة الباقة');
  if(!v.id&&pkg.pricing_mode==='sqm_month'&&!(Number(v.rented_area_m2)>0))throw Error('أدخل مساحة الأسطح المتعاقد عليها بالمتر المربع');
  if(v.end_date<v.start_date||!v.start_date||!v.end_date)throw Error('تأكد من تواريخ عقد الزبون');
  if(!(Number(v.amount)>=0))throw Error('مبلغ عقد الزبون غير صالح');
  if(v.campaign_id&&!v.id){const cam=lookup('campaigns',v.campaign_id);if(!cam||cam.customer_id!==v.customer_id||(cam.package_id&&cam.package_id!==v.package_id))throw Error('الحملة المختارة يجب أن تكون لنفس الزبون والباقة');}
  if(!v.id&&v.site_id&&!siteMatchesPackage(lookup('ad_sites',v.site_id),v.package_id))throw Error('موقع عقد الزبون لا يتبع الباقة الإعلانية المختارة');
 }
 if(['landlords','customers'].includes(k)&&v.alternate_phone&&!/^[0-9]{11}$/.test(v.alternate_phone))throw Error('الهاتف البديل يجب أن يكون 11 رقم');
 if(k==='landlords'&&(!/^[0-9]{11}$/.test(v.phone)||(v.national_id&&!/^[0-9]{12}$/.test(v.national_id))))throw Error('هاتف المالك 11 رقم، ورقم البطاقة عند إدخاله 12 رقم');
 if(k==='ad_sites'){
  if(v.site_type==='rooftop'&&!v.rooftop_property_id)throw Error('موقع السطح لازم تربطه بعقار مسجل عند مالك');
  const classified=lookup('packages',v.package_id);
  if(!classified)throw Error('حدد باقة الموقع الإعلاني A أو B أو C أو D أو E');
  const prefix=codedSitePackage(v.code);
  if(prefix&&String(classified.code||'').trim().toUpperCase()!==prefix)throw Error('رمز القطعة '+v.code+' لا يطابق الباقة '+classified.code+' المحددة');
  if(!siteCodeForPackage(v.code,v.package_id))throw Error('اكتب رقم القطعة بالأرقام فقط، مثلاً 1 ليصبح A-1');
  if(v.id&&s.data.campaign_sites.some(link=>link.site_id===v.id&&lookup('campaigns',link.campaign_id)?.package_id&&lookup('campaigns',link.campaign_id).package_id!==v.package_id))
   throw Error('القطعة مرتبطة بحملة من باقة أخرى. غيّر مواقع تلك الحملة قبل تعديل باقة القطعة.');
 }
 if(k==='campaigns'){
  const pkg=lookup('packages',v.package_id);
  if(pkg&&packageRates(pkg).length){
   if(!packageRate(pkg,v.months))throw Error('هذه المدة غير مسعّرة في الباقة. اختر مدة من الخيارات الرسمية.');
   if(pkg.pricing_mode==='sqm_month'){
    const selected=s.modal?.siteIds||[],roofs=selectedRooftopAreas(selected);
    if(!selected.length)throw Error('اختَر سطحاً إعلانياً من الباقة E، فالمساحة تُؤخذ من قياس السطح المسجل');
    if(roofs.invalid.length)throw Error('لا يمكن احتساب مساحة الباقة E للقطع: '+roofs.invalid.join('، ')+'؛ اربط كل قطعة بسطح ذي قياس صحيح');
    if(!(roofs.area>0))throw Error('مساحة السطح المسجل غير صحيحة، صحّح الطول والعرض في قسم الأسطح');
   }
  }
  if(!lookup('customers',v.customer_id))throw Error('اختر عميلاً مسجلاً أولاً');
  if(!v.start_date||!/^\d{4}-\d{2}-\d{2}$/.test(String(v.start_date)))throw Error('حدد تاريخ بدء الحملة قبل حفظها');
  if(!pkg)throw Error('حدد نوع الإعلان والباقة A إلى E عند إنشاء الحملة');
  if(!s.modal.siteIds?.length&&!String(v.locations||'').trim())throw Error('حدد موقعاً إعلانياً مسجلاً أو أضف موقعاً في الملاحظات النصية');
  if(s.modal.siteIds?.some(id=>!lookup('ad_sites',id)))throw Error('أحد المواقع المختارة غير مسجل');
  if(s.modal.siteIds?.some(id=>!siteMatchesPackage(lookup('ad_sites',id),v.package_id)))throw Error('بعض القطع المختارة لا تتبع الباقة '+pkg.code+'، اختر قطعاً من نفس الباقة فقط');
  if(!(Number(v.months)>0)||Number(v.price)<0)throw Error('أدخل عدد أشهر وسعراً صحيحين');
  if(v.next_payment_due_date&&(!/^\d{4}-\d{2}-\d{2}$/.test(String(v.next_payment_due_date))||v.next_payment_due_date<v.start_date))throw Error('موعد الدفعة القادمة لازم يكون بتاريخ صحيح بعد بداية الحملة');
  if(Number(v.initial_payment_amount||0)>Number(v.price))throw Error('الدفعة الأولى أكبر من سعر الحملة');
  if(v.id&&Number(v.price)<campaignPaid(v.id))throw Error('سعر الحملة أقل من الدفعات المسددة سابقاً');
  const old=lookup('campaigns',v.id);
  if(old&&old.currency!==v.currency&&s.data.campaign_payments.some(x=>x.campaign_id===v.id))throw Error('لا يمكن تغيير عملة حملة لها دفعات محفوظة. استخدم تحويل العرض بالأعلى.');
 }
 if(k==='campaign_payments'){
  const campaign=lookup('campaigns',v.campaign_id);
  if(!campaign)throw Error('اختر حملة مسجلة أولاً');
  const original=v.id?lookup('campaign_payments',v.id):null;
  if(original&&original.campaign_id!==v.campaign_id)throw Error('لا يمكن نقل دفعة قديمة إلى حملة أخرى');
  if(!(Number(v.amount)>0))throw Error('الدفعة يجب أن تكون أكبر من الصفر');
  const others=s.data.campaign_payments.filter(x=>x.campaign_id===v.campaign_id&&x.id!==v.id).reduce((a,x)=>a+Number(x.amount),0);
  if(Number(v.amount)>Number(campaign.price)-others+0.001)throw Error('قيمة الدفعة أكبر من رصيد الحملة المتبقي');
 }
 if(k==='leases'){
  const property=lookup('properties',v.property_id);
  if(!property||property.landlord_id!==v.landlord_id)throw Error('العقار المختار لا يتبع المالك المسجل');
  if(!v.start_date||!v.end_date||v.end_date<v.start_date)throw Error('تأكد من بداية العقد ونهايته');
  if(!Number.isFinite(Number(v.rent_total))||Number(v.rent_total)<0)throw Error('إجمالي الإيجار غير صالح');
  if(!Number.isFinite(Number(v.advance_amount||0))||Number(v.advance_amount||0)<0||Number(v.advance_amount||0)>Number(v.rent_total))throw Error('المبلغ المقدم يجب أن يكون من صفر إلى إجمالي الإيجار');
  const old=lookup('leases',v.id);
  if(old&&!s.demo&&s.staff?.role!=='admin'&&['rent_total','advance_amount','currency','start_date','end_date','grace_days','payment_frequency'].some(field=>String(old[field])!==String(v[field])))throw Error('تغيير شروط عقد السطح المالية أو مدة العقد مع الأقساط يتطلب حساب المدير الرئيسي.');
 }
 if(k==='lease_installments'){
  if(!lookup('leases',v.lease_id))throw Error('اختر عقداً مسجلاً أولاً');
  if(!Number.isFinite(Number(v.amount))||!Number.isFinite(Number(v.paid_amount))||Number(v.amount)<0||Number(v.paid_amount)<0||Number(v.paid_amount)>Number(v.amount))throw Error('المسدد لا يجوز أن يتجاوز قيمة القسط');
 }
}
function clean(k,v){
 let fields=k==='campaign_payments'?['campaign_id','paid_at','amount','notes']:k==='lease_installments'?['lease_id','due_date','amount','paid_amount','notes']:defs[k].fields.filter(x=>!['file','computed'].includes(x[2])).map(x=>x[0]);
 if(k==='leases')fields.push('renewed_from');

 let o={};
 fields.forEach(f=>{if(v[f]!==undefined){
  let val=v[f];
  // Never send an empty string into PostgreSQL numeric columns.
  // A blank optional numeric field must be null (not the invalid numeric value "").
  const numericField=defs[k]?.fields.some(field=>field[0]===f&&field[2]==='number')||
   (['campaign_payments','lease_installments'].includes(k)&&['amount','paid_amount'].includes(f));
  if(numericField&&(val===''||val===null))val=null;
  if(numericField&&val!==null&&(!Number.isFinite(Number(val))))throw Error('قيمة رقمية غير صالحة في '+f);
  if(val===''&&['alternate_phone','national_id','notes','landmark','card_image_path','package_id','rooftop_property_id','renewed_from','next_payment_due_date','company_representative','landlord_representative','locations','hired_at','phone'].includes(f))val=null;
  if(f==='active')val=(val===true||val==='true');
  if(f==='ad_faces'&&val!==null)val=Number(val);
  o[f]=val;
 }});
 if(k==='landlords'&&v.card_image_path)o.card_image_path=v.card_image_path;
 if(k==='properties'&&v.width_m&&v.height_m)o.dimensions=v.width_m+' × '+v.height_m+' m';
 if(k==='customer_contracts'){
  o.contract_type=lookup('packages',v.package_id)?.package_type||v.contract_type||'cabin';
  if(v.ad_faces!==undefined&&v.ad_faces!==null)o.ad_faces=campaignFaces(v);
  if(v.id){for(const key of ['campaign_title_snapshot','campaign_quantity_snapshot','campaign_locations_snapshot','campaign_notes_snapshot','package_dimensions_snapshot','package_specifications_snapshot'])if(v[key]!==undefined)o[key]=key==='campaign_quantity_snapshot'?Number(v[key]):v[key];}
 }
 return o;
}

async function persist(k,o,id){
 if(s.demo){
  if(k==='leases'&&!id&&!o.contract_number)o.contract_number='RA-'+serial4(1+Math.max(0,...s.data.leases.map(x=>Number((x.contract_number||'').replace('RA-',''))||0)));
  if(k==='campaign_payments'&&!id)o.receipt_number=serial4(1+Math.max(0,...s.data.campaign_payments.map(x=>Number(x.receipt_number)||0)));
  if(k==='customer_contracts'&&!id){
   Object.assign(o,campaignContractData(lookup('campaigns',o.campaign_id)));
   o.contract_number='RC-'+serial4(1+Math.max(0,...s.data.customer_contracts.map(x=>Number((x.contract_number||'').replace('RC-',''))||0)));
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
function leaseInstallmentPlan(v){
 const start=String(v.start_date||''),end=String(v.end_date||'');
 if(!start||!end||end<start)return [];
 const original=Math.round(Number(v.rent_total||0)*100);
 const upfront=Math.round(Number(v.advance_amount||0)*100);
 if(!Number.isFinite(original)||!Number.isFinite(upfront)||upfront<0||upfront>original)return [];
 const remaining=original-upfront;
 if(remaining===0)return []; // fully paid at signing; nothing left to schedule
 const interval=v.payment_frequency==='semiannual'?6:12;
 const dueDates=[];
 // A contract lasting one calendar year, or just a few days beyond it, has
 // two half-yearly installments or one yearly installment. An extra period
 // is created only when the end is >31 days past the next anniversary.
 const lastAdvanceBoundary=addDays(end,-31);
 for(let i=0;i<120;i++){
  const anniversary=plusMonths(start,i*interval);
  if(i>0&&anniversary>lastAdvanceBoundary)break;
  dueDates.push(addDays(anniversary,Number(v.grace_days||0)));
 }
 const count=Math.max(1,dueDates.length),base=Math.floor(remaining/count),rest=remaining-base*count;
 return dueDates.map((date,i)=>({lease_id:v.id,due_date:date,amount:(base+(i===count-1?rest:0))/100,paid_amount:0}));
}
function validateManualLeasePlan(lease,rows){
 if(!lease.start_date||!lease.end_date||lease.end_date<lease.start_date)
  throw Error('تأكد من تواريخ بداية ونهاية عقد الإيجار.');
 const total=Math.round(Number(lease.rent_total)*100),advance=Math.round(Number(lease.advance_amount||0)*100);
 if(!Number.isSafeInteger(total)||!Number.isSafeInteger(advance)||total<0||advance<0||advance>total)
  throw Error('قيمة الإيجار والمقدم غير صالحة.');
 if(!Array.isArray(rows)||rows.length>30)throw Error('الحد الأقصى 30 قسطاً.');
 const due=total-advance;
 if(!due&&rows.length)throw Error('المقدم يغطي كامل الإيجار. احذف الأقساط اليدوية.');
 if(due&&!rows.length)throw Error('أدخل قسطاً واحداً على الأقل للمتبقي من الإيجار.');
 const plan=rows.map((r,i)=>{
  const date=String(r.due_date||''),raw=String(r.amount??'').trim(),cents=Math.round(Number(raw)*100);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z'))||
     new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)
   throw Error('حدد تاريخاً صحيحاً للقسط '+serial4(i+1));
  if(!raw||!Number.isSafeInteger(cents)||cents<=0)throw Error('راجع مبلغ القسط '+serial4(i+1));
  return {...(r.id?{id:r.id}:{}),due_date:date,amount:cents/100};
 });
 const sum=plan.reduce((n,r)=>n+Math.round(r.amount*100),0);
 if(sum!==due)throw Error('مجموع الأقساط ('+money(sum/100,lease.currency)+
  ') يجب أن يساوي المتبقي بعد المقدم ('+money(due/100,lease.currency)+').');
 return plan.sort((a,b)=>a.due_date.localeCompare(b.due_date));
}
function captureLeasePlan(form){
 if(s.modal?.table!=='leases'||s.modal.leasePlanMode!=='manual')return;
 s.modal.leaseDraft=[...(form?.querySelectorAll?.('[data-lease-draft-row]')||[])].map(row=>({
  ...(row.dataset?.leaseSavedId?{id:row.dataset.leaseSavedId}:{}),
  due_date:row.querySelector('[data-lease-due]')?.value||'',
  amount:row.querySelector('[data-lease-amount]')?.value??''
 }));
}
async function generateInstallments(v,customPlan=null){
 const previous=s.data.lease_installments.filter(x=>x.lease_id===v.id);
 if(previous.length)throw Error('أقساط هذا العقد موجودة مسبقاً. لن ننشئ أقساط مكررة.');
 const plan=customPlan===null?leaseInstallmentPlan(v):
  validateManualLeasePlan(v,customPlan).map(row=>({
   lease_id:v.id,due_date:row.due_date,amount:row.amount,paid_amount:0
  }));
 for(const record of plan)await persist('lease_installments',record);
 return plan;
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

async function showExpenseTransferProof(id){
 const expense=lookup('company_expenses',id);
 if(!expense?.transfer_proof_path||s.demo||!s.client)return toast('لا توجد صورة تحويل محفوظة لهذا السجل.',true);
 const popup=typeof window!=='undefined'?window.open('','_blank'):null;
 if(popup){popup.document.title='مرفق الفاتورة';popup.document.body.textContent='جارٍ فتح المرفق الخاص...';}
 try{
  const {data,error}=await s.client.storage.from('expense-transfers').createSignedUrl(expense.transfer_proof_path,90);
  if(error||!data?.signedUrl)throw Error(error?.message||'تعذر إصدار رابط المرفق');
  if(popup&&!popup.closed)popup.location.href=data.signedUrl;
  else window.open(data.signedUrl,'_blank','noopener,noreferrer');
 }catch(e){
  if(popup&&!popup.closed)popup.close();
  toast('تعذر عرض مرفق التحويل: '+(e.message||String(e)),true);
 }
}
async function saveExpenseInvoice(form){
 const modal=s.modal;
 if(modal?.table!=='company_expenses'||s.savingExpense)return;
 if(modal.data.id&&!canAccess('expenses','edit'))return toast('تعديل الفواتير يتطلب صلاحية المصروفات.',true);
 captureExpenseDraft(form);
 const v=modal.data;
 const items=(modal.expenseItems||[]).map(item=>({
  description:String(item.description||'').trim(),
  category:String(item.category||'').trim(),
  department:String(item.department||'').trim(),
  quantity:Number(item.quantity),unit_price:Number(item.unit_price)
 }));
 const values={...v,id:v.id,receipt_number:String(v.receipt_number||'').trim(),
  status:form.elements.namedItem('expense_payment_status')?.value||'',
  payment_method:form.elements.namedItem('payment_method')?.value||''};
 let details,file=modal.transferFile||form.elements.namedItem('transfer_image')?.files?.[0]||null;
 try{
  details=expenseInvoiceValidated(values,items);
  if(file&&(!['image/png','image/jpeg','image/webp'].includes(file.type)||
     file.size>5242880||file.size<=0))throw Error('صيغة صورة التحويل يجب أن تكون PNG أو JPG أو WebP وبحجم لا يتجاوز 5 ميغابايت.');
  if(values.payment_method==='mastercard'&&details.paid_amount>0&&!file&&!v.transfer_proof_path)
   throw Error('يرجى إرفاق صورة تحويل الماستر كارد قبل اعتماد السداد.');
 }catch(e){toast(e.message||String(e),true);return}
 const title=String(v.title||'').trim()||('فاتورة: '+items[0].description+(items.length>1?' + '+(items.length-1)+' أصناف':''));
 if(title.length<2||title.length>200)return toast('وصف الفاتورة يجب ألا يتجاوز 200 حرف.',true);
 s.savingExpense=true;
 const submit=form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;
 let uploaded=null;
 try{
  if(file&&values.payment_method==='mastercard'&&details.paid_amount>0&&!s.demo){
   if(!s.client||!s.session?.user?.id)throw Error('يجب تسجيل الدخول لرفع صورة التحويل.');
   const extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[file.type];
   uploaded=s.session.user.id+'/'+uid()+'.'+extension;
   const {error}=await s.client.storage.from('expense-transfers').upload(uploaded,file,{
    upsert:false,contentType:file.type,cacheControl:'60'
   });
   if(error)throw Error('تعذر رفع صورة التحويل: '+error.message);
  }
  const proof=values.payment_method==='mastercard'&&details.paid_amount>0?
   (uploaded||v.transfer_proof_path||(s.demo&&file?'preview-only':null)):null;
  const record={
   expense_date:values.expense_date,title,category:items[0].category,
   amount:details.amount,currency:values.currency,
   paid_by:values.paid_by,receipt_number:values.receipt_number||null,
   payment_method:values.payment_method,paid_amount:details.paid_amount,
   employee_id:null,
   expense_items:items,transfer_proof_path:proof,
   notes:String(values.notes||'').trim()||null
  };
  const oldProof=String(v.transfer_proof_path||'');
  await persist('company_expenses',record,v.id);
  if(!s.demo&&oldProof&&oldProof!==proof){
   try{
    const {error:cleanup}=await s.client.storage.from('expense-transfers').remove([oldProof]);
    if(cleanup)toast('تم حفظ الفاتورة، وتعذر تنظيف المرفق السابق: '+cleanup.message,true);
   }catch(error){toast('تم حفظ الفاتورة، ولكن تعذر تنظيف المرفق السابق: '+(error?.message||String(error)),true);}
  }
  const returnToEmployees=Boolean(modal.salaryFromEmployee);
  s.modal=null;s.view=returnToEmployees?'employees':'company_expenses';s.search='';s.expenseCategory='';
  if(s.demo)render();else await load();
  toast('تم اعتماد الفاتورة وتحديث أرصدة السداد بنجاح.');
 }catch(e){
  if(!s.demo&&uploaded){
   try{await s.client.storage.from('expense-transfers').remove([uploaded]);}catch(_){}
  }
  toast('تعذر حفظ الفاتورة: '+(e.message||String(e)),true);
 }finally{
  s.savingExpense=false;
  if(submit&&submit.isConnected)submit.disabled=false;
 }
}

async function saveForm(form){
 if(!s.modal)return;
 const m=s.modal,k=m.table;
 if(!canAccess(TABLE_ACCESS[k]||k,m.data?.id?'edit':'create'))
  return toast('ليس لديك صلاحية حفظ التغييرات في هذا القسم.',true);
 // The structured invoice form has independent line items and attachment state.
 if(k==='company_expenses'&&form.querySelectorAll?.('[data-expense-item]')?.length)return saveExpenseInvoice(form);
 captureForm(form);
 if(k==='leases')captureLeasePlan(form);
 if(k==='landlords')captureRoofDrafts();
 let v=m.data;
 // Recompute the auto-quoted amount from the actual selected sites before the final save.
 // This also covers a user going directly to review after choosing an E rooftop.
 if(k==='campaigns'&&m.autoPrice&&s.formStep===4)refreshCampaignQuote();
 if(k==='campaigns'&&s.formStep<4){
  refreshCampaignQuote();
  if(s.formStep>=1){
   const blocked=removeUnavailableCampaignChoices(v);
   if(blocked.length){
    s.formStep=1;
    refreshCampaignQuote();
    render();
    toast(reservedCampaignMessage(blocked)+' — تم إلغاء اختيارها، اختر قطعاً أخرى.',true);
    return;
   }
  }
  if(s.formStep===1&&!lookup('packages',v.package_id)){toast('اختَر الباقة الإعلانية أولاً',true);return;}
  if(s.formStep===1&&m.siteIds?.some(id=>!siteMatchesPackage(lookup('ad_sites',id),v.package_id))){toast('القطع المختارة لا تتبع الباقة المحددة، صحّح اختيار المواقع',true);return;}
  if(s.formStep===1&&lookup('packages',v.package_id)?.pricing_mode==='sqm_month'&&(!m.siteIds?.length||selectedRooftopAreas(m.siteIds).invalid.length)){
   toast('الباقة E تتطلب اختيار سطح مرتبط بعقار له قياس صحيح؛ لا تحتاج إدخال الأمتار يدوياً',true);return;
  }
  if(s.formStep===1&&!m.siteIds?.length&&!String(v.locations||'').trim()){
   toast('حدد موقعاً من القائمة أو أدخل موقعاً إضافياً قبل المتابعة',true);return;
  }
  s.formStep++;render();return;
 }
 try{
  const normalized={...v};
  if(k==='ad_sites'){
   normalized.code=siteCodeForPackage(v.code,v.package_id);
   if(!normalized.code)throw Error('اختَر فئة A–E واكتب رقم القطعة فقط، مثلاً A-1');
   const already=s.data.ad_sites.find(site=>site.id!==v.id&&
    siteCodeForPackage(site.code,sitePackageId(site))===normalized.code);
   if(already)throw Error('رمز القطعة '+normalized.code+' موجود مسبقاً. اختر رقماً آخر.');
  }
  if(k==='leases')normalized.advance_amount=v.advance_amount===''||v.advance_amount==null?0:Number(v.advance_amount);
  if(k==='campaigns'){
   const pkg=lookup('packages',v.package_id);
   const localConflicts=reservedCampaignChoices(normalized,m.siteIds||[]);
   if(localConflicts.length)throw Error(reservedCampaignMessage(localConflicts));
   // A different administrator may have saved a booking after this wizard opened.
   // Always re-read availability; database triggers handle the final race.
   const serverConflicts=await freshCampaignConflicts(normalized,m.siteIds||[]);
   if(serverConflicts.length)throw Error(reservedCampaignMessage(serverConflicts));
   normalized.ad_faces=campaignFaces(v,pkg);
   if(pkg?.pricing_mode==='sqm_month'){
    const chosen=selectedRooftopAreas(m.siteIds||[]);
    if(!(chosen.area>0)||!m.siteIds?.length||chosen.invalid.length)
     throw Error('اختَر قطع الباقة E المرتبطة بأسطح مسجّلة لها مساحة صحيحة');
    normalized.requested_area_m2=chosen.area;
    normalized.quantity=Math.max(1,m.siteIds.length);
   }else{
    normalized.requested_area_m2=null;
   }
  }
  if(k==='customer_contracts'&&!v.id){
   const cam=lookup('campaigns',v.campaign_id);
   if(!cam)throw Error('اختَر حملة إعلانية محفوظة قبل إنشاء عقد الزبون');
   if(!cam.start_date)throw Error('حدد تاريخ بدء الإعلان داخل الحملة أولاً حتى تنتقل تواريخها للعقد');
   Object.assign(normalized,campaignContractData(cam));
   Object.assign(v,campaignContractData(cam));
  }
  if(k==='campaign_payments'||k==='lease_installments'){
   const target=k==='campaign_payments'?lookup('campaigns',v.campaign_id)?.currency:lookup('leases',v.lease_id)?.currency;
   if(target){
    const source=v.entry_currency||target;
    if(k==='lease_installments'){
     const previous=lookup('lease_installments',v.id);
     if(!previous)throw Error('سجّل القسط من عقده أولاً');
     if(String(v.lease_id)!==String(previous.lease_id)||
        String(v.due_date)!==String(previous.due_date)||
        Number(v.amount)!==Number(previous.amount))throw Error('لا يجوز تغيير قيمة أو تاريخ القسط المجدول من نافذة التسديد');
     normalized.amount=Number(previous.amount);
     normalized.due_date=previous.due_date;
     normalized.paid_amount=roundAmount(convert(v.paid_amount,source,target));
    }else normalized.amount=roundAmount(convert(v.amount,source,target));
   }
  }
  formValidate(k,normalized);
  const customLeasePlan=k==='leases'&&!v.id&&m.leasePlanMode==='manual'?
    validateManualLeasePlan(normalized,m.leaseDraft||[]):null;
  if(k==='landlords'){
   if(!v.id&&!m.roofs.length)throw Error('سجّل على الأقل سطحاً واحداً للمالك مع قياسه');
   for(const roof of m.roofs){
    if(!roof.title?.trim()||!(Number(roof.width_m)>0)||!(Number(roof.height_m)>0)||!(Number(roof.quantity||1)>0))throw Error('أدخل اسم وطول وعرض كل سطح من الأسطح المضافة بشكل صحيح');
   }
  }
  let o=clean(k,normalized);
  if(k==='customer_contracts'&&v.id){
   if(o.campaign_quantity_snapshot===undefined||o.campaign_quantity_snapshot===null||o.campaign_quantity_snapshot==='')o.campaign_quantity_snapshot=Math.max(1,(m.contractSiteIds||[]).length);
   if(!Number.isInteger(Number(o.campaign_quantity_snapshot))||Number(o.campaign_quantity_snapshot)<1)throw Error('عدد القطع يجب أن يكون واحداً على الأقل');
   const previousIds=(Array.isArray(lookup('customer_contracts',v.id)?.campaign_sites_snapshot)?lookup('customer_contracts',v.id).campaign_sites_snapshot:[]).map(row=>row.id).filter(Boolean);
   const currentIds=m.contractSiteIds||[];
   if(currentIds.length!==previousIds.length||currentIds.some((id,i)=>id!==previousIds[i])){
    o.campaign_sites_snapshot=currentIds.map(id=>lookup('ad_sites',id)).filter(Boolean).map(site=>({
     id:site.id,code:site.code,name:site.name,address:site.address,governorate:site.governorate,site_type:site.site_type
    }));
   }
  }
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
  let saved;
  if(k==='leases'&&v.id&&(s.demo||s.staff?.role==='admin')){
   const previous=lookup('leases',v.id),all=s.data.lease_installments.filter(x=>x.lease_id===v.id);
   const locked=all.filter(x=>Number(x.paid_amount||0)>0);
   const paidScheduled=locked.reduce((sum,row)=>sum+Number(row.amount||0),0);
   const prepared=validateManualLeasePlan({...normalized,advance_amount:Number(normalized.advance_amount||0)+paidScheduled},m.leaseDraft||[]);
   const previousOpen=all.filter(x=>!Number(x.paid_amount||0));
   const changedSchedule=prepared.length!==previousOpen.length||prepared.some(row=>{
    const old=previousOpen.find(x=>x.id===row.id);
    return !old||old.due_date!==row.due_date||Math.round(Number(old.amount)*100)!==Math.round(Number(row.amount)*100);
   });
   const changedTerms=['rent_total','advance_amount','currency','start_date','end_date','grace_days','payment_frequency'].some(
    field=>String(previous?.[field]??'')!==String(normalized[field]??''));
   const plan=changedSchedule||changedTerms?prepared:null;
   if(!s.demo){
    const {data,error}=await s.client.rpc('raafat_save_lease_amendment',{
     p_lease_id:v.id,p_values:o,p_schedule:plan
    });
    if(error||!data?.updated)throw Error(error?.message||'تعذر تأكيد تعديل عقد السطح وأقساطه.');
    saved={...previous,...o,id:v.id};
   }else{
    saved=await persist(k,o,v.id);
    if(plan){
     s.data.lease_installments=s.data.lease_installments.filter(x=>
      x.lease_id!==v.id||Number(x.paid_amount||0)>0);
     for(const row of plan)s.data.lease_installments.push({
      ...(previousOpen.find(x=>x.id===row.id)||{}),id:row.id||uid(),lease_id:v.id,
      due_date:row.due_date,amount:row.amount,paid_amount:0
     });
    }
   }
  }else saved=await persist(k,o,v.id);
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
   try{await generateInstallments(saved,customLeasePlan)}
   catch(e){toast('تم إنشاء العقد لكن بعض الأقساط لم تُنشأ: '+e.message,true)}
  }
  s.modal=null;
  if(s.demo){s.view=k;render()}else await load();
  toast('تم حفظ السجل وربطه بنجاح');
 }catch(e){toast(e.message||String(e),true)}
}

async function saveSettings(form){
 if(!canAccess('settings','edit'))return toast('تغيير إعدادات الشركة يتطلب صلاحية الإعدادات.',true);
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
  if(s.temporaryLogoUrl){URL.revokeObjectURL(s.temporaryLogoUrl);s.temporaryLogoUrl=null;}
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
  headers=['الاسم','الهاتف','الهاتف البديل','رقم البطاقة الموحدة','الحالة','الملاحظات'];
  data=rows.map(x=>[x.name,x.phone,x.alternate_phone,x.national_id,labels[x.status]||x.status,x.notes]);
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
 if(a==='logout'){inventory.stopPolling();if(s.client&&s.realtimeChannel)s.client.removeChannel(s.realtimeChannel);s.realtimeChannel=null;if(s.client)s.client.auth.signOut();s.session=null;s.staff=null;s.demo=false;s.modal=null;s.error='';return render()}
 if(a==='prevStep'){captureForm($('#recordForm'));s.formStep=Math.max(0,s.formStep-1);return render()}
 if(a==='print')return window.print();
 if(a==='exportCustomers')return exportCsv('customers');
 if(a==='exportCampaigns')return exportCsv('campaigns');
 if(a==='exportInstallments')return exportCsv('lease_installments');
}
bootstrap();
