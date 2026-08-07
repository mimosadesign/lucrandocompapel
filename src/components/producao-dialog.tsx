import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, PackageMinus, Clock, ListChecks, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { brl } from "@/lib/storage";

export type MaterialRow = {
  id: string;
  nome: string;
  valorPago: number;
  quantidade: number;
  estoque: number;
  estoqueMinimo?: number;
};

export type ProducaoMaterial = { materialId: string; qtd: number };
export type ProducaoEtapa = { id: string; nome: string; minutos: number; feito: boolean };
export type Producao = {
  materiais: ProducaoMaterial[];
  etapas: ProducaoEtapa[];
  baixaFeita?: boolean;
};

const ETAPAS_PADRAO: ProducaoEtapa[] = [
  { id: "corte", nome: "Ordem de corte", minutos: 15, feito: false },
  { id: "impressao", nome: "Impressão", minutos: 10, feito: false },
  { id: "montagem", nome: "Montagem", minutos: 30, feito: false },
  { id: "acabamento", nome: "Acabamento", minutos: 20, feito: false },
];

const MATERIAIS_KEY = "lcp:materiais";

function loadMateriais(): MaterialRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(scopedKey(MATERIAIS_KEY));
    return raw ? (JSON.parse(raw) as MaterialRow[]) : [];
  } catch {
    return [];
  }
}

function saveMateriais(list: MaterialRow[]) {
  try {
    localStorage.setItem(scopedKey(MATERIAIS_KEY), JSON.stringify(list));
    window.dispatchEvent(new Event("lcp:materiais-updated"));
  } catch {
    /* ignore */
  }
}

