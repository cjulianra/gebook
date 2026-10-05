-- ============================================================================
-- Belleza SaaS — esquema inicial
-- Multi-tenant: cada negocio (business) es un tenant. El aislamiento se
-- garantiza con Row Level Security, nunca solo en el frontend.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles: identidad global de cada usuario autenticado (1:1 con auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ----------------------------------------------------------------------------
-- businesses: cada tenant
-- ----------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  name text not null,
  slug text not null unique,
  business_type text,
  phone text,
  address text,
  timezone text not null default 'America/Bogota',
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

-- ----------------------------------------------------------------------------
-- business_members: pertenencia + rol de un usuario dentro de un negocio
-- ----------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'employee');
create type public.member_status as enum ('active', 'inactive');

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

alter table public.business_members enable row level security;

-- Helper: ¿el usuario autenticado es miembro activo de este negocio?
-- security definer para evitar recursión de RLS al consultar la propia tabla.
create function public.is_business_member(p_business_id uuid, p_roles public.member_role[] default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = auth.uid()
      and bm.status = 'active'
      and (p_roles is null or bm.role = any(p_roles))
  );
$$;

create function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_super_admin from public.profiles where id = auth.uid()), false);
$$;

-- ----------------------------------------------------------------------------
-- employee_details: datos propios de un miembro con rol employee (1:1)
-- ----------------------------------------------------------------------------
create table public.employee_details (
  business_member_id uuid primary key references public.business_members (id) on delete cascade,
  phone text,
  specialty text,
  photo_url text,
  color_tag text
);

alter table public.employee_details enable row level security;

-- ----------------------------------------------------------------------------
-- services
-- ----------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null default 0,
  duration_minutes integer not null check (duration_minutes > 0),
  category text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.services enable row level security;

-- ----------------------------------------------------------------------------
-- employee_services: n:n empleado ↔ servicio
-- ----------------------------------------------------------------------------
create table public.employee_services (
  business_member_id uuid not null references public.business_members (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  primary key (business_member_id, service_id)
);

alter table public.employee_services enable row level security;

-- ----------------------------------------------------------------------------
-- work_schedules: disponibilidad semanal recurrente por empleado
-- ----------------------------------------------------------------------------
create table public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  business_member_id uuid not null references public.business_members (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time)
);

alter table public.work_schedules enable row level security;

-- ----------------------------------------------------------------------------
-- clients
-- ----------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  first_name text not null,
  last_name text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

-- ----------------------------------------------------------------------------
-- bookings
-- ----------------------------------------------------------------------------
create type public.booking_status as enum (
  'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  client_id uuid not null references public.clients (id),
  service_id uuid not null references public.services (id),
  business_member_id uuid not null references public.business_members (id),
  start_at timestamptz not null,
  end_at timestamptz not null check (end_at > start_at),
  status public.booking_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create index bookings_business_start_idx on public.bookings (business_id, start_at);
create index bookings_member_start_idx on public.bookings (business_member_id, start_at);
create index clients_business_idx on public.clients (business_id);
create index services_business_idx on public.services (business_id);
create index business_members_user_idx on public.business_members (user_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- profiles: cada quien ve/edita su propio perfil; super admin ve todos
create policy "profiles_select_own_or_admin" on public.profiles for select
  using (id = auth.uid() or public.is_super_admin());
create policy "profiles_update_own" on public.profiles for update
  using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert
  with check (id = auth.uid());

-- businesses: miembros ven su negocio; super admin ve todos; owner crea
-- (el owner también puede verlo directamente por owner_id: al momento del INSERT
-- todavía no existe su fila en business_members, y el RETURNING del insert
-- necesita satisfacer la política de SELECT)
create policy "businesses_select_member" on public.businesses for select
  using (owner_id = auth.uid() or public.is_business_member(id) or public.is_super_admin());
create policy "businesses_insert_owner" on public.businesses for insert
  with check (owner_id = auth.uid());
create policy "businesses_update_admin" on public.businesses for update
  using (public.is_business_member(id, array['owner','admin']::public.member_role[]) or public.is_super_admin());

-- business_members: visibles para miembros del mismo negocio; solo admin/owner gestiona
create policy "members_select_same_business" on public.business_members for select
  using (public.is_business_member(business_id) or public.is_super_admin());
create policy "members_insert_admin" on public.business_members for insert
  with check (public.is_business_member(business_id, array['owner','admin']::public.member_role[]));
create policy "members_update_admin" on public.business_members for update
  using (public.is_business_member(business_id, array['owner','admin']::public.member_role[]));
create policy "members_delete_admin" on public.business_members for delete
  using (public.is_business_member(business_id, array['owner','admin']::public.member_role[]));

-- employee_details: mismo negocio visible; admin/owner o el propio empleado editan
create policy "employee_details_select" on public.employee_details for select
  using (exists (
    select 1 from public.business_members bm
    where bm.id = business_member_id and public.is_business_member(bm.business_id)
  ));
create policy "employee_details_write_admin" on public.employee_details for all
  using (exists (
    select 1 from public.business_members bm
    where bm.id = business_member_id
      and public.is_business_member(bm.business_id, array['owner','admin']::public.member_role[])
  ));

-- services: miembros del negocio ven; solo admin/owner escribe
create policy "services_select_member" on public.services for select
  using (public.is_business_member(business_id));
create policy "services_write_admin" on public.services for all
  using (public.is_business_member(business_id, array['owner','admin']::public.member_role[]))
  with check (public.is_business_member(business_id, array['owner','admin']::public.member_role[]));

-- employee_services: visible a miembros del negocio; escribe admin/owner
create policy "employee_services_select" on public.employee_services for select
  using (exists (
    select 1 from public.services s where s.id = service_id and public.is_business_member(s.business_id)
  ));
create policy "employee_services_write_admin" on public.employee_services for all
  using (exists (
    select 1 from public.services s
    where s.id = service_id
      and public.is_business_member(s.business_id, array['owner','admin']::public.member_role[])
  ));

-- work_schedules: visible a miembros del negocio; escribe admin/owner
create policy "work_schedules_select" on public.work_schedules for select
  using (exists (
    select 1 from public.business_members bm
    where bm.id = business_member_id and public.is_business_member(bm.business_id)
  ));
create policy "work_schedules_write_admin" on public.work_schedules for all
  using (exists (
    select 1 from public.business_members bm
    where bm.id = business_member_id
      and public.is_business_member(bm.business_id, array['owner','admin']::public.member_role[])
  ));

-- clients: miembros del negocio ven y gestionan (recepción/admin flow)
create policy "clients_select_member" on public.clients for select
  using (public.is_business_member(business_id));
create policy "clients_write_member" on public.clients for all
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- bookings: miembros ven las del negocio; empleados solo deberían operar las suyas
-- desde la app (filtrado adicional en UI), pero a nivel fila ya quedan aisladas por tenant.
create policy "bookings_select_member" on public.bookings for select
  using (public.is_business_member(business_id));
create policy "bookings_write_admin" on public.bookings for insert
  with check (public.is_business_member(business_id));
create policy "bookings_update_member" on public.bookings for update
  using (public.is_business_member(business_id));
create policy "bookings_delete_admin" on public.bookings for delete
  using (public.is_business_member(business_id, array['owner','admin']::public.member_role[]));

-- ----------------------------------------------------------------------------
-- Trigger: crear profile automáticamente al registrarse en auth.users
-- ----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
