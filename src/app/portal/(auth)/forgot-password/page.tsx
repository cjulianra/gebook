"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";

export default function PortalForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password?next=/portal/login`,
    });
    setLoading(false);

    if (error) {
      setError("No pudimos enviar el correo. Intenta de nuevo.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardBody className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-2xl">✉️</div>
          <h2 className="text-lg font-semibold text-[var(--color-ink-900)]">Revisa tu correo</h2>
          <p className="text-sm text-[var(--color-ink-500)]">
            Si <span className="font-medium text-[var(--color-ink-700)]">{email}</span> tiene una cuenta, te enviamos un enlace para
            crear una nueva contraseña.
          </p>
          <Link href="/portal/login" className="inline-block text-sm font-medium text-[var(--color-accent)] hover:underline">
            Volver a iniciar sesión
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <h1 className="mb-1 text-lg font-semibold text-[var(--color-ink-900)]">Recuperar contraseña</h1>
        <p className="mb-4 text-sm text-[var(--color-ink-500)]">Te enviaremos un enlace a tu correo para crear una nueva contraseña.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
          </div>
          <FieldError>{error ?? undefined}</FieldError>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>
      </CardBody>
      <div className="border-t border-[var(--color-border)] px-5 py-4 text-center text-sm text-[var(--color-ink-500)]">
        <Link href="/portal/login" className="font-medium text-[var(--color-accent)] hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    </Card>
  );
}
