import { createClient } from 'npm:@supabase/supabase-js@2.95.0';

const URL_VALUE=Deno.env.get('SUPABASE_URL')??'';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const SITE='https://noone07710-sys.github.io/raafatSys/';
const MODULES=new Set(['customers','packages','campaigns','customer_contracts','ad_sites','campaign_payments','landlords','leases','expenses','employees','payroll','reports','activity_logs','settings','inventory']);
const VALID_PERMISSIONS=new Set([...MODULES].flatMap(module=>[module+'.read',module+'.edit']));
const headers={ 'Access-Control-Allow-Origin':'https://noone07710-sys.github.io',
 'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
 'Access-Control-Allow-Methods':'POST,OPTIONS', 'Vary':'Origin',
 'Content-Type':'application/json; charset=utf-8' };
const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const admin=createClient(URL_VALUE,SERVICE,{auth:{autoRefreshToken:false,persistSession:false}});
function allowed(input:unknown):string[]{
 if(!Array.isArray(input))throw new Error('اختر الصلاحيات من القائمة.');
 const unique=[...new Set(input.filter((x):x is string=>typeof x==='string'))];
 if(unique.some(x=>!VALID_PERMISSIONS.has(x)))throw new Error('توجد صلاحية غير معتمدة.');
 if(unique.includes('payroll.edit')&&!unique.includes('employees.read'))unique.push('employees.read');
 if(unique.length===0)throw new Error('حدد صلاحية واحدة على الأقل.');
 return unique;
}
async function inviteStaff(email:string,name:string,permissions:string[]){
 const normalized=email.trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)||normalized.length>254)throw Error('البريد الإلكتروني غير صالح.');
 let userId:string|undefined;
 const invited=await admin.auth.admin.inviteUserByEmail(normalized,{redirectTo:SITE,data:{display_name:name}});
 if(invited.data?.user?.id)userId=invited.data.user.id;
 else if(invited.error?.message?.toLowerCase().includes('already')){
  // An existing Auth user can be granted a customized role by the superadmin.
  for(let page=1;page<=30&&!userId;page++){
   const result=await admin.auth.admin.listUsers({page,perPage:200});
   if(result.error)throw result.error;
   const existing=(result.data?.users||[]).find(u=>u.email?.toLowerCase()===normalized);
   if(existing)userId=existing.id;
   if((result.data?.users||[]).length<200)break;
  }
 }else if(invited.error)throw invited.error;
 if(!userId)throw Error('تعذر إرسال الدعوة أو إيجاد الحساب. راجع البريد وإعدادات البريد في Supabase.');
 const prior=await admin.from('staff_members').select('role').eq('user_id',userId).maybeSingle();
 if(prior.error)throw prior.error;
 if(prior.data?.role==='admin')throw Error('لا يمكن تغيير صلاحيات المدير الرئيسي من هذه النافذة.');
 const update=await admin.from('staff_members').upsert({
  user_id:userId,role:'custom_admin',active:true,permissions,email:normalized,
  display_name:name.trim().slice(0,100)
 },{onConflict:'user_id'}).select('user_id,email,display_name,role,active,permissions').single();
 if(update.error)throw update.error;
 return {staff:update.data,invited:!!invited.data?.user?.id};
}

