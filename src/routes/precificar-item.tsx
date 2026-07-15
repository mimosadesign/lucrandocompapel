import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, Scissors, Layers, Package, Clock, Calculator } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/money-input";
import { useLocalState, brl } from "@/lib/storage";

export const Route = createFileRoute("/precificar-item")({
  head: () => ({ meta: [{ title: "Precificar Item — Lucrando com Papel" }] }),
  component: PrecificarItemPage,
});

type Material = {
  id: string;
  nome: string;
  valorPago: number;
  quantidade: number;
};

type ItemMaterial = {
  id: string;
  materialId: string;
  quantidade: number;
};

type PrecItem = {
  id: string;
  nome: string;
  minutos: number;
  materiais: ItemMaterial[];
  folhasUsadas: number;
  minutosCorte: number;
};

type MaquinaCfg = {
  valorBase: number;
  folhasPorBase: number;
  valorLamina: number;
  vidaLaminaMeses: number;
  horasCorteMes: number;
};

function loadMateriais(): Material[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("lcp:materiais");
    return raw ? (JSON.parse(raw) as Material[]) : [];
  } catch {
    return [];
  }
}

function PrecificarItemPage() {
  const [materiais, setMateriais] = useState<Material[]>([]);
  useEffect(() => {
    setMateriais(loadMateriais());
    const onStorage = () => setMateriais(loadMateriais());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [valorHora] = useLocalState<number>("lcp:valorHora", 0);

  const [maquina, setMaquina] = useLocalState<MaquinaCfg>("lcp:maquina", {
    valorBase: 0,
    folhasPorBase: 0,
    valorLamina: 0,
    vidaLaminaMeses: 0,
    horasCorteMes: 0,
  });

  const [item, setItem] = useLocalState<PrecItem>("lcp:precItem:atual", {
    id: crypto.randomUUID(),
    nome: "",
    minutos: 0,
    materiais: [],
    folhasUsadas: 0,
    minutosCorte: 0,
  });

  const [salvos, setSalvos] = useLocalState<PrecItem[]>("lcp:precItens", []);

  // ==== Cálculos ====
  const custoBasePorFolha =
    maquina.folhasPorBase > 0 ? maquina.valorBase / maquina.folhasPorBase : 0;
  const custoLaminaMes =
    maquina.vidaLaminaMeses > 0 ? maquina.valorLamina / maquina.vidaLaminaMeses : 0;
  const custoLaminaHora =
    maquina.horasCorteMes > 0 ? custoLaminaMes / maquina.horasCorteMes : 0;

  const custoMateriais = useMemo(() => {
    return item.materiais.reduce((sum, im) => {
      const m = materiais.find((x) => x.id === im.materialId);
      if (!m) return sum;
      const unit = m.quantidade > 0 ? m.valorPago / m.quantidade : 0;
      return sum + unit * im.quantidade;
    }, 0);
  }, [item.materiais, materiais]);

  const custoMaoDeObra = (valorHora / 60) * item.minutos;
  const custoBaseCorte = custoBasePorFolha * item.folhasUsadas;
  const custoLaminaItem = (custoLaminaHora / 60) * item.minutosCorte;
  const custoTotal =
    custoMateriais + custoMaoDeObra + custoBaseCorte + custoLaminaItem;

  function addMaterial() {
    setItem({
      ...item,
      materiais: [
        ...item.materiais,
        { id: crypto.randomUUID(), materialId: "", quantidade: 1 },
      ],
    });
  }
  function removeMaterial(id: string) {
    setItem({ ...item, materiais: item.materiais.filter((x) => x.id !== id) });
  }
  function updateMat(id: string, patch: Partial<ItemMaterial>) {
    setItem({
      ...item,
      materiais: item.materiais.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    });
  }

  function salvar() {
    if (!item.nome.trim()) {
      toast.error("Dê um nome ao item antes de salvar.");
      return;
    }
    const existe = salvos.findIndex((s) => s.id === item.id);
    const proximo = [...salvos];
    if (existe === -1) proximo.push(item);
    else proximo[existe] = item;
    setSalvos(proximo);
    toast.success("Precificação salva!");
  }
  function novoItem() {
    setItem({
      id: crypto.randomUUID(),
      nome: "",
      minutos: 0,
      materiais: [],
      folhasUsadas: 0,
      minutosCorte: 0,
    });
  }
  function carregar(s: PrecItem) {
    setItem({ ...s });
  }
  function excluirSalvo(id: string) {
    setSalvos(salvos.filter((s) => s.id !== id));
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Precificar Item"
        description="Calcule o custo real de um produto somando materiais, mão de obra e uso da máquina de corte."
        actions={
          <Button variant="outline" className="rounded-full gap-2" onClick={novoItem}>
            <Plus className="h-4 w-4" /> Novo item
          </Button>
        }
      />

      {valorHora <= 0 && (
        <Card className="rounded-2xl border-warning/40 bg-warning/10 p-4 text-sm">
          Configure sua <strong>Precificação e Custos</strong> primeiro para calcular
          o valor da sua hora automaticamente.
        </Card>
      )}

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15">
            <Calculator className="h-4 w-4" />
          </span>
          <h2 className="font-display text-lg font-semibold">Dados do item</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Nome do item</Label>
            <Input
              value={item.nome}
              placeholder="Ex.: Convite de 15 anos"
              onChange={(e) => setItem({ ...item, nome: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Minutos de produção (mão de obra)</Label>
            <MoneyInput
              value={item.minutos}
              onChange={(n) => setItem({ ...item, minutos: n })}
              placeholder="0"
            />
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15">
            <Package className="h-4 w-4" />
          </span>
          <h2 className="font-display text-lg font-semibold">Materiais usados</h2>
        </div>

        {materiais.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum material cadastrado. Cadastre em <strong>Materiais</strong> primeiro.
          </p>
        ) : (
          <div className="space-y-3">
            {item.materiais.map((im) => {
              const m = materiais.find((x) => x.id === im.materialId);
              const unit = m && m.quantidade > 0 ? m.valorPago / m.quantidade : 0;
              const sub = unit * im.quantidade;
              return (
                <div key={im.id} className="grid gap-3 sm:grid-cols-[1fr_140px_140px_40px] items-end">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Material</Label>
                    <Select
                      value={im.materialId}
                      onValueChange={(v) => updateMat(im.id, { materialId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {materiais.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Quantidade usada</Label>
                    <MoneyInput
                      value={im.quantidade}
                      onChange={(n) => updateMat(im.id, { quantidade: n })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Subtotal</Label>
                    <div className="h-10 rounded-md border border-border/60 bg-secondary/40 px-3 flex items-center text-sm font-medium">
                      {brl(sub)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeMaterial(im.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" className="rounded-full gap-2" onClick={addMaterial}>
              <Plus className="h-4 w-4" /> Adicionar material
            </Button>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Custo total de materiais
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{brl(custoMateriais)}</p>
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15">
            <Scissors className="h-4 w-4" />
          </span>
          <h2 className="font-display text-lg font-semibold">Custo de máquina</h2>
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Layers className="h-4 w-4" /> Base de corte
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Valor da base de corte (R$)</Label>
                <MoneyInput
                  value={maquina.valorBase}
                  onChange={(n) => setMaquina({ ...maquina, valorBase: n })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Quantidade de folhas por base</Label>
                <MoneyInput
                  value={maquina.folhasPorBase}
                  onChange={(n) => setMaquina({ ...maquina, folhasPorBase: n })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Custo da base por folha</Label>
                <div className="h-11 rounded-md border border-primary/30 bg-primary/10 px-3 flex items-center font-display text-base font-semibold">
                  {brl(custoBasePorFolha)}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Scissors className="h-4 w-4" /> Lâmina de corte
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Valor da lâmina (R$)</Label>
                <MoneyInput
                  value={maquina.valorLamina}
                  onChange={(n) => setMaquina({ ...maquina, valorLamina: n })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Vida útil da lâmina (meses)</Label>
                <MoneyInput
                  value={maquina.vidaLaminaMeses}
                  onChange={(n) => setMaquina({ ...maquina, vidaLaminaMeses: n })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Tempo de corte por mês (horas)</Label>
                <MoneyInput
                  value={maquina.horasCorteMes}
                  onChange={(n) => setMaquina({ ...maquina, horasCorteMes: n })}
                />
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Custo da lâmina por mês
                </p>
                <p className="mt-1 font-display text-xl font-semibold">
                  {brl(custoLaminaMes)}
                </p>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Custo de corte da lâmina por hora
                </p>
                <p className="mt-1 font-display text-xl font-semibold">
                  {brl(custoLaminaHora)}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 pt-5">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Uso da máquina neste item
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Folhas de base usadas neste item</Label>
                <MoneyInput
                  value={item.folhasUsadas}
                  onChange={(n) => setItem({ ...item, folhasUsadas: n })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Minutos de corte neste item</Label>
                <MoneyInput
                  value={item.minutosCorte}
                  onChange={(n) => setItem({ ...item, minutosCorte: n })}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border-primary/30 bg-primary/5 p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <h2 className="font-display text-lg font-semibold">Resumo do custo do item</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Linha label="Materiais" value={brl(custoMateriais)} />
          <Linha
            label={`Mão de obra (${item.minutos} min · ${brl(valorHora)}/h)`}
            value={brl(custoMaoDeObra)}
          />
          <Linha label="Base de corte" value={brl(custoBaseCorte)} />
          <Linha label="Lâmina" value={brl(custoLaminaItem)} />
        </div>
        <div className="mt-6 rounded-2xl border border-primary/40 bg-background p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Custo total do item
          </p>
          <p className="mt-1 font-display text-3xl font-semibold text-primary">
            {brl(custoTotal)}
          </p>
        </div>
        <div className="mt-5 flex justify-end">
          <Button size="lg" className="rounded-full gap-2 px-8" onClick={salvar}>
            <Save className="h-4 w-4" /> Salvar precificação
          </Button>
        </div>
      </Card>

      {salvos.length > 0 && (
        <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 font-display text-lg font-semibold">Itens precificados</h2>
          <div className="space-y-2">
            {salvos.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{s.nome || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.materiais.length} materiais · {s.minutos} min
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => carregar(s)}>
                    Abrir
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => excluirSalvo(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}
