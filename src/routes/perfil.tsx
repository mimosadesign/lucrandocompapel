import { createFileRoute } from "@tanstack/react-router";
import { Save, Upload, X, ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUser, useEntitlement } from "@/lib/auth";
import { useLocalState } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [{ title: "Perfil do Ateliê — Lucrando com Papel" }] }),
  component: PerfilPage,
});

const PRESET_COLORS = ["#7C3AED", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];

function PerfilPage() {
  const { user, refresh } = useUser();
  const { isUnlimited } = useEntitlement();
  const [nome, setNome] = useState("");
  const [nomeAtelier, setNomeAtelier] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [temaCor, setTemaCor] = useState<string | null>(null);
  const [logo, setLogo] = useLocalState<string>("lcp:logo", "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogoFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem.");
      return;
    }
    setUploadingLogo(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file, 1200, 1200);
      setLogo(dataUrl);
      toast.success("Logo atualizada!");
    } catch (e) {
      toast.error("Não foi possível processar a imagem.");
    } finally {
      setUploadingLogo(false);
    }
  }

  useEffect(() => {
    if (!user?.profile) return;
    const p = user.profile;
    setNome(p.nome ?? "");
    setNomeAtelier(p.nome_atelier ?? "");
    setWhatsapp(p.whatsapp ?? "");
    setCidade(p.cidade ?? "");
    setEstado(p.estado ?? "");
    setTemaCor(p.tema_cor ?? null);
  }, [user?.profile?.id]);

  async function salvar() {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nome: nome.trim() || null,
        nome_atelier: nomeAtelier.trim() || null,
        whatsapp: whatsapp.trim() || null,
        cidade: cidade.trim() || null,
        estado: estado.trim() || null,
        tema_cor: isUnlimited ? temaCor : user.profile?.tema_cor ?? null,
      })
      .eq("id", user.id);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Perfil atualizado!");
    await refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Perfil do Ateliê"
        description="Personalize a identidade do seu negócio. Esses dados aparecem no catálogo e nos orçamentos."
      />

      <Card className="rounded-3xl border-border/60 p-6 shadow-[var(--shadow-card)] md:p-8">
        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-secondary/40 grid place-items-center">
            {logo ? (
              <img src={logo} alt="Logo do ateliê" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-display text-base font-semibold">Logo do ateliê</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Imagem quadrada de até 1200×1200 px. Será redimensionada automaticamente.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoFile(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-full gap-2 border-foreground/20"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                <Upload className="h-4 w-4" />
                {uploadingLogo ? "Processando..." : logo ? "Trocar logo" : "Enviar logo"}
              </Button>
              {logo && (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full gap-2 text-destructive"
                  onClick={() => setLogo("")}
                >
                  <X className="h-4 w-4" /> Remover
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Seu nome" value={nome} onChange={setNome} placeholder="Ex: Bia Souza" />
          <Field
            label="Nome do ateliê"
            value={nomeAtelier}
            onChange={setNomeAtelier}
            placeholder="Ex: Ateliê da Bia"
          />
          <Field
            label="WhatsApp do ateliê"
            value={whatsapp}
            onChange={setWhatsapp}
            placeholder="(11) 99999-9999"
            help="Usado no botão de finalização do catálogo"
          />
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Cidade" value={cidade} onChange={setCidade} placeholder="São Paulo" />
            <Field label="Estado" value={estado} onChange={setEstado} placeholder="SP" />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-2">
          <Button
            variant="outline"
            className="rounded-full border-foreground/20"
            onClick={() => {
              if (!user?.profile) return;
              setNome(user.profile.nome ?? "");
              setNomeAtelier(user.profile.nome_atelier ?? "");
              setWhatsapp(user.profile.whatsapp ?? "");
              setCidade(user.profile.cidade ?? "");
              setEstado(user.profile.estado ?? "");
            }}
          >
            Cancelar
          </Button>
          <Button className="rounded-full gap-2" onClick={salvar} disabled={loading}>
            <Save className="h-4 w-4" /> {loading ? "Salvando..." : "Salvar perfil"}
          </Button>
        </div>
      </Card>

      <Card className="mt-6 rounded-3xl border-diamond/30 bg-gradient-to-br from-diamond/5 to-transparent p-6 shadow-[var(--shadow-card)] md:p-8">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-diamond/20 px-2 py-0.5 text-[10px] font-semibold uppercase">
            💎 Diamante
          </span>
          <h3 className="font-display text-lg font-semibold">Personalização visual</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {isUnlimited
            ? "Escolha uma cor de destaque para o seu app."
            : "Disponível apenas no plano Diamante."}
        </p>
        <div className={`mt-5 space-y-4 ${isUnlimited ? "" : "opacity-60 pointer-events-none"}`}>
          <div className="flex flex-wrap gap-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${c}`}
                onClick={() => setTemaCor(c)}
                className={`h-10 w-10 rounded-full border-2 transition-all ${
                  temaCor === c ? "border-foreground scale-110" : "border-transparent"
                }`}
                style={{ background: c }}
              />
            ))}
            <button
              type="button"
              onClick={() => setTemaCor(null)}
              className={`h-10 px-3 rounded-full border text-xs ${
                temaCor === null ? "border-foreground" : "border-border"
              }`}
            >
              Padrão
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Cor personalizada
            </Label>
            <input
              type="color"
              value={temaCor ?? "#A8B87C"}
              onChange={(e) => setTemaCor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-transparent p-1"
              aria-label="Seletor de cor personalizada"
            />
            <Input
              value={temaCor ?? ""}
              onChange={(e) => setTemaCor(e.target.value || null)}
              placeholder="#A8B87C"
              className="h-10 w-36 rounded-full border-border/70 bg-background px-4"
            />
          </div>
        </div>
        {isUnlimited && (
          <div className="mt-5 flex justify-end">
            <Button className="rounded-full gap-2" onClick={salvar} disabled={loading}>
              <Save className="h-4 w-4" /> Salvar cor
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  help?: string;
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-11 rounded-full border-border/70 bg-background px-4"
      />
      {help && <p className="mt-1.5 text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

function resizeImageToDataUrl(file: File, maxW: number, maxH: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(maxW / width, maxH / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
