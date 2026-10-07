-- Código de acceso de 4 dígitos para que los empleados entren sin correo:
-- se valida junto con su teléfono en /acceso y, si coincide, se crea su sesión.
alter table public.employee_details
  add column if not exists access_code text;
