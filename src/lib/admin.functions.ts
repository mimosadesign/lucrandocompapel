import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAILS = new Set<string>([
  "mimosavacadesign@gmail.com",
]);

function assertAdmin(email: string | undefined) {
  const e = email?.toLowerCase();
  if (!e || !ADMIN_EMAILS.has(e)) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export type GrantDuration = "1m" | "3m" | "lifetime";

export type AdminUserRow = {
  id: string;
  email: string;
  nome: string | null;
  nome_atelier: string | null;
  whatsapp: string | null;
  cidade: string | null;
  estado: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  trial_start: string | null;
  is_diamante: boolean;
  is_lifetime: boolean;
  grant_duration: GrantDuration | null;
  grant_expires_at: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
};

export type LifetimeGrant = {
  email: string;
  note: string | null;
  created_at: string;
  duration: GrantDuration;
  expires_at: string | null;
};

export type AdminMetrics = {
  totalUsers: number;
  activeLast30d: number;
  activeLast7d: number;
  newLast30d: number;
  diamanteCount: number;
  trialCount: number;
  users: AdminUserRow[];
  lifetime: LifetimeGrant[];
};

function computeExpiresAt(duration: GrantDuration): string | null {
  if (duration === "lifetime") return null;
  const d = new Date();
  const days = duration === "1m" ? 30 : 90;
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const getAdminMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminMetrics> => {
    assertAdmin(context.claims?.email as string | undefined);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const authUsers: Array<{
      id: string;
      email: string | null;
      created_at: string;
      last_sign_in_at: string | null;
    }> = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      for (const u of data.users) {
        authUsers.push({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
        });
      }
      if (data.users.length < perPage) break;
      page += 1;
      if (page > 20) break;
    }

    const ids = authUsers.map((u) => u.id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, nome, nome_atelier, whatsapp, cidade, estado, trial_start")
      .in("id", ids);
    const profMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, status, current_period_end, environment, created_at")
      .in("user_id", ids)
      .order("created_at", { ascending: false });
    const subMap = new Map<string, { status: string; current_period_end: string | null }>();
    for (const s of subs ?? []) {
      if (subMap.has(s.user_id)) continue;
      subMap.set(s.user_id, {
        status: s.status,
        current_period_end: s.current_period_end,
      });
    }

    const { data: lifetimeRows } = await supabaseAdmin
      .from("lifetime_emails")
      .select("email, note, created_at, duration, expires_at")
      .order("created_at", { ascending: false });
    const now = Date.now();
    const grantMap = new Map<string, { duration: GrantDuration; expires_at: string | null }>();
    for (const r of lifetimeRows ?? []) {
      const dur = ((r as { duration?: string }).duration ?? "lifetime") as GrantDuration;
      const exp = (r as { expires_at?: string | null }).expires_at ?? null;
      // Active if lifetime or expires in future
      if (dur === "lifetime" || (exp && new Date(exp).getTime() > now)) {
        grantMap.set(r.email.toLowerCase(), { duration: dur, expires_at: exp });
      }
    }

    const day = 24 * 60 * 60 * 1000;

    const rows: AdminUserRow[] = authUsers.map((u) => {
      const p = profMap.get(u.id);
      const s = subMap.get(u.id);
      const grant = u.email ? grantMap.get(u.email.toLowerCase()) : undefined;
      const active =
        !!s &&
        ["active", "trialing", "past_due"].includes(s.status) &&
        (!s.current_period_end || new Date(s.current_period_end).getTime() > now);
      return {
        id: u.id,
        email: u.email ?? "",
        nome: p?.nome ?? null,
        nome_atelier: p?.nome_atelier ?? null,
        whatsapp: p?.whatsapp ?? null,
        cidade: p?.cidade ?? null,
        estado: p?.estado ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        trial_start: p?.trial_start ?? null,
        is_diamante: active || !!grant,
        is_lifetime: !!grant,
        grant_duration: grant?.duration ?? null,
        grant_expires_at: grant?.expires_at ?? null,
        subscription_status: s?.status ?? null,
        current_period_end: s?.current_period_end ?? null,
      };
    });

    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      totalUsers: rows.length,
      newLast30d: rows.filter((r) => now - new Date(r.created_at).getTime() < 30 * day).length,
      activeLast30d: rows.filter(
        (r) => r.last_sign_in_at && now - new Date(r.last_sign_in_at).getTime() < 30 * day,
      ).length,
      activeLast7d: rows.filter(
        (r) => r.last_sign_in_at && now - new Date(r.last_sign_in_at).getTime() < 7 * day,
      ).length,
      diamanteCount: rows.filter((r) => r.is_diamante).length,
      trialCount: rows.filter((r) => {
        if (r.is_diamante || !r.trial_start) return false;
        const elapsed = (now - new Date(r.trial_start).getTime()) / day;
        return elapsed <= 25;
      }).length,
      users: rows,
      lifetime: (lifetimeRows ?? []).map((r) => ({
        email: r.email,
        note: r.note,
        created_at: r.created_at,
        duration: ((r as { duration?: string }).duration ?? "lifetime") as GrantDuration,
        expires_at: (r as { expires_at?: string | null }).expires_at ?? null,
      })),
    };
  });

export const grantLifetimeAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; note?: string; duration?: GrantDuration }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("E-mail inválido");
    const duration = (data.duration ?? "lifetime") as GrantDuration;
    if (!["1m", "3m", "lifetime"].includes(duration)) throw new Error("Duração inválida");
    return { email, note: data.note?.trim() || null, duration };
  })
  .handler(async ({ context, data }) => {
    assertAdmin(context.claims?.email as string | undefined);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expires_at = computeExpiresAt(data.duration);
    const { error } = await supabaseAdmin
      .from("lifetime_emails")
      .upsert(
        {
          email: data.email,
          note: data.note,
          granted_by: context.userId,
          duration: data.duration,
          expires_at,
        },
        { onConflict: "email" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeLifetimeAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("E-mail inválido");
    return { email };
  })
  .handler(async ({ context, data }) => {
    assertAdmin(context.claims?.email as string | undefined);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("lifetime_emails")
      .delete()
      .eq("email", data.email);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
