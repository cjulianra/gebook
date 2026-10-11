-- Cuaderno: control manual de servicios que un empleado presta, sin pasar
-- por la agenda (o que se le olvidó registrar a tiempo). Queda pendiente
-- hasta que el dueño/admin lo revisa y lo aprueba; solo entonces cuenta
-- para la comisión/contabilidad de ese empleado.
create table public.notebook_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  business_member_id uuid not null references public.business_members (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  service_name text not null,
  client_name text,
  amount numeric(10, 2) not null check (amount >= 0),
  note text,
  performed_at date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index notebook_entries_business_idx on public.notebook_entries (business_id, status);
create index notebook_entries_member_idx on public.notebook_entries (business_member_id);

alter table public.notebook_entries enable row level security;

create policy "notebook_select_own" on public.notebook_entries for select
  using (exists (
    select 1 from public.business_members bm where bm.id = business_member_id and bm.user_id = auth.uid()
  ));
create policy "notebook_select_admin" on public.notebook_entries for select
  using (public.is_business_member(business_id, array['owner', 'admin']::public.member_role[]));

create policy "notebook_insert_own" on public.notebook_entries for insert
  with check (exists (
    select 1 from public.business_members bm where bm.id = business_member_id and bm.user_id = auth.uid()
  ));
create policy "notebook_insert_admin" on public.notebook_entries for insert
  with check (public.is_business_member(business_id, array['owner', 'admin']::public.member_role[]));

create policy "notebook_update_admin" on public.notebook_entries for update
  using (public.is_business_member(business_id, array['owner', 'admin']::public.member_role[]));
create policy "notebook_update_own_pending" on public.notebook_entries for update
  using (
    status = 'pending'
    and exists (select 1 from public.business_members bm where bm.id = business_member_id and bm.user_id = auth.uid())
  );

create policy "notebook_delete_admin" on public.notebook_entries for delete
  using (public.is_business_member(business_id, array['owner', 'admin']::public.member_role[]));
create policy "notebook_delete_own_pending" on public.notebook_entries for delete
  using (
    status = 'pending'
    and exists (select 1 from public.business_members bm where bm.id = business_member_id and bm.user_id = auth.uid())
  );
