-- Raafat Sys: secure business expenses and admin-only complete landlord cleanup.
-- Safe to apply: creates a table / RPC but does not delete any existing records.

create table if not exists public.company_expenses (
 id uuid primary key default gen_random_uuid(),
 expense_date date not null default current_date,
 title text not null check (length(btrim(title)) between 2 and 200),
 category text not null check (category in (
  'hospitality','office','transport','maintenance','supplies','utilities','other'
 )),
 amount numeric(16,2) not null check (amount > 0),
 currency text not null check (currency in ('USD','IQD')),
 paid_by text,
 notes text,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now()
);
create index if not exists company_expenses_date_idx
 on public.company_expenses (expense_date desc,created_at desc);
create index if not exists company_expenses_category_idx
 on public.company_expenses(category);

alter table public.company_expenses enable row level security;
revoke all on public.company_expenses from public, anon;
grant select,insert,update,delete on public.company_expenses to authenticated;

drop policy if exists raafat_expenses_read on public.company_expenses;
create policy raafat_expenses_read on public.company_expenses
 for select to authenticated using ((select public.is_staff()));

drop policy if exists raafat_expenses_add on public.company_expenses;
create policy raafat_expenses_add on public.company_expenses
 for insert to authenticated with check ((select public.is_staff()) and
  (created_by is null or created_by=(select auth.uid())));

drop policy if exists raafat_expenses_edit on public.company_expenses;
create policy raafat_expenses_edit on public.company_expenses
 for update to authenticated using ((select public.is_staff()))
 with check ((select public.is_staff()) and
  (created_by is null or created_by=(select auth.uid()) or (select public.is_admin())));

drop policy if exists raafat_expenses_delete on public.company_expenses;
create policy raafat_expenses_delete on public.company_expenses
 for delete to authenticated using ((select public.is_admin()));

-- Only active administrators can remove stored identity-card images.
-- File removal is performed via the Storage API after the SQL transaction.
drop policy if exists raafat_admin_cards_delete on storage.objects;
create policy raafat_admin_cards_delete on storage.objects
 for delete to authenticated
 using (bucket_id='identity-cards' and (select public.is_admin()));

create or replace function public.raafat_delete_landlord_cascade(p_landlord_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $$
declare
 v_landlord record;
 v_roofs integer := 0;
 v_sites integer := 0;
 v_leases integer := 0;
 v_installments integer := 0;
 v_blocked integer := 0;
begin
 if (select auth.uid()) is null or not exists (
  select 1 from public.staff_members sm
  where sm.user_id=(select auth.uid())
   and sm.active is true and sm.role='admin'
 ) then
  raise exception 'Only an active Raafat administrator may delete landlords'
  using errcode='42501';
 end if;
 if p_landlord_id is null then raise exception 'Landlord ID is required'; end if;

 select id,name,card_image_path into v_landlord
 from public.landlords where id=p_landlord_id for update;
 if not found then raise exception 'Landlord was not found'; end if;

 -- Never silently delete client campaigns or customer contracts.
 -- A landlord-owned billboard booked by a client must be unlinked first.
 select count(*) into v_blocked
 from public.ad_sites s
 join public.properties p on p.id=s.rooftop_property_id
 where p.landlord_id=p_landlord_id and (
  exists(select 1 from public.campaign_sites cs where cs.site_id=s.id)
  or exists(select 1 from public.customer_contracts cc where cc.site_id=s.id)
 );
 if v_blocked>0 then
  raise exception 'لا يمكن حذف المالك: توجد % قطعة مرتبطة بحملات أو عقود زبائن. فك ارتباط القطع أولاً.',v_blocked
   using errcode='23503';
 end if;

 select count(*) into v_roofs from public.properties
  where landlord_id=p_landlord_id;
 select count(*) into v_sites from public.ad_sites s
  where s.rooftop_property_id in (select id from public.properties
   where landlord_id=p_landlord_id);
 select count(*) into v_leases from public.leases
  where landlord_id=p_landlord_id;
 select count(*) into v_installments from public.lease_installments i
  where i.lease_id in (select id from public.leases where landlord_id=p_landlord_id);

 -- Delete all dependent records inside one atomic transaction.
 delete from public.lease_installments
  where lease_id in (select id from public.leases
   where landlord_id=p_landlord_id);
 delete from public.leases where landlord_id=p_landlord_id;
 delete from public.ad_sites where rooftop_property_id in (
  select id from public.properties where landlord_id=p_landlord_id);
 delete from public.properties where landlord_id=p_landlord_id;
 delete from public.landlords where id=p_landlord_id;

 return jsonb_build_object(
  'deleted_landlords',1,'landlord_id',p_landlord_id,'landlord_name',v_landlord.name,
  'deleted_properties',v_roofs,'deleted_sites',v_sites,
  'deleted_leases',v_leases,'deleted_installments',v_installments,
  'card_image_path',v_landlord.card_image_path
 );
end
$$;
revoke all on function public.raafat_delete_landlord_cascade(uuid)
 from public,anon;
grant execute on function public.raafat_delete_landlord_cascade(uuid)
 to authenticated;
comment on function public.raafat_delete_landlord_cascade(uuid) is
 'RLS-enforced admin-only atomic cleanup of landlord, roofs, billboards, leases and installments; refuse deletion if any billboard is booked by a client.';
