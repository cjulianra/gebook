-- Suscripciones push por empleado/miembro del negocio, para notificarles
-- cuando entra una reserva nueva (desde la página pública o desde el panel).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_member_id uuid not null references public.business_members (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_write_own" on public.push_subscriptions for all
  using (exists (
    select 1 from public.business_members bm
    where bm.id = business_member_id and bm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.business_members bm
    where bm.id = business_member_id and bm.user_id = auth.uid()
  ));
