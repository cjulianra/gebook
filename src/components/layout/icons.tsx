import type { NavItem } from "./nav-items";

const paths: Record<NavItem["icon"], React.ReactNode> = {
  dashboard: (
    <path d="M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z" />
  ),
  agenda: (
    <path d="M7 3v2M17 3v2M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
  ),
  services: (
    <path d="M12 2 9.5 7l-5.5.8 4 3.9-1 5.3L12 14.5l4.9 2.5-.9-5.3 4-3.9L14.5 7 12 2Z" />
  ),
  employees: (
    <path d="M16 11a4 4 0 1 0-4-4M16 11a4 4 0 0 1 0 0ZM2 20c0-3.3 2.7-6 6-6M22 20c0-2.8-2-5.1-4.7-5.7M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 4c3.3 0 6 2.7 6 6H2c0-3.3 2.7-6 6-6Z" />
  ),
  clients: <path d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  settings: (
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3-1.7-.5a6.9 6.9 0 0 0-.6-1.5l1-1.6-1.4-1.4-1.6 1a7 7 0 0 0-1.5-.6L14 4h-2l-.5 1.7a7 7 0 0 0-1.5.6l-1.6-1L7 6.7l1 1.6a6.9 6.9 0 0 0-.6 1.5L4.8 10v2l1.7.5c.1.5.3 1 .6 1.5l-1 1.6 1.4 1.4 1.6-1c.5.3 1 .5 1.5.6L11 19h2l.5-1.7c.5-.1 1-.3 1.5-.6l1.6 1 1.4-1.4-1-1.6c.3-.5.5-1 .6-1.5l1.7-.5v-2Z" />
  ),
  reports: <path d="M4 20V10M10 20V4M16 20v-7M4 20h16" />,
  profile: (
    <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm13 4h2M17 13h2M9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-4 6c.5-2.5 2.2-4 4-4s3.5 1.5 4 4" />
  ),
};

export function NavIcon({ name, className }: { name: NavItem["icon"]; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {paths[name]}
    </svg>
  );
}
