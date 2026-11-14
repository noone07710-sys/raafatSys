-- One atomic, admin-only cleanup of a Raafat customer and dependent business records.
-- Does NOT delete shared advertising sites, packages, landlords, properties, leases,
-- storage objects, or another customer's records.
-- Not invoked by this migration: existing customer data remains untouched.
create or replace function public.raafat_delete_customer_cascade(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer record;
  v_contracts integer := 0;
  v_campaigns integer := 0;
  v_payments integer := 0;
  v_links integer := 0;
begin
  -- Check the real signed-in identity; an inactive former admin cannot delete.
  if (select auth.uid()) is null or not exists (
    select 1 from public.staff_members sm
    where sm.user_id=(select auth.uid())
      and sm.active is true and sm.role='admin'
  ) then
    raise exception 'Deletion requires an active Raafat administrator'
      using errcode='42501';
  end if;

  if p_customer_id is null then
    raise exception 'A customer ID is required';
  end if;

  -- Locks the customer against conflicting concurrent campaign inserts.
  select id,name into v_customer
  from public.customers where id=p_customer_id for update;
  if not found then
    raise exception 'Customer no longer exists';
  end if;

  select count(*)::int into v_contracts
    from public.customer_contracts where customer_id=p_customer_id;
  select count(*)::int into v_campaigns
    from public.campaigns where customer_id=p_customer_id;
  select count(*)::int into v_payments
    from public.campaign_payments cp
    join public.campaigns c on c.id=cp.campaign_id
    where c.customer_id=p_customer_id;
  select count(*)::int into v_links
    from public.campaign_sites cs
    join public.campaigns c on c.id=cs.campaign_id
    where c.customer_id=p_customer_id;

  -- Delete contracts FIRST. Their campaign FK uses SET NULL, and the
  -- immutable-contract trigger rejects such updates. Deleting them first
  -- also catches historical contracts not linked to a campaign.
  delete from public.customer_contracts
    where customer_id=p_customer_id;

  -- Deleting campaigns cascades only to campaign_payments/campaign_sites;
  -- the physical ad_sites and packages they point to remain untouched.
  delete from public.campaigns where customer_id=p_customer_id;
  delete from public.customers where id=p_customer_id;

  return jsonb_build_object(
    'customer_id',p_customer_id,
    'customer_name',v_customer.name,
    'deleted_customers',1,
    'deleted_campaigns',v_campaigns,
    'deleted_contracts',v_contracts,
    'deleted_payments',v_payments,
    'deleted_campaign_sites',v_links
  );
end
$$;

revoke all on function public.raafat_delete_customer_cascade(uuid)
  from public, anon;
grant execute on function public.raafat_delete_customer_cascade(uuid)
  to authenticated;
comment on function public.raafat_delete_customer_cascade(uuid) is
  'Raafat admins only: permanently delete one customer, their contracts, campaigns, receipts and campaign-site links in a single transaction; never delete shared advertising sites or landlords.';
