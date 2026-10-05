-- Comisión por defecto 40% — se puede ajustar por empleado desde Empleados.
-- Se aplica de forma pareja a todos los servicios que realiza ese empleado;
-- si más adelante se necesita comisión distinta por servicio, esta columna
-- sigue siendo el valor base y se puede agregar una tabla de overrides sin
-- romper nada de lo ya construido.
alter table public.employee_details
  add column commission_rate numeric(5, 2) not null default 40.00 check (commission_rate >= 0 and commission_rate <= 100);
