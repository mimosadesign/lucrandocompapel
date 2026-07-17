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
  subscription_status: string | null;
  current_period_end: string | null;
};

export type LifetimeGrant = {
  email: string;
  note: string | null;
  created_at: string;
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
      .select("email, note, created_at")
      .order("created_at", { ascending: false });
    const lifetimeSet = new Set((lifetimeRows ?? []).map((r) => r.email.toLowerCase()));

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const rows: AdminUserRow[] = authUsers.map((u) => {
      const p = profMap.get(u.id);
      const s = subMap.get(u.id);
      const isLifetime = !!u.email && lifetimeSet.has(u.email.toLowerCase());
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
        is_diamante: active || isLifetime,
        is_lifetime: isLifetime,
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
      lifetime: (lifetimeRows ?? []) as LifetimeGrant[],
    };
  });

export const grantLifetimeAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; note?: string }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("E-mail inválido");
    return { email, note: data.note?.trim() || null };
  })
  .handler(async ({ context, data }) => {
    assertAdmin(context.claims?.email as string | undefined);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("lifetime_emails")
      .upsert({ email: data.email, note: data.note, granted_by: context.userId }, { onConflict: "email" });
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
