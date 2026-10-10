-- ============================================================================
-- Horario general del negocio (en vez de un horario por-empleado día a día):
-- una sola configuración para lunes a viernes, otra para sábado, otra para
-- domingo y otra para festivos, aplicada a todos los empleados del negocio.
-- El caso especial (un empleado puntual que no puede ir un día concreto) se
-- maneja con employee_day_blocks, sin tocar el horario general.
-- ============================================================================

create table public.business_schedules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  schedule_type text not null check (schedule_type in ('weekday', 'saturday', 'sunday', 'holiday')),
  start_time time not null,
  end_time time not null check (end_time > start_time)
);
alter table public.business_schedules enable row level security;

create policy "business_schedules_select" on public.business_schedules for select
  using (public.is_business_member(business_id));
create policy "business_schedules_select_public" on public.business_schedules for select
  using (exists (select 1 from public.businesses b where b.id = business_id and b.is_active = true));
create policy "business_schedules_write_admin" on public.business_schedules for all
  using (public.is_business_member(business_id, array['owner','admin']::public.member_role[]))
  with check (public.is_business_member(business_id, array['owner','admin']::public.member_role[]));

-- Fechas específicas marcadas como festivo: ese día usa el horario "holiday"
-- en vez del horario que le tocaría por día de la semana.
create table public.business_holidays (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  holiday_date date not null,
  name text,
  created_at timestamptz not null default now(),
  unique (business_id, holiday_date)
);
alter table public.business_holidays enable row level security;

create policy "business_holidays_select" on public.business_holidays for select
  using (public.is_business_member(business_id));
create policy "business_holidays_select_public" on public.business_holidays for select
  using (exists (select 1 from public.businesses b where b.id = business_id and b.is_active = true));
create policy "business_holidays_write_admin" on public.business_holidays for all
  using (public.is_business_member(business_id, array['owner','admin']::public.member_role[]))
  with check (public.is_business_member(business_id, array['owner','admin']::public.member_role[]));

-- Bloqueo puntual: un empleado no puede atender un día concreto (permiso,
-- incapacidad, etc.), sin afectar el horario general ni a los demás empleados.
create table public.employee_day_blocks (
  id uuid primary key default gen_random_uuid(),
  business_member_id uuid not null references public.business_members (id) on delete cascade,
  block_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (business_member_id, block_date)
);
alter table public.employee_day_blocks enable row level security;

create policy "employee_day_blocks_select" on public.employee_day_blocks for select
  using (exists (
    select 1 from public.business_members bm
    where bm.id = business_member_id and public.is_business_member(bm.business_id)
  ));
create policy "employee_day_blocks_select_public" on public.employee_day_blocks for select
  using (exists (
    select 1 from public.business_members bm
    join public.businesses b on b.id = bm.business_id
    where bm.id = employee_day_blocks.business_member_id and b.is_active and bm.status = 'active'
  ));
create policy "employee_day_blocks_write_admin" on public.employee_day_blocks for all
  using (exists (
    select 1 from public.business_members bm
    where bm.id = business_member_id
      and public.is_business_member(bm.business_id, array['owner','admin']::public.member_role[])
  ))
  with check (exists (
    select 1 from public.business_members bm
    where bm.id = business_member_id
      and public.is_business_member(bm.business_id, array['owner','admin']::public.member_role[])
  ));
create policy "employee_day_blocks_write_own" on public.employee_day_blocks for all
  using (exists (
    select 1 from public.business_members bm
    where bm.id = business_member_id and bm.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.business_members bm
    where bm.id = business_member_id and bm.user_id = auth.uid()
  ));
