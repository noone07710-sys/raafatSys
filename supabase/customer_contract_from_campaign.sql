-- Campaign-driven customer contracts for Raafat Sys.
-- All new contracts inherit the agreed customer, package, boards, quantities,
-- dates and financial terms from their parent campaign. Existing records remain intact.
alter table public.campaigns
  add column if not exists start_date date;

alter table public.customer_contracts
  add column if not exists campaign_title_snapshot text,
  add column if not exists campaign_quantity_snapshot integer,
  add column if not exists campaign_sites_snapshot jsonb,
  add column if not exists campaign_locations_snapshot text,
  add column if not exists campaign_notes_snapshot text;

create index if not exists raafat_customer_contracts_campaign_idx
  on public.customer_contracts(campaign_id);

create or replace function public.raafat_contract_from_campaign()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  camp record;
  selected_sites jsonb;
  site_total integer;
  first_site uuid;
  roof_area numeric;
  renewal_month date;
  last_day date;
begin
  if tg_op='UPDATE' then
    -- Existing contract terms and snapshots must not silently drift as campaigns change.
    -- Representatives, notes and terms can still be edited.
    if old.campaign_id is not null and (
      new.campaign_id is distinct from old.campaign_id or
      new.customer_id is distinct from old.customer_id or
      new.package_id is distinct from old.package_id or
      new.site_id is distinct from old.site_id or
      new.contract_type is distinct from old.contract_type or
      new.duration_months is distinct from old.duration_months or
      new.rented_area_m2 is distinct from old.rented_area_m2 or
      new.start_date is distinct from old.start_date or
      new.end_date is distinct from old.end_date or
      new.amount is distinct from old.amount or
      new.currency is distinct from old.currency or
      new.campaign_title_snapshot is distinct from old.campaign_title_snapshot or
      new.campaign_quantity_snapshot is distinct from old.campaign_quantity_snapshot or
      new.campaign_sites_snapshot is distinct from old.campaign_sites_snapshot or
      new.campaign_locations_snapshot is distinct from old.campaign_locations_snapshot or
      new.campaign_notes_snapshot is distinct from old.campaign_notes_snapshot
    ) then
      raise exception 'Linked contract terms are fixed from the campaign; edit only terms, notes and representatives';
    end if;
    return new;
  end if;

  if new.campaign_id is null then
    raise exception 'Choose a saved campaign before creating the customer contract';
  end if;

  select c.*, p.package_type as resolved_type, p.pricing_mode
    into camp
    from public.campaigns c
    join public.packages p on p.id=c.package_id
    where c.id=new.campaign_id;
  if not found then
    raise exception 'Campaign must have a valid advertising package';
  end if;
  if camp.start_date is null then
    raise exception 'Set the campaign start date before generating a customer contract';
  end if;
  if camp.months not in (1,3,6,12) then
    raise exception 'Campaign term must be one of 1, 3, 6 or 12 months';
  end if;

  select coalesce(jsonb_agg(
      jsonb_build_object(
        'id',s.id,'code',s.code,'name',s.name,
        'address',s.address,'governorate',s.governorate,'site_type',s.site_type
      ) order by s.code,s.id),'[]'::jsonb),
      count(*)::int,
      (array_agg(s.id order by s.code,s.id))[1],
      coalesce(sum(coalesce(roof.area_m2,0)),0)
  into selected_sites,site_total,first_site,roof_area
  from public.campaign_sites cs
  join public.ad_sites s on s.id=cs.site_id
  left join public.properties roof on roof.id=s.rooftop_property_id
  where cs.campaign_id=camp.id;

  if site_total=0 and nullif(trim(coalesce(camp.locations,'')),'') is null then
    raise exception 'Campaign has no assigned sites or additional location details';
  end if;

  new.customer_id := camp.customer_id;
  new.package_id := camp.package_id;
  new.site_id := first_site; -- representative primary site only, NOT the full list
  new.contract_type := camp.resolved_type;
  new.duration_months := camp.months;
  new.rented_area_m2 := case when camp.pricing_mode='sqm_month'
    then coalesce(camp.requested_area_m2,nullif(roof_area,0))
    else null end;
  if camp.pricing_mode='sqm_month' and coalesce(new.rented_area_m2,0)<=0 then
    raise exception 'Roof campaign has no positive agreed area';
  end if;
  new.amount := camp.price;
  new.currency := camp.currency;
  new.start_date := camp.start_date;
  renewal_month := (date_trunc('month',camp.start_date)::date + make_interval(months=>camp.months))::date;
  last_day := (renewal_month + interval '1 month - 1 day')::date;
  new.end_date := renewal_month + least(extract(day from camp.start_date)::int,extract(day from last_day)::int) - 2;
  new.campaign_title_snapshot := camp.title;
  new.campaign_quantity_snapshot := greatest(1,coalesce(camp.quantity,1),site_total);
  new.campaign_sites_snapshot := selected_sites;
  new.campaign_locations_snapshot := camp.locations;
  new.campaign_notes_snapshot := camp.notes;
  return new;
end
$$;

drop trigger if exists raafat_00_contract_from_campaign on public.customer_contracts;
create trigger raafat_00_contract_from_campaign
before insert or update on public.customer_contracts
for each row execute function public.raafat_contract_from_campaign();

comment on column public.customer_contracts.campaign_sites_snapshot is
  'Frozen list of all booked billboard codes/names/addresses at contract creation';
comment on column public.customer_contracts.campaign_quantity_snapshot is
  'Frozen effective piece count from the campaign, not an independently entered contract field';
