import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead, CONTATO_WHATSAPP } from "@/components/legal-page";

export const Route = createFileRoute("/legal/privacidade")({
  head: () => legalHead("Política de Privacidade — Lucrando com Papel", "Como o Lucrando com Papel coleta, usa e protege seus dados pessoais conforme a LGPD."),
  component: () => (
    <LegalPage titulo="Política de Privacidade">
      <p>Esta política explica como o Lucrando com Papel trata dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).</p>
      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail e senha (a senha é guardada de forma criptografada; nem nós conseguimos vê-la).</li>
        <li><strong>Perfil (opcional):</strong> WhatsApp, cidade, logo e nome do ateliê.</li>
        <li><strong>Dados do seu negócio:</strong> materiais, produtos, pedidos, orçamentos, clientes, caixa e custos que você mesma cadastra.</li>
        <li><strong>Pagamento:</strong> plano escolhido e situação do pagamento. Dados de cartão são tratados apenas pelo Mercado Pago; não recebemos nem guardamos número de cartão.</li>
      </ul>
      <p>Não usamos ferramentas de rastreamento de publicidade, pixels de redes sociais nem vendemos dados.</p>
      <h2>2. Para que usamos</h2>
      <ul>
        <li>Criar e manter sua conta e sincronizar seus dados entre aparelhos (execução de contrato).</li>
        <li>Liberar e controlar o plano contratado (execução de contrato).</li>
        <li>Recuperação de senha e avisos sobre a conta (execução de contrato).</li>
        <li>Cumprir obrigações legais e prevenir fraudes (obrigação legal e legítimo interesse).</li>
      </ul>
      <h2>3. Dados de seus clientes</h2>
      <p>Os dados de clientes que você cadastra pertencem ao seu negócio. Você é a controladora desses dados e o Lucrando com Papel atua apenas como operador, guardando-os para você. Cadastre somente o necessário e tenha base legal para usá-los.</p>
      <h2>4. Compartilhamento</h2>
      <p>Compartilhamos dados apenas com fornecedores essenciais ao serviço: hospedagem e banco de dados em nuvem e Mercado Pago (pagamentos). O catálogo público só exibe o que você decidir publicar.</p>
      <h2>5. Segurança</h2>
      <p>Conexão criptografada (HTTPS), senhas criptografadas e regras de acesso que impedem uma conta de ver os dados de outra.</p>
      <h2>6. Por quanto tempo guardamos</h2>
      <p>Enquanto a conta estiver ativa. Após pedido de exclusão, os dados são apagados, exceto os que a lei exige manter (por exemplo, registros de pagamento).</p>
      <h2>7. Seus direitos</h2>
      <p>Você pode pedir confirmação, acesso, correção, portabilidade (o app já permite exportar backup), anonimização ou exclusão dos seus dados e revogar consentimentos, pelo WhatsApp {CONTATO_WHATSAPP}. Também pode reclamar à ANPD.</p>
      <h2>8. Menores</h2>
      <p>O serviço é destinado a maiores de 18 anos.</p>
    </LegalPage>
  ),
});
