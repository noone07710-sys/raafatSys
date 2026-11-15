-- Optional date for the next customer payment reminder on an advertising campaign.
-- Alerts are derived from this date and the existing amount paid; no messages are sent automatically.
alter table public.campaigns add column if not exists next_payment_due_date date;
comment on column public.campaigns.next_payment_due_date is 'Optional next customer payment due date; cleared alerts when balance reaches zero.';
