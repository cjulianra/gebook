-- Registro de pagos/abonos de comisión a cada empleado. El saldo pendiente
-- no se almacena: se calcula siempre como
--   (comisión ganada en servicios completados) - (suma de pagos registrados)
-- así nunca puede desincronizarse del histórico real de reservas.
create table public.employee_payouts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  business_member_id uuid not null references public.business_members (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  note text,
  paid_at date not null default current_date,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create index employee_payouts_member_idx on public.employee_payouts (business_member_id);

alter table public.employee_payouts enable row level security;

-- Solo el owner/admin del negocio lleva las cuentas con sus empleados.
create policy "employee_payouts_select_admin" on public.employee_payouts for select
  using (public.is_business_member(business_id, array['owner','admin']::public.member_role[]));

create policy "employee_payouts_insert_admin" on public.employee_payouts for insert
  with check (public.is_business_member(business_id, array['owner','admin']::public.member_role[]));

create policy "employee_payouts_delete_admin" on public.employee_payouts for delete
  using (public.is_business_member(business_id, array['owner','admin']::public.member_role[]));
