import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPaymentSettings, savePaymentSettings } from "@/lib/payments.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

export function AdminPagamentos() {
  const getFn = useServerFn(getPaymentSettings);
  const saveFn = useServerFn(savePaymentSettings);
  const { data, refetch } = useQuery({ queryKey: ["pay-settings"], queryFn: () => getFn() });
  const [token, setToken] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(provider: "whatsapp" | "mercadopago") {
    setSalvando(true);
    try {
      await saveFn({ data: { provider, token } });
      setToken("");
      toast.success(provider === "mercadopago" ? "Mercado Pago ativado!" : "Pagamento via WhatsApp ativado.");
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const ativo = data?.provider === "mercadopago" && data?.mercadopagoEnabled;

  return (
    <Card className="mb-6 rounded-3xl border-border/60 p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <p className="font-display text-lg font-semibold">Pagamento dos planos</p>
        <span
          className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${
            ativo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          {ativo ? "Mercado Pago ativo" : "WhatsApp (manual)"}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Cole o Access Token de produção do Mercado Pago (Seu negócio → Credenciais). A chave é
        conferida antes de salvar e nunca aparece inteira. Pagamentos aprovados liberam o Diamante
        automaticamente.
      </p>
      {data?.temToken && (
        <p className="mt-2 text-xs text-muted-foreground">Chave salva: {data.tokenMascarado}</p>
      )}
      <Input
        className="mt-3"
        type="password"
        placeholder="APP_USR-..."
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="rounded-full" disabled={salvando} onClick={() => salvar("mercadopago")}>
          {data?.temToken && !token ? "Ativar Mercado Pago" : "Salvar chave e ativar"}
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          disabled={salvando}
          onClick={() => salvar("whatsapp")}
        >
          Usar só WhatsApp
        </Button>
      </div>
    </Card>
  );
}
