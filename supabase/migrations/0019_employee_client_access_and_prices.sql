-- Permiso por empleado: si puede ver la sección de Clientes del negocio.
alter table public.employee_details
  add column if not exists can_view_clients boolean not null default true;

-- Config por negocio: si los precios de los servicios se muestran en la página pública.
alter table public.businesses
  add column if not exists show_prices boolean not null default true;
