import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CatalogItem = { n: string; v: number };
type CatalogData = { n: string; w: string; p: CatalogItem[] };

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Publica (upsert) o catálogo do usuário logado sob um slug único. */
export const publishCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string; data: CatalogData }) => {
    const slug = normalizeSlug(data.slug || "");
    if (!SLUG_RE.test(slug)) {
      throw new Error(
        "Apelido inválido. Use 3 a 40 letras/números, separados por hífen.",
      );
    }
    if (!data.data || !Array.isArray(data.data.p)) {
      throw new Error("Catálogo inválido.");
    }
    return { slug, data: data.data };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verifica se o slug já está em uso por outra pessoa.
    const { data: existing, error: readErr } = await supabase
      .from("public_catalogs")
      .select("user_id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (existing && existing.user_id !== userId) {
      return { ok: false as const, error: "Esse apelido já está em uso. Escolha outro." };
    }
    const { error } = await supabase
      .from("public_catalogs")
      .upsert(
        {
          slug: data.slug,
          user_id: userId,
          data: data.data as unknown as Record<string, unknown>,
        },
        { onConflict: "slug" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const, slug: data.slug };
  });

/** Verifica disponibilidade de um slug (para feedback em tempo real). */
export const checkSlugAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string }) => ({
    slug: normalizeSlug(data.slug || ""),
  }))
  .handler(async ({ data, context }) => {
    if (!SLUG_RE.test(data.slug)) return { available: false, mine: false };
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("public_catalogs")
      .select("user_id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!row) return { available: true, mine: false };
    return { available: row.user_id === userId, mine: row.user_id === userId };
  });

/** Retorna o slug atual do usuário, se existir. */
export const getMyCatalogSlug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("public_catalogs")
      .select("slug")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { slug: (data?.slug as string | undefined) ?? null };
  });
