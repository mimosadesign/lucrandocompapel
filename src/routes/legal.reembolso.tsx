import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead, CONTATO_WHATSAPP } from "@/components/legal-page";

export const Route = createFileRoute("/legal/reembolso")({
  head: () => legalHead("Política de Reembolso — Lucrando com Papel", "Direito de arrependimento, cancelamento e reembolso dos planos do Lucrando com Papel."),
  component: () => (
    <LegalPage titulo="Política de Reembolso e Cancelamento">
      <h2>1. Direito de arrependimento (7 dias)</h2>
      <p>Conforme o art. 49 do Código de Defesa do Consumidor, você pode desistir da compra em até 7 dias corridos após o pagamento e receber o valor integral de volta.</p>
      <h2>2. Cancelamento</h2>
      <p>Os planos mensal e trimestral não renovam sozinhos: basta não pagar o próximo período. O acesso Diamante continua até o fim do período já pago.</p>
      <h2>3. Após 7 dias</h2>
      <p>Não há reembolso proporcional de períodos já iniciados, salvo falha do serviço que impeça o uso ou cobrança indevida, casos em que devolvemos o valor correspondente.</p>
      <h2>4. Como pedir</h2>
      <p>Envie mensagem para o WhatsApp {CONTATO_WHATSAPP} com o e-mail da conta. O reembolso é feito pelo mesmo meio de pagamento (Mercado Pago ou Pix), em até 10 dias úteis após a confirmação; o prazo de aparecer na fatura do cartão depende da operadora.</p>
    </LegalPage>
  ),
});
