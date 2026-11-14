-- Keep the originally agreed surface area in each customer contract
-- even if the underlying package measurement is edited later.
alter table public.customer_contracts
  add column if not exists package_area_snapshot numeric(12,4);

create or replace function public.raafat_snapshot_contract_area()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' or (tg_op='UPDATE' and new.package_id is distinct from old.package_id) then
   select area_m2 into new.package_area_snapshot from public.packages where id=new.package_id;
 end if;
 return new;
end $$;
create trigger raafat_customer_contract_area_guard
before insert or update of package_id on public.customer_contracts
for each row execute function public.raafat_snapshot_contract_area();
revoke all on function public.raafat_snapshot_contract_area() from public,anon;
