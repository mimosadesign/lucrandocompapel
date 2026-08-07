import { useState } from "react";
import { BookMarked, Plus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocalState } from "@/lib/storage";
import { openDiamondDialog, useIsUnlimited } from "@/lib/auth";

export type FormulaItemMaterial = { materialId: string; quantidade: number };

export type Formula = {
  id: string;
  nome: string;
  materiais: FormulaItemMaterial[];
  minutos: number;
  folhasUsadas: number;
  minutosCorte: number;
  paginasImpressas: number;
  usaTesoura: boolean;
  minutosCorteManual: number;
  criadaEm: string;
};

const FREE_LIMIT = 5;

export function FormulasCofre({
  atual,
  onAplicar,
  nomesMateriais,
}: {
  atual: Omit<Formula, "id" | "nome" | "criadaEm">;
  onAplicar: (f: Formula) => void;
  nomesMateriais: (ids: string[]) => string[];
}) {
  const [formulas, setFormulas] = useLocalState<Formula[]>("lcp:formulas", []);
  const [nome, setNome] = useState("");
  const unlimited = useIsUnlimited();

  function salvar() {
    const n = nome.trim();
    if (!n) {
      toast.error("Dê um nome para a fórmula (ex.: Laço Boutique).");
      return;
    }
    if (!unlimited && formulas.length >= FREE_LIMIT) {
      toast.error(
        `Plano gratuito guarda ${FREE_LIMIT} fórmulas. Assine o Diamante para fórmulas ilimitadas.`,
      );
      openDiamondDialog();
      return;
    }
    if (!atual.materiais.length && !atual.minutos) {
      toast.error("Monte o item primeiro (materiais e tempo) para salvar a fórmula.");
      return;
    }
    setFormulas([
      ...formulas,
      { ...atual, id: crypto.randomUUID(), nome: n, criadaEm: new Date().toISOString() },
    ]);
    setNome("");
    toast.success(`Fórmula "${n}" guardada no cofre!`);
  }

  return (
    <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
          <BookMarked className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="font-display text-base font-semibold">Cofre de Fórmulas</p>
          <p className="text-sm text-muted-foreground">
            Salve receitas prontas (ex.: Laço Boutique = 2 folhas + 1 m de fita + cola) e
            aplique em 1 clique na próxima precificação.
            {unlimited ? " Ilimitado no Diamante." : ` Grátis: ${FREE_LIMIT} fórmulas.`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da fórmula (ex.: Caixa Milk)"
          className="h-11 rounded-full border-border/70 bg-background px-4"
        />
        <Button className="h-11 rounded-full gap-2" onClick={salvar}>
          <Plus className="h-4 w-4" /> Salvar fórmula atual
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="rounded-full">
          {unlimited
            ? `${formulas.length} fórmulas · ilimitado`
            : `${formulas.length} / ${FREE_LIMIT} fórmulas (plano gratuito)`}
        </Badge>
        {!unlimited && formulas.length >= FREE_LIMIT && (
          <button
            type="button"
            onClick={openDiamondDialog}
            className="text-xs font-medium text-primary underline underline-offset-2"
          >
            Liberar ilimitado no Diamante
          </button>
        )}
      </div>

      {formulas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma fórmula guardada ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {formulas.map((f) => {
            const nomes = nomesMateriais(f.materiais.map((m) => m.materialId));
            return (
              <div
                key={f.id}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background/60 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {nomes.length ? nomes.join(" + ") : "Sem materiais"} · {f.minutos} min
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {f.materiais.length} itens
                </Badge>
                <Button
                  size="sm"
                  className="rounded-full gap-1.5"
                  onClick={() => {
                    onAplicar(f);
                    toast.success(`Fórmula "${f.nome}" aplicada.`);
                  }}
                >
                  <Wand2 className="h-3.5 w-3.5" /> Aplicar
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full text-destructive"
                  onClick={() => setFormulas(formulas.filter((x) => x.id !== f.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
