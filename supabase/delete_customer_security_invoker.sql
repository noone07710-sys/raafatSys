-- Strengthen the one-customer cleanup RPC: run under the caller's
-- RLS policies as well as the explicit active-admin guard inside the function.
-- Raafat tables already grant authenticated DELETE only to active admins
-- (campaign_sites grants staff DELETE, but campaign admin guard applies).
alter function public.raafat_delete_customer_cascade(uuid) security invoker;
comment on function public.raafat_delete_customer_cascade(uuid) is
 'Active admin only, security invoker + existing RLS: transactionally delete a selected Raafat customer, their contracts, campaigns, campaign receipts and booking links; preserve shared ad sites, packages and landlord records.';
