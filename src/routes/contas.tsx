import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Trash2, Receipt, CheckCircle2, AlertTriangle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/money-input";
import { useLocalState, brl, monthKey } from "@/lib/storage";
import {
  CATEGORIAS_CONTA,
  CONTAS_KEY,
  contaPaga,
  contasDoMes,
  vencimentoNoMes,
  type Conta,
} from "@/lib/contas";

export const Route = createFileRoute("/contas")({
  head: () => ({
    meta: [
      { title: "Contas a Pagar — Lucrando com Papel" },
      {
        name: "description",
        content:
          "Cadastre as contas do seu ateliê, acompanhe vencimentos e veja o que ainda falta pagar no mês.",
      },
      { property: "og:title", content: "Contas a Pagar — Lucrando com Papel" },
      {
        property: "og:description",
        content: "Controle das contas fixas e avulsas do seu ateliê, ligado ao faturamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContasPage,
});

function novaConta(): Conta {
  return {
    id: crypto.randomUUID(),
    nome: "",
    categoria: "Fixa da casa",
    valor: 0,
    dia: 5,
    recorrente: true,
    pagos: [],
  };
}

function ContasPage() {
  const [contas, setContas] = useLocalState<Conta[]>(CONTAS_KEY, []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Conta | null>(null);
  const mes = monthKey();
  const hoje = new Date();

  const doMes = useMemo(() => {
    return contasDoMes(contas, hoje).sort((a, b) => {
      const va = vencimentoNoMes(a, hoje)?.getTime() ?? 0;
      const vb = vencimentoNoMes(b, hoje)?.getTime() ?? 0;
      return va - vb;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contas]);

  const total = doMes.reduce((s, c) => s + (c.valor || 0), 0);
  const pago = doMes.filter((c) => contaPaga(c, mes)).reduce((s, c) => s + (c.valor || 0), 0);
  const aPagar = total - pago;
  const vencidas = doMes.filter(
    (c) => !contaPaga(c, mes) && (vencimentoNoMes(c, hoje)?.getTime() ?? 0) < hoje.setHours(0, 0, 0, 0),
  );

  function salvar() {
    if (!editing) return;
    if (!editing.nome.trim()) {
      toast.error("Dê um nome para a conta.");
      return;
    }
    setContas((prev) => {
      const i = prev.findIndex((c) => c.id === editing.id);
      if (i === -1) return [...prev, editing];
      const next = [...prev];
      next[i] = editing;
      return next;
    });
    setOpen(false);
    setEditing(null);
    toast.success("Conta salva!");
  }

  function togglePago(c: Conta) {
    setContas((prev) =>
      prev.map((x) => {
        if (x.id !== c.id) return x;
        const pagos = x.pagos || [];
        return pagos.includes(mes)
          ? { ...x, pagos: pagos.filter((m) => m !== mes) }
          : { ...x, pagos: [...pagos, mes] };
      }),
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Contas a Pagar"
        description="Cadastre suas contas fixas e avulsas. O total entra automaticamente no seu faturamento como despesa do mês."
        actions={
          <Button
            className="rounded-full gap-2"
            onClick={() => {
              setEditing(novaConta());
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nova conta
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi icon={<Receipt className="h-4 w-4" />} label="Contas do mês" value={brl(total)} sub={`${doMes.length} conta(s)`} />
        <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="Já pago" value={brl(pago)} sub="neste mês" />
        <Kpi
          icon={<Wallet className="h-4 w-4" />}
          label="Ainda a pagar"
          value={brl(aPagar)}
          sub={vencidas.length ? `${vencidas.length} vencida(s)` : "em dia"}
        />
      </div>

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 font-display text-lg font-semibold">Contas deste mês</h2>
        {doMes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma conta cadastrada ainda. Clique em “Nova conta” para começar.
          </p>
        ) : (
          <div className="space-y-2">
            {doMes.map((c) => {
              const v = vencimentoNoMes(c, hoje);
              const paga = contaPaga(c, mes);
              const atrasada = !paga && v && v.getTime() < new Date().setHours(0, 0, 0, 0);
              return (
                <div
                  key={c.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                    atrasada ? "border-destructive/50 bg-destructive/5" : "border-border/60"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {c.nome}
                      {paga && (
                        <span className="ml-2 inline-flex rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-medium">
                          Pago
                        </span>
                      )}
                      {atrasada && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          <AlertTriangle className="h-3 w-3" /> Vencida
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.categoria} · vence {v ? v.toLocaleDateString("pt-BR") : "—"} ·{" "}
                      {c.recorrente ? "mensal" : "avulsa"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-semibold">{brl(c.valor)}</span>
                    <Button
                      variant={paga ? "default" : "outline"}
                      size="sm"
                      className="rounded-full h-8 text-xs"
                      onClick={() => togglePago(c)}
                    >
                      {paga ? "✓ Pago" : "Marcar pago"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing({ ...c });
                        setOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => setContas(contas.filter((x) => x.id !== c.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editing && contas.some((c) => c.id === editing.id) ? "Editar conta" : "Nova conta"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Nome da conta</Label>
                <Input
                  value={editing.nome}
                  onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                  placeholder="Ex.: Luz, Internet, Fornecedor de papel"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Categoria</Label>
                  <Select
                    value={editing.categoria}
                    onValueChange={(v) => setEditing({ ...editing, categoria: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_CONTA.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Valor</Label>
                  <MoneyInput
                    value={editing.valor}
                    onChange={(n) => setEditing({ ...editing, valor: n })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={editing.recorrente}
                  onCheckedChange={(v) => setEditing({ ...editing, recorrente: !!v })}
                />
                Conta mensal (repete todo mês)
              </label>
              {editing.recorrente ? (
                <div className="grid gap-1.5">
                  <Label>Dia do vencimento</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={editing.dia}
                    onChange={(e) =>
                      setEditing({ ...editing, dia: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })
                    }
                  />
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <Label>Data de vencimento</Label>
                  <Input
                    type="date"
                    value={editing.vencimento || ""}
                    onChange={(e) => setEditing({ ...editing, vencimento: e.target.value })}
                  />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label>Observação</Label>
                <Input
                  value={editing.observacao || ""}
                  onChange={(e) => setEditing({ ...editing, observacao: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button className="rounded-full" onClick={salvar}>
              Salvar conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="rounded-3xl border-border/60 p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}
