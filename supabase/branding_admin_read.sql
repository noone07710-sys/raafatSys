-- Permit Raafat admins to inspect/clean up previously uploaded branding assets.
-- Public serving is controlled separately by the bucket's public flag.
create policy raafat_branding_admin_read on storage.objects
 for select to authenticated using(bucket_id='raafat-branding' and public.is_admin());
