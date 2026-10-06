export function register() {
  // El negocio solo opera en Colombia. El código ya ancla cada fecha/hora real
  // a hora de Bogotá explícitamente (ver src/lib/utils/dateRange.ts), pero
  // fijar el TZ del proceso es una capa extra de seguridad por si algo queda
  // sin cubrir — sin esto, un hosting que corra en UTC (como el de producción)
  // podría desfasar fechas en cualquier código que no use esos helpers.
  process.env.TZ = "America/Bogota";
}
