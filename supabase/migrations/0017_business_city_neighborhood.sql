alter table public.businesses
  add column if not exists city text,
  add column if not exists neighborhood text;
