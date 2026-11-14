-- Add term and rented surface dimensions to customer advertising contracts.
-- Existing contracts remain unchanged.
alter table public.customer_contracts
 add column if not exists duration_months integer not null default 3 check(duration_months in (1,3,6,12)),
 add column if not exists rented_area_m2 numeric(12,4) check(rented_area_m2 is null or rented_area_m2>0);

-- Preserve contracted area, not only package area; E has individually negotiated measurements.
create or replace function public.raafat_snapshot_contract_area()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
  pkg record;
begin
 if tg_op='INSERT' or (tg_op='UPDATE' and (
   new.package_id is distinct from old.package_id or
   new.rented_area_m2 is distinct from old.rented_area_m2
 )) then
   select pricing_mode,area_m2 into pkg from public.packages where id=new.package_id;
   if pkg.pricing_mode='sqm_month' then
     new.package_area_snapshot:=new.rented_area_m2;
   else
     new.package_area_snapshot:=pkg.area_m2;
   end if;
 end if;
 return new;
end $$;
drop trigger if exists raafat_customer_contract_area_guard on public.customer_contracts;
create trigger raafat_customer_contract_area_guard
before insert or update of package_id,rented_area_m2 on public.customer_contracts
for each row execute function public.raafat_snapshot_contract_area();
