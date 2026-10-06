"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, PasswordInput, Label, FieldError } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { claimClientRecords } from "../../actions";

export default function PortalRegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });

    if (error || !data.user) {
      setLoading(false);
      setError(error?.message === "User already registered" ? "Ese correo ya tiene una cuenta." : "No pudimos crear tu cuenta. Intenta de nuevo.");
      return;
    }

    // Si Supabase pide confirmar el correo, no hay sesión todavía: mostramos el aviso en vez de avanzar.
    if (!data.session) {
      setLoading(false);
      setCheckEmail(true);
      return;
    }

    await claimClientRecords(data.user.id, email);

    setLoading(false);
    router.replace("/portal");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <Card>
        <CardBody className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-2xl">✉️</div>
          <h2 className="text-lg font-semibold text-[var(--color-ink-900)]">Revisa tu correo</h2>
          <p className="text-sm text-[var(--color-ink-500)]">
            Te enviamos un enlace de verificación a <span className="font-medium text-[var(--color-ink-700)]">{email}</span>. Ábrelo para
            activar tu cuenta y continuar.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Valentina Ramírez" />
          </div>
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput id="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
        </form>
      </CardBody>
      <div className="border-t border-[var(--color-border)] px-5 py-4 text-center text-sm text-[var(--color-ink-500)]">
        ¿Ya tienes cuenta?{" "}
        <Link href="/portal/login" className="font-medium text-[var(--color-accent)] hover:underline">
          Inicia sesión
        </Link>
      </div>
    </Card>
  );
}
