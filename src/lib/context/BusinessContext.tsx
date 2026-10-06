"use client";

import { createContext, useContext } from "react";
import type { MemberRole } from "@/lib/types/database";

export interface BusinessContextValue {
  business: { id: string; name: string; slug: string; business_type: string | null; logo_url: string | null };
  membership: { id: string; role: MemberRole; canCreateBookings: boolean };
  profile: { id: string; full_name: string; email: string; avatar_url: string | null };
  /** Paso del onboarding inicial que falta completar, o null si ya está listo. */
  onboardingStep: "servicios" | "empleados" | null;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ value, children }: { value: BusinessContextValue; children: React.ReactNode }) {
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness debe usarse dentro de BusinessProvider");
  return ctx;
}
