create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  business_member_id uuid not null references business_members(id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_member_idx on notifications(business_member_id, read_at);

alter table notifications enable row level security;

-- Un miembro ve solo sus propias notificaciones.
create policy notifications_select_own on notifications
  for select
  using (
    business_member_id in (
      select id from business_members where user_id = auth.uid()
    )
  );

-- Cualquier miembro activo del negocio puede crear notificaciones para otro
-- miembro del mismo negocio (ej. el dueño notifica a un empleado de una reserva nueva).
create policy notifications_insert_same_business on notifications
  for insert
  with check (
    business_id in (
      select business_id from business_members where user_id = auth.uid() and status = 'active'
    )
  );

-- Un miembro solo puede marcar como leídas sus propias notificaciones.
create policy notifications_update_own on notifications
  for update
  using (
    business_member_id in (
      select id from business_members where user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table notifications;