const INTERNAL_LOGIN=/^[a-z][a-z0-9._-]{0,62}@raafat$/i;
function internalEmail(raw:unknown):string{
 const login=String(raw||'').trim().toLowerCase();
 if(!INTERNAL_LOGIN.test(login)||login.includes('..')||/[._-]@raafat$/.test(login))
  throw Error('اكتب اسم الدخول بهذا الشكل: ahmed@raafat (حروف إنكليزية وأرقام).');
 // The reserved .example domain is never a real mailbox; only this server sees it.
 return login+'.example';
}
function securePassword(raw:unknown):string{
 const pass=String(raw||'');
 if(pass.length<12||pass.length>128)throw Error('الرمز السري يجب أن يكون من 12 إلى 128 حرفاً.');
 return pass;
}
async function managedCustomAdmin(userId:unknown){
 const id=String(userId||'');
 if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('معرّف الحساب غير صالح.');
 const {data,error}=await admin.from('staff_members').select('user_id,role,active,permissions,email,display_name').eq('user_id',id).maybeSingle();
 if(error)throw error;
 if(data?.role!=='custom_admin')throw Error('هذا الإجراء متاح للحسابات ذات الصلاحيات المخصصة فقط.');
 return data;
}
async function createInternalStaff(rawLogin:unknown,rawPassword:unknown,rawName:unknown,permissions:string[]){
 const email=internalEmail(rawLogin),password=securePassword(rawPassword);
 const name=(String(rawName||'').trim()||email.split('@')[0]).slice(0,100);
 const created=await admin.auth.admin.createUser({
  email,password,email_confirm:true,user_metadata:{display_name:name}
 });
 if(created.error)throw Error(created.error.message?.toLowerCase().includes('already')?
  'اسم الدخول مستخدم مسبقاً. اختر اسماً مختلفاً.':'تعذّر إنشاء الحساب: '+created.error.message);
 const userId=created.data.user?.id;
 if(!userId)throw Error('تعذّر الحصول على معرّف الحساب الجديد.');
 try{
  const {data,error}=await admin.from('staff_members').insert({
   user_id:userId,role:'custom_admin',active:true,permissions,email,display_name:name
  }).select('user_id,email,display_name,role,active,permissions').single();
  if(error)throw error;
  return {staff:data,created:true};
 }catch(e){
  // Avoid leaving an unprivileged, orphaned Auth account after DB failure.
  await admin.auth.admin.deleteUser(userId);
  throw e;
 }
}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return respond({error:'Method not allowed'},405);
 try{
  const bearer=req.headers.get('authorization')||'';
  const token=bearer.startsWith('Bearer ')?bearer.slice(7):'';
  if(!token)return respond({error:'يرجى تسجيل الدخول.'},401);
  const auth=await admin.auth.getUser(token);
  if(auth.error||!auth.data?.user?.id)return respond({error:'جلسة غير صالحة.'},401);
  const role=await admin.from('staff_members').select('role,active').eq('user_id',auth.data.user.id).maybeSingle();
  if(role.error||!role.data?.active||role.data.role!=='admin')
   return respond({error:'إدارة المستخدمين والصلاحيات متاحة للمدير الرئيسي فقط.'},403);
  const body=await req.json();
  const action=String(body?.action||'');
  if(action==='list'){
   const {data,error}=await admin.from('staff_members')
    .select('user_id,email,display_name,role,active,permissions,created_at').order('created_at',{ascending:false});
   if(error)throw error;
   const rows=await Promise.all((data||[]).slice(0,250).map(async(row)=>{
    if(row.email)return row;
    const result=await admin.auth.admin.getUserById(row.user_id);
    return {...row,email:result.data.user?.email||''};
   }));
   return respond({staff:rows});
  }

  if(action==='create_internal'){
   const permissions=allowed(body.permissions);
   const row=await createInternalStaff(body.email,body.password,body.displayName,permissions);
   return respond(row);
  }
  if(action==='set_password'){
   const row=await managedCustomAdmin(body.userId);
   const password=securePassword(body.password);
   const result=await admin.auth.admin.updateUserById(row.user_id,{password});
   if(result.error)throw result.error;
   return respond({updated:true});
  }
  if(action==='set_active'){
   const row=await managedCustomAdmin(body.userId);
   if(typeof body.active!=='boolean')return respond({error:'حالة الحساب غير صحيحة.'},400);
   const {data,error}=await admin.from('staff_members')
    .update({active:body.active}).eq('user_id',row.user_id).eq('role','custom_admin')
    .select('user_id,email,display_name,role,active,permissions').single();
   if(error)throw error;
   return respond({staff:data});
  }
  if(action==='invite'){
   const result=await inviteStaff(String(body.email||''),String(body.displayName||''),allowed(body.permissions));
   return respond(result);
  }
  if(action==='update'){
   const id=String(body.userId||'');
   if(!/^[0-9a-f-]{36}$/.test(id))return respond({error:'معرّف المستخدم غير صالح.'},400);
   const {data:previous,error:previousError}=await admin.from('staff_members')
    .select('role').eq('user_id',id).maybeSingle();
   if(previousError)throw previousError;
   if(previous?.role!=='custom_admin')return respond({error:'يمكن تعديل المدراء ذوي الصلاحيات المخصصة فقط.'},403);
   const {data,error}=await admin.from('staff_members').update({
    permissions:allowed(body.permissions),active:body.active!==false,
    display_name:String(body.displayName||'').trim().slice(0,100)
   }).eq('user_id',id).eq('role','custom_admin')
    .select('user_id,role,active,permissions,email,display_name').single();
   if(error)throw error;
   return respond({staff:data});
  }
  return respond({error:'عملية غير مدعومة.'},400);
 }catch(error){
  const message=error instanceof Error?error.message:'حدث خطأ غير متوقع.';
  return respond({error:message},400);
 }
});