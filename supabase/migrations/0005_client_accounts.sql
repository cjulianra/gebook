-- ============================================================================
-- Cuentas de cliente con identidad global: un cliente tiene UN solo login
-- (profiles) y puede tener historial en varios negocios. `clients` sigue
-- siendo una fila POR NEGOCIO (nombre, notas, historial propios de ese
-- negocio — el negocio no debe ver datos de otros negocios del cliente),
-- pero ahora puede enlazarse a `profiles` cuando el cliente se registra.
-- ============================================================================

alter table public.clients
  add column user_id uuid references public.profiles (id);

-- Un mismo usuario no debería tener dos filas de cliente en el mismo negocio.
create unique index clients_business_user_unique
  on public.clients (business_id, user_id)
  where user_id is not null;

create index clients_user_idx on public.clients (user_id);

-- Helper: ¿el usuario autenticado es cliente (vinculado) de este negocio?
create function public.is_client_of_business(p_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.clients c
    where c.business_id = p_business_id and c.user_id = auth.uid()
  );
$$;

-- clients: el cliente puede ver sus propias filas (en cualquier negocio)
create policy "clients_select_self" on public.clients for select
  using (user_id = auth.uid());

-- businesses: el cliente puede ver los negocios donde tiene historial
create policy "businesses_select_client" on public.businesses for select
  using (public.is_client_of_business(id));

-- services: el cliente necesita ver el nombre del servicio reservado
create policy "services_select_client" on public.services for select
  using (public.is_client_of_business(business_id));

-- business_members: el cliente necesita ver qué empleado lo atendió/atenderá
create policy "members_select_client" on public.business_members for select
  using (public.is_client_of_business(business_id));

-- bookings: el cliente ve sus propias reservas en cualquier negocio...
create policy "bookings_select_client" on public.bookings for select
  using (exists (
    select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid()
  ));

-- ...y puede cancelarlas (solo transición a 'cancelled', nada más).
create policy "bookings_client_cancel" on public.bookings for update
  using (exists (
    select 1 from public.clients c where c.id = client_id and c.user_id = auth.uid()
  ))
  with check (status = 'cancelled');
