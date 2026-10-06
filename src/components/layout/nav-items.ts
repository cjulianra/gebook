import type { MemberRole } from "@/lib/types/database";

export interface NavItem {
  label: string;
  href: string;
  roles: MemberRole[];
  icon: "dashboard" | "agenda" | "services" | "employees" | "clients" | "settings" | "reports" | "profile";
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Agenda", href: "reservas", roles: ["owner", "admin", "employee"], icon: "agenda" },
  { label: "Servicios", href: "servicios", roles: ["owner", "admin"], icon: "services" },
  { label: "Empleados", href: "empleados", roles: ["owner", "admin"], icon: "employees" },
  { label: "Clientes", href: "clientes", roles: ["owner", "admin", "employee"], icon: "clients" },
  { label: "Reportes", href: "reportes", roles: ["owner", "admin"], icon: "reports" },
  { label: "Mi perfil", href: "mi-perfil", roles: ["employee"], icon: "profile" },
  { label: "Configuración", href: "configuracion", roles: ["owner", "admin"], icon: "settings" },
];
