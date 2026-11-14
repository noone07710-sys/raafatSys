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
  or exists(select 1 from public.customer_contracts cc
   where cc.site_id=s.id or
   coalesce(cc.campaign_sites_snapshot,'[]'::jsonb)
     @> jsonb_build_array(jsonb_build_object('id',s.id)))
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
