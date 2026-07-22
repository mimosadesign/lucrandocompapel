import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  getAdminMetrics,
  grantLifetimeAccess,
  revokeLifetimeAccess,
  type AdminUserRow,
  type GrantDuration,
} from "@/lib/admin.functions";
import { useUser, isAdminEmail } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Gem, TrendingUp, UserPlus, Download, Search, Gift, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Não foi possível carregar o painel</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button
          className="mt-4"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">Página não encontrada.</div>,
});

function AdminPage() {
  const { user, ready } = useUser();
  const navigate = useNavigate();
  const isAdmin = isAdminEmail(user?.email);

  useEffect(() => {
    if (ready && (!user || !isAdmin)) {
      navigate({ to: "/", replace: true });
    }
  }, [ready, user, isAdmin, navigate]);

  const fetchMetrics = useServerFn(getAdminMetrics);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => fetchMetrics(),
    enabled: ready && !!user && isAdmin,
    staleTime: 60_000,
  });

  const grantFn = useServerFn(grantLifetimeAccess);
  const revokeFn = useServerFn(revokeLifetimeAccess);
  const [giftEmail, setGiftEmail] = useState("");
  const [giftLoading, setGiftLoading] = useState(false);

  async function handleGrant(email: string) {
    const target = email.trim().toLowerCase();
    if (!target || !target.includes("@")) {
      toast.error("Digite um e-mail válido");
      return;
    }
    setGiftLoading(true);
    try {
      await grantFn({ data: { email: target } });
      toast.success(`Acesso vitalício presenteado para ${target}`);
      setGiftEmail("");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao conceder acesso");
    } finally {
      setGiftLoading(false);
    }
  }

  async function handleRevoke(email: string) {
    if (!confirm(`Remover acesso vitalício de ${email}?`)) return;
    try {
      await revokeFn({ data: { email } });
      toast.success("Acesso vitalício removido");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover acesso");
    }
  }

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"todos" | "diamante" | "trial">("todos");

  const filtered = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const term = q.trim().toLowerCase();
    return data.users.filter((u) => {
      if (filter === "diamante" && !u.is_diamante) return false;
      if (filter === "trial") {
        if (u.is_diamante || !u.trial_start) return false;
        const elapsed = (now - new Date(u.trial_start).getTime()) / day;
        if (elapsed > 25) return false;
      }
      if (!term) return true;
      return (
        u.email.toLowerCase().includes(term) ||
        (u.nome ?? "").toLowerCase().includes(term) ||
        (u.nome_atelier ?? "").toLowerCase().includes(term) ||
        (u.whatsapp ?? "").toLowerCase().includes(term) ||
        (u.cidade ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, q, filter]);

  if (!ready || !user || !isAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Verificando acesso…</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel administrativo"
        description="Métricas do app e lista completa de cadastros. Uso restrito à administradora."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Users className="h-4 w-4" />} label="Total de cadastros" value={data?.totalUsers ?? "—"} />
        <MetricCard icon={<UserPlus className="h-4 w-4" />} label="Novos (30 dias)" value={data?.newLast30d ?? "—"} />
        <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Ativos (30 dias)" value={data?.activeLast30d ?? "—"} sub={`${data?.activeLast7d ?? "—"} nos últimos 7 dias`} />
        <MetricCard icon={<Gem className="h-4 w-4 text-diamond" />} label="Assinantes Diamante" value={data?.diamanteCount ?? "—"} sub={`${data?.trialCount ?? "—"} em período de teste`} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-diamond" />
            <CardTitle className="text-base">Presentear acesso vitalício</CardTitle>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastre o e-mail (pode ser antes mesmo da pessoa se cadastrar). Ela terá
            todos os recursos Diamante liberados para sempre, sem cobrança.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={giftEmail}
              onChange={(e) => setGiftEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-80"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleGrant(giftEmail);
              }}
            />
            <Button
              onClick={() => void handleGrant(giftEmail)}
              disabled={giftLoading || !giftEmail.trim()}
              className="gap-2"
            >
              <Gift className="h-4 w-4" />
              {giftLoading ? "Presenteando…" : "Presentear vitalício"}
            </Button>
          </div>
          {data?.lifetime && data.lifetime.length > 0 && (
            <div className="rounded-2xl border border-border/60 p-3">
              <p className="mb-2 text-xs uppercase text-muted-foreground">
                Acessos vitalícios ativos ({data.lifetime.length})
              </p>
              <ul className="space-y-1">
                {data.lifetime.map((l) => (
                  <li key={l.email} className="flex items-center justify-between text-sm">
                    <span>💎 {l.email}</span>
                    <button
                      onClick={() => void handleRevoke(l.email)}
                      className="rounded-full p-1 text-muted-foreground hover:text-destructive"
                      aria-label={`Remover ${l.email}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Cadastros</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Nome, email e WhatsApp de todos os usuários. Use para campanhas e desconto.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, email, cidade…"
                className="pl-8 w-64"
              />
            </div>
            <div className="flex rounded-full bg-muted p-1 text-xs">
              {(["todos", "diamante", "trial"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 capitalize transition ${
                    filter === f ? "bg-background shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(filtered)}
              disabled={!filtered.length}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Exportar CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Atualizando…" : "Atualizar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {error && (
            <p className="text-sm text-destructive">
              Erro ao carregar: {(error as Error).message}
            </p>
          )}
          {data && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">Nome</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">WhatsApp</th>
                    <th className="py-2 pr-3">Ateliê</th>
                    <th className="py-2 pr-3">Cidade/UF</th>
                    <th className="py-2 pr-3">Plano</th>
                    <th className="py-2 pr-3">Cadastro</th>
                    <th className="py-2 pr-3">Último login</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{u.nome || "—"}</td>
                      <td className="py-2 pr-3">{u.email}</td>
                      <td className="py-2 pr-3">
                        {u.whatsapp ? (
                          <a
                            href={`https://wa.me/${u.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {u.whatsapp}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-3">{u.nome_atelier || "—"}</td>
                      <td className="py-2 pr-3">
                        {[u.cidade, u.estado].filter(Boolean).join("/") || "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {u.is_lifetime ? (
                          <Badge className="bg-diamond/30 text-foreground hover:bg-diamond/30">🎁 Vitalício</Badge>
                        ) : u.is_diamante ? (
                          <Badge className="bg-diamond/20 text-foreground hover:bg-diamond/20">💎 Diamante</Badge>
                        ) : (
                          <Badge variant="outline">Gratuito</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "nunca"}
                      </td>
                      <td className="py-2 pr-3">
                        {u.is_lifetime ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleRevoke(u.email)}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            Remover vitalício
                          </Button>
                        ) : u.email ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleGrant(u.email)}
                            className="text-xs gap-1"
                          >
                            <Gift className="h-3 w-3" /> Presentear
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum cadastro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <Link to="/" className="underline">Voltar ao início</Link>
      </p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return iso;
  }
}

function exportCsv(rows: AdminUserRow[]) {
  const header = [
    "nome",
    "email",
    "whatsapp",
    "atelie",
    "cidade",
    "estado",
    "plano",
    "cadastro",
    "ultimo_login",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const cols = [
      r.nome ?? "",
      r.email,
      r.whatsapp ?? "",
      r.nome_atelier ?? "",
      r.cidade ?? "",
      r.estado ?? "",
      r.is_diamante ? "Diamante" : "Gratuito",
      r.created_at,
      r.last_sign_in_at ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
    lines.push(cols.join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cadastros-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
