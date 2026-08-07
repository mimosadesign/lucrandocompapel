import { useRef, useState } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Moon,
  Sun,
  DatabaseBackup,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDarkMode } from "@/lib/theme";
import { toast } from "sonner";

type Row = Record<string, unknown>;

function baixarArquivo(nome: string, conteudo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Row[]): string {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [
    cols.join(";"),
    ...rows.map((r) => cols.map((c) => esc(r[c])).join(";")),
  ].join("\n");
}

function parseCsv(text: string): Row[] {
  const linhas = text.trim().split(/\r?\n/);
  if (linhas.length < 2) return [];
  const sep = linhas[0].includes(";") ? ";" : ",";
  const limpa = (s: string) => s.trim().replace(/^"|"$/g, "").replace(/""/g, '"');
  const cols = linhas[0].split(sep).map(limpa);
  return linhas.slice(1).map((l) => {
    const partes = l.split(sep).map(limpa);
    const row: Row = {};
    cols.forEach((c, i) => (row[c] = partes[i] ?? ""));
    return row;
  });
}

function lerLista(key: string): Row[] {
  try {
    const raw = localStorage.getItem(scopedKey(key));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Row[]) : [];
  } catch {
    return [];
  }
}

function num(v: unknown): number {
  const s = String(v ?? "").replace(/[^\d,.-]/g, "").replace(".", "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

const EXPORTAVEIS: Array<{ key: string; nome: string }> = [
  { key: "lcp:materiais", nome: "materiais" },
  { key: "lcp:produtos", nome: "produtos" },
  { key: "lcp:pedidos", nome: "pedidos" },
  { key: "lcp:orcamentos", nome: "orcamentos" },
  { key: "lcp:clientes", nome: "clientes" },
];

export function FerramentasCard() {
  const { dark, setDark } = useDarkMode();
  const backupRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  function exportarCsv(key: string, nome: string) {
    const rows = lerLista(key);
    if (!rows.length) {
      toast.error(`Nenhum dado em ${nome} para exportar.`);
      return;
    }
    baixarArquivo(
      `${nome}-${new Date().toISOString().slice(0, 10)}.csv`,
      "\uFEFF" + toCsv(rows),
      "text/csv;charset=utf-8",
    );
    toast.success(`${nome} exportado! Abra no Excel ou Google Sheets.`);
  }

  function fazerBackup() {
    const dados: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const prefixo = scopedKey("lcp:").slice(0, -4);
      if (!k || !k.startsWith(`${prefixo}lcp:`)) continue;
      const limpo = k.slice(prefixo.length);
      try {
        dados[limpo] = JSON.parse(localStorage.getItem(k) ?? "null");
      } catch {
        dados[limpo] = localStorage.getItem(k);
      }
    }
    baixarArquivo(
      `backup-lucrando-com-papel-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ versao: 1, criadoEm: new Date().toISOString(), dados }, null, 2),
      "application/json",
    );
    toast.success("Backup gerado! Guarde o arquivo em um lugar seguro.");
  }

  async function restaurarBackup(file: File) {
    setBusy(true);
    try {
      const parsed = JSON.parse(await file.text()) as { dados?: Record<string, unknown> };
      const dados = parsed?.dados;
      if (!dados || typeof dados !== "object") throw new Error("formato");
      Object.entries(dados).forEach(([k, v]) => {
        if (!k.startsWith("lcp:")) return;
        localStorage.setItem(scopedKey(k), JSON.stringify(v));
      });
      toast.success("Backup restaurado! Recarregando...");
      setTimeout(() => window.location.reload(), 900);
    } catch {
      toast.error("Arquivo de backup inválido.");
    } finally {
      setBusy(false);
    }
  }

  async function importarMateriais(file: File) {
    setBusy(true);
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error("vazio");
      const atuais = lerLista("lcp:materiais");
      const novos = rows.map((r) => ({
        id: crypto.randomUUID(),
        nome: String(r["nome"] ?? r["Nome"] ?? "").trim() || "Sem nome",
        fornecedor: String(r["fornecedor"] ?? r["Fornecedor"] ?? ""),
        valorPago: num(r["valorPago"] ?? r["valor"] ?? r["Valor"]),
        quantidade: num(r["quantidade"] ?? r["Quantidade"]),
        estoque: num(r["estoque"] ?? r["Estoque"]),
        estoqueMinimo: num(r["estoqueMinimo"] ?? r["estoque minimo"]),
      }));
      localStorage.setItem(scopedKey("lcp:materiais"), JSON.stringify([...atuais, ...novos]));
      toast.success(`${novos.length} materiais importados! Recarregando...`);
      setTimeout(() => window.location.reload(), 900);
    } catch {
      toast.error("CSV inválido. Use as colunas: nome;fornecedor;valorPago;quantidade;estoque;estoqueMinimo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15">
          <DatabaseBackup className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium">Ferramentas e dados</p>
          <p className="text-sm text-muted-foreground">
            Tema, exportações, backup e importação em massa.
          </p>
        </div>
      </div>

      {/* Tema escuro */}
      <div className="flex items-center justify-between rounded-2xl border border-border/60 p-4">
        <div className="flex items-center gap-3">
          {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <div>
            <Label className="font-medium">Tema escuro</Label>
            <p className="text-xs text-muted-foreground">
              Deixa o app com fundo escuro, ideal para uso à noite.
            </p>
          </div>
        </div>
        <Switch checked={dark} onCheckedChange={setDark} aria-label="Tema escuro" />
      </div>

      {/* Exportações */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Exportar dados (Excel / CSV)
        </Label>
        <div className="flex flex-wrap gap-2">
          {EXPORTAVEIS.map((e) => (
            <Button
              key={e.key}
              variant="outline"
              size="sm"
              className="rounded-full border-foreground/20 gap-2 capitalize"
              onClick={() => exportarCsv(e.key, e.nome)}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> {e.nome}
            </Button>
          ))}
        </div>
      </div>

      {/* Backup */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Backup e restauração
        </Label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full border-foreground/20 gap-2"
            onClick={fazerBackup}
            disabled={busy}
          >
            <Download className="h-4 w-4" /> Baixar backup
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-foreground/20 gap-2"
            onClick={() => backupRef.current?.click()}
            disabled={busy}
          >
            <Upload className="h-4 w-4" /> Restaurar backup
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-foreground/20 gap-2"
            onClick={() => csvRef.current?.click()}
            disabled={busy}
          >
            <Upload className="h-4 w-4" /> Importar materiais (CSV)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          CSV de materiais: colunas <strong>nome;fornecedor;valorPago;quantidade;estoque;estoqueMinimo</strong>.
        </p>
        <input
          ref={backupRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void restaurarBackup(f);
          }}
        />
        <input
          ref={csvRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void importarMateriais(f);
          }}
        />
      </div>
    </Card>
  );
}
