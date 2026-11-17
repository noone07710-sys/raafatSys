-- Raafat Sys — full saved contract amendments, safe installment replanning, and persistent PDF drafts.
-- Apply to the Raafat Sys tables only, after the main schema and contract/campaign migrations.
-- Existing contract numbers remain immutable; original campaigns and their payments remain unchanged.
--
-- This file mirrors the live Supabase schema changes applied on 2026-11-17.
-- For roof leases, only an authenticated primary admin may run the atomic financial amendment RPC.

alter table public.customer_contracts add column if not exists print_overrides jsonb;
alter table public.leases add column if not exists print_overrides jsonb;

alter table public.customer_contracts drop constraint if exists raafat_customer_print_overrides_object;
alter table public.customer_contracts add constraint raafat_customer_print_overrides_object
 check (print_overrides is null or jsonb_typeof(print_overrides)='object');
alter table public.leases drop constraint if exists raafat_lease_print_overrides_object;
alter table public.leases add constraint raafat_lease_print_overrides_object
 check (print_overrides is null or jsonb_typeof(print_overrides)='object');

drop trigger if exists raafat_00_contract_from_campaign on public.customer_contracts;
create trigger raafat_00_contract_from_campaign before insert on public.customer_contracts
 for each row execute function public.raafat_contract_from_campaign();

drop trigger if exists raafat_zz_contract_faces_snapshot on public.customer_contracts;
create trigger raafat_zz_contract_faces_snapshot before insert on public.customer_contracts
 for each row execute function public.raafat_contract_faces_snapshot();

drop trigger if exists raafat_customer_contract_guard on public.customer_contracts;
create trigger raafat_customer_contract_guard before insert on public.customer_contracts
 for each row execute function public.raafat_set_customer_contract();

CREATE OR REPLACE FUNCTION public.raafat_customer_contract_update_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 v_type text;
 v_name text;
 v_width numeric;
 v_height numeric;
 v_specs text;
begin
 if new.contract_number is distinct from old.contract_number then
  raise exception 'Contract number is immutable';
 end if;
 if new.customer_id is distinct from old.customer_id then
  select c.name into v_name from public.customers c where c.id=new.customer_id;
  if not found then raise exception 'Customer does not exist'; end if;
  new.customer_name_snapshot := v_name;
 end if;
 if new.package_id is distinct from old.package_id then
  select p.name,p.package_type,p.width_m,p.height_m,p.specifications
   into v_name,v_type,v_width,v_height,v_specs
   from public.packages p where p.id=new.package_id;
  if not found then raise exception 'Advertising package does not exist'; end if;
  if new.contract_type is distinct from v_type then
   raise exception 'Contract type must match selected package type';
  end if;
  new.package_name_snapshot := v_name;
  new.package_dimensions_snapshot := case
   when v_width is not null and v_height is not null
   then v_width::text || ' × ' || v_height::text || ' m'
   else 'Not recorded' end;
  new.package_specifications_snapshot := v_specs;
 elsif new.contract_type is distinct from old.contract_type then
  select p.package_type into v_type from public.packages p where p.id=new.package_id;
  if new.contract_type is distinct from v_type then
   raise exception 'Contract type must match selected package type';
  end if;
 end if;
 if new.site_id is distinct from old.site_id then
  select s.name into v_name from public.ad_sites s where s.id=new.site_id;
  if new.site_id is not null and not found then
   raise exception 'Advertising site does not exist';
  end if;
  new.site_name_snapshot := case when new.site_id is null then null else v_name end;
 end if;
 return new;
end;
$function$;

drop trigger if exists raafat_customer_contract_edit_guard on public.customer_contracts;
create trigger raafat_customer_contract_edit_guard before update on public.customer_contracts
 for each row execute function public.raafat_customer_contract_update_guard();