export function ProducaoDialog({
  open,
  onOpenChange,
  pedidoTitulo,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pedidoTitulo: string;
  value: Producao | undefined;
  onChange: (p: Producao) => void;
}) {
  const [materiaisCatalog, setMateriaisCatalog] = useState<MaterialRow[]>([]);
  const [draft, setDraft] = useState<Producao>({
    materiais: value?.materiais ?? [],
    etapas: value?.etapas ?? ETAPAS_PADRAO.map((e) => ({ ...e })),
    baixaFeita: value?.baixaFeita ?? false,
  });

  useEffect(() => {
    if (!open) return;
    setMateriaisCatalog(loadMateriais());
    setDraft({
      materiais: value?.materiais ?? [],
      etapas: value?.etapas?.length ? value.etapas : ETAPAS_PADRAO.map((e) => ({ ...e })),
      baixaFeita: value?.baixaFeita ?? false,
    });
  }, [open, value]);

  const custoTotal = useMemo(() => {
    return draft.materiais.reduce((sum, r) => {
      const m = materiaisCatalog.find((x) => x.id === r.materialId);
      if (!m) return sum;
      const unit = m.quantidade > 0 ? m.valorPago / m.quantidade : 0;
      return sum + unit * (r.qtd || 0);
    }, 0);
  }, [draft.materiais, materiaisCatalog]);

  const tempoTotal = useMemo(
    () => draft.etapas.reduce((s, e) => s + (Number(e.minutos) || 0), 0),
    [draft.etapas],
  );

  const progresso = useMemo(() => {
    const feitas = draft.etapas.filter((e) => e.feito).length;
    return { feitas, total: draft.etapas.length };
  }, [draft.etapas]);

  function addMaterialRow() {
    setDraft((d) => ({ ...d, materiais: [...d.materiais, { materialId: "", qtd: 1 }] }));
  }
  function updateMaterialRow(i: number, patch: Partial<ProducaoMaterial>) {
    setDraft((d) => {
      const arr = [...d.materiais];
      arr[i] = { ...arr[i], ...patch };
      return { ...d, materiais: arr };
    });
  }
  function removeMaterialRow(i: number) {
    setDraft((d) => ({ ...d, materiais: d.materiais.filter((_, idx) => idx !== i) }));
  }

  function addEtapa() {
    setDraft((d) => ({
      ...d,
      etapas: [
        ...d.etapas,
        { id: crypto.randomUUID(), nome: "Nova etapa", minutos: 10, feito: false },
      ],
    }));
  }
  function updateEtapa(i: number, patch: Partial<ProducaoEtapa>) {
    setDraft((d) => {
      const arr = [...d.etapas];
      arr[i] = { ...arr[i], ...patch };
      return { ...d, etapas: arr };
    });
  }
  function removeEtapa(i: number) {
    setDraft((d) => ({ ...d, etapas: d.etapas.filter((_, idx) => idx !== i) }));
  }

  function darBaixa() {
    if (draft.baixaFeita) {
      toast.info("A baixa de estoque desta ficha já foi feita.");
      return;
    }
    if (draft.materiais.length === 0) {
      toast.error("Adicione ao menos um material antes de dar baixa.");
      return;
    }
    const atual = loadMateriais();
    // valida estoque
    const faltando: string[] = [];
    for (const r of draft.materiais) {
      const m = atual.find((x) => x.id === r.materialId);
      if (!m) continue;
      if ((m.estoque ?? 0) < (r.qtd || 0)) {
        faltando.push(`${m.nome} (tem ${m.estoque}, precisa ${r.qtd})`);
      }
    }
    if (faltando.length) {
      toast.error(`Estoque insuficiente: ${faltando.join("; ")}`);
      return;
    }
    const atualizados = atual.map((m) => {
      const uso = draft.materiais.find((r) => r.materialId === m.id);
      if (!uso) return m;
      return { ...m, estoque: Math.max(0, (m.estoque ?? 0) - (uso.qtd || 0)) };
    });
    saveMateriais(atualizados);
    setMateriaisCatalog(atualizados);
    setDraft((d) => ({ ...d, baixaFeita: true }));
    toast.success("Baixa de estoque realizada.");
  }

  function salvar() {
    onChange(draft);
    onOpenChange(false);
  }

  function compartilharChecklist() {
    const linhas: string[] = [`Ficha de produção — ${pedidoTitulo}`, ""];
    if (draft.materiais.length) {
      linhas.push("Materiais:");
      for (const r of draft.materiais) {
        const m = materiaisCatalog.find((x) => x.id === r.materialId);
        linhas.push(`• ${m?.nome ?? "?"} — ${r.qtd} un.`);
      }
      linhas.push("");
    }
    linhas.push("Etapas:");
    for (const e of draft.etapas) {
      linhas.push(`${e.feito ? "☑" : "☐"} ${e.nome} (${e.minutos} min)`);
    }
    linhas.push("", `Tempo estimado: ${tempoTotal} min`);
    const texto = encodeURIComponent(linhas.join("\n"));
    window.open(`https://wa.me/?text=${texto}`, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> Centro de Produção
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{pedidoTitulo}</p>
        </DialogHeader>

        <div className="grid gap-5">
          {/* Materiais */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-semibold">Materiais que serão usados</Label>
              <Button variant="ghost" size="sm" className="rounded-full gap-1" onClick={addMaterialRow}>
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            {materiaisCatalog.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum material cadastrado. Vá em <strong>Materiais</strong> para cadastrar.
              </p>
            )}
            {draft.materiais.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum material adicionado ainda.</p>
            ) : (
              <div className="space-y-2">
                {draft.materiais.map((row, i) => {
                  const m = materiaisCatalog.find((x) => x.id === row.materialId);
                  const unit = m && m.quantidade > 0 ? m.valorPago / m.quantidade : 0;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <Select
                        value={row.materialId}
                        onValueChange={(v) => updateMaterialRow(i, { materialId: v })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione um material" />
                        </SelectTrigger>
                        <SelectContent>
                          {materiaisCatalog.map((mm) => (
                            <SelectItem key={mm.id} value={mm.id}>
                              {mm.nome} · estoque {mm.estoque}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        className="w-20"
                        value={row.qtd}
                        onChange={(e) =>
                          updateMaterialRow(i, { qtd: parseFloat(e.target.value) || 0 })
                        }
                      />
                      <span className="w-24 text-xs text-muted-foreground text-right">
                        {brl(unit * (row.qtd || 0))}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-destructive"
                        onClick={() => removeMaterialRow(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            <Card className="mt-3 rounded-2xl bg-secondary/50 p-3 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Custo estimado dos materiais</span>
              <span className="font-display text-base font-semibold">{brl(custoTotal)}</span>
            </Card>
          </section>

          {/* Etapas */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-semibold">Etapas de produção</Label>
              <Button variant="ghost" size="sm" className="rounded-full gap-1" onClick={addEtapa}>
                <Plus className="h-3.5 w-3.5" /> Etapa
              </Button>
            </div>
            <div className="space-y-2">
              {draft.etapas.map((e, i) => (
                <div key={e.id} className="flex items-center gap-2 rounded-2xl border border-border/60 px-3 py-2">
                  <Checkbox
                    checked={e.feito}
                    onCheckedChange={(c) => updateEtapa(i, { feito: c === true })}
                  />
                  <Input
                    value={e.nome}
                    onChange={(ev) => updateEtapa(i, { nome: ev.target.value })}
                    className="flex-1 h-8 border-0 bg-transparent focus-visible:ring-0"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={e.minutos}
                    onChange={(ev) => updateEtapa(i, { minutos: parseFloat(ev.target.value) || 0 })}
                    className="w-20 h-8"
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-destructive h-8 w-8"
                    onClick={() => removeEtapa(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Card className="rounded-2xl bg-secondary/50 p-3 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Tempo total
                </div>
                <p className="font-display text-lg font-semibold mt-0.5">
                  {tempoTotal} min {tempoTotal >= 60 && `(~${(tempoTotal / 60).toFixed(1)}h)`}
                </p>
              </Card>
              <Card className="rounded-2xl bg-secondary/50 p-3 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Progresso
                </div>
                <p className="font-display text-lg font-semibold mt-0.5">
                  {progresso.feitas} / {progresso.total} etapas
                </p>
              </Card>
            </div>
          </section>

          {/* Baixa */}
          <section>
            <Card
              className={`rounded-2xl p-4 ${draft.baixaFeita ? "border-success/40 bg-success/10" : "border-primary/30 bg-primary/5"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <PackageMinus className="h-4 w-4" /> Baixa automática de estoque
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {draft.baixaFeita
                      ? "Estoque já foi debitado para esta ficha."
                      : "Debita as quantidades acima do seu estoque de materiais."}
                  </p>
                </div>
                <Button
                  className="rounded-full"
                  onClick={darBaixa}
                  disabled={draft.baixaFeita || draft.materiais.length === 0}
                >
                  {draft.baixaFeita ? "Baixa feita" : "Dar baixa agora"}
                </Button>
              </div>
            </Card>
          </section>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="rounded-full" onClick={compartilharChecklist}>
            Compartilhar no WhatsApp
          </Button>
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="rounded-full" onClick={salvar}>
              Salvar ficha
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
