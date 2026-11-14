-- Restrict editing of expense records to administrators. Staff can add/read,
-- but the creator ID is always the authenticated user, never a forged value.
alter table public.company_expenses
 alter column created_by set not null;
drop policy if exists raafat_expenses_add on public.company_expenses;
create policy raafat_expenses_add on public.company_expenses
 for insert to authenticated
 with check ((select public.is_staff()) and created_by=(select auth.uid()));
drop policy if exists raafat_expenses_edit on public.company_expenses;
create policy raafat_expenses_edit on public.company_expenses
 for update to authenticated
 using ((select public.is_admin()))
 with check ((select public.is_admin()));