CREATE OR REPLACE FUNCTION public.raafat_save_lease_amendment(p_lease_id uuid, p_values jsonb, p_schedule jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 v_old public.leases%rowtype;
 v_new public.leases%rowtype;
 v_locked_amount numeric(18,2) := 0;
 v_open_amount numeric(18,2) := 0;
 v_item jsonb;
 v_id uuid;
 v_due date;
 v_amount numeric(18,2);
 v_ids uuid[] := array[]::uuid[];
 v_updated_id uuid;
 v_date_text text;
 v_is_financial_change boolean;
begin
 if not public.is_admin() then
  raise exception 'تعديل كامل لعقود الأسطح والأقساط مخصص للمدير الرئيسي';
 end if;
 if p_lease_id is null or p_values is null or jsonb_typeof(p_values)<>'object' then
  raise exception 'بيانات العقد غير صالحة';
 end if;
 select * into v_old from public.leases where id=p_lease_id for update;
 if not found then raise exception 'عقد السطح غير موجود'; end if;
 -- Prevent two actors from changing or paying an installment concurrently.
 perform 1 from public.lease_installments where lease_id=p_lease_id for update;
 
 update public.leases set
  landlord_id=(p_values->>'landlord_id')::uuid,
  property_id=(p_values->>'property_id')::uuid,
  rent_total=(p_values->>'rent_total')::numeric,
  advance_amount=coalesce((p_values->>'advance_amount')::numeric,0),
  currency=(p_values->>'currency')::text,
  start_date=(p_values->>'start_date')::date,
  end_date=(p_values->>'end_date')::date,
  grace_days=(p_values->>'grace_days')::integer,
  payment_frequency=(p_values->>'payment_frequency')::text,
  company_representative=nullif(btrim(p_values->>'company_representative'),''),
  landlord_representative=nullif(btrim(p_values->>'landlord_representative'),''),
  notes=nullif(btrim(p_values->>'notes'),'')
 where id=p_lease_id
 returning * into v_new;
 if not found then raise exception 'لا توجد صلاحية لتعديل العقد'; end if;
 v_is_financial_change := v_old.rent_total is distinct from v_new.rent_total
  or v_old.advance_amount is distinct from v_new.advance_amount
  or v_old.currency is distinct from v_new.currency
  or v_old.start_date is distinct from v_new.start_date
  or v_old.end_date is distinct from v_new.end_date
  or v_old.grace_days is distinct from v_new.grace_days
  or v_old.payment_frequency is distinct from v_new.payment_frequency;
 if p_schedule is null then
  if v_is_financial_change then
   raise exception 'يجب اعتماد جدول الأقساط المعدّل مع تغيير الشروط المالية أو المدة';
  end if;
  return jsonb_build_object('id',v_new.id,'updated',true,'installments_edited',false);
 end if;
 if jsonb_typeof(p_schedule)<>'array' or jsonb_array_length(p_schedule)>30 then
  raise exception 'جدول الأقساط يجب أن يكون قائمة بحد أقصى 30 قسطاً';
 end if;
 select coalesce(sum(amount),0) into v_locked_amount
 from public.lease_installments where lease_id=p_lease_id and paid_amount>0;
 if v_old.currency is distinct from v_new.currency and v_locked_amount>0 then
  raise exception 'لا يمكن تغيير عملة العقد بعد تسجيل مبالغ مسددة؛ تبقى الأقساط المدفوعة بعملتها الأصلية';
 end if;
 for v_item in select value from jsonb_array_elements(p_schedule) as x(value)
 loop
  if jsonb_typeof(v_item)<>'object' then raise exception 'صف القسط غير صالح'; end if;
  v_date_text:=v_item->>'due_date';
  if v_date_text is null or v_date_text !~ '^\d{4}-\d{2}-\d{2}$' then
   raise exception 'أدخل تاريخ استحقاق صحيحاً لكل قسط';
  end if;
  v_due:=v_date_text::date;
  if to_char(v_due,'YYYY-MM-DD')<>v_date_text then
   raise exception 'تاريخ استحقاق القسط غير صالح';
  end if;
  v_amount:=(v_item->>'amount')::numeric;
  if v_amount is null or v_amount<=0 or v_amount<>round(v_amount,2) then
   raise exception 'مبلغ القسط يجب أن يكون أكبر من صفر وبدقة منزلتين';
  end if;
  v_open_amount:=v_open_amount+v_amount;
  if nullif(v_item->>'id','') is null then
   insert into public.lease_installments(lease_id,due_date,amount,paid_amount)
   values(p_lease_id,v_due,v_amount,0)
   returning id into v_updated_id;
   v_ids:=array_append(v_ids,v_updated_id);
  else
   v_id:=(v_item->>'id')::uuid;
   if v_id=any(v_ids) then raise exception 'يوجد تكرار في أقساط الجدول'; end if;
   update public.lease_installments set due_date=v_due,amount=v_amount
   where id=v_id and lease_id=p_lease_id and paid_amount=0
   returning id into v_updated_id;
   if not found then
    raise exception 'لا يمكن تعديل قسط مدفوع أو قسط لا يتبع هذا العقد';
   end if;
   v_ids:=array_append(v_ids,v_updated_id);
  end if;
 end loop;
 if abs((v_open_amount+v_locked_amount+v_new.advance_amount)-v_new.rent_total)>0.005 then
  raise exception 'المقدم والأقساط المدفوعة وغير المدفوعة يجب أن تساوي إجمالي إيجار العقد';
 end if;
 delete from public.lease_installments
 where lease_id=p_lease_id and paid_amount=0 and not (id=any(v_ids));
 return jsonb_build_object('id',v_new.id,'updated',true,'installments_edited',true);
end
$function$;

revoke all on function public.raafat_save_lease_amendment(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.raafat_save_lease_amendment(uuid,jsonb,jsonb) to authenticated;

comment on column public.customer_contracts.print_overrides
 is 'Optional saved client contract PDF customizations; does not change campaign receipts.';
comment on column public.leases.print_overrides
 is 'Optional saved landlord lease PDF customizations; does not alter paid installment ledger.';
