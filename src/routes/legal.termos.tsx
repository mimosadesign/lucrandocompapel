import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, legalHead, CONTATO_WHATSAPP } from "@/components/legal-page";

export const Route = createFileRoute("/legal/termos")({
  head: () => legalHead("Termos de Uso — Lucrando com Papel", "Regras de uso do Lucrando com Papel, planos, responsabilidades e limitações."),
  component: () => (
    <LegalPage titulo="Termos de Uso">
      <p>Ao criar uma conta você concorda com estes termos.</p>
      <h2>1. O serviço</h2>
      <p>O Lucrando com Papel é uma ferramenta de apoio à gestão e precificação. Os cálculos, sugestões de preço, projeções e estimativas (inclusive o 13º e a inteligência financeira) dependem dos dados que você informa e <strong>não constituem consultoria contábil, fiscal, jurídica ou garantia de lucro</strong>. As decisões do seu negócio são de sua responsabilidade.</p>
      <h2>2. Conta</h2>
      <p>Você deve ter 18 anos ou mais, informar dados verdadeiros e manter sua senha em sigilo. Uma conta é pessoal.</p>
      <h2>3. Planos</h2>
      <ul>
        <li>Teste grátis de 25 dias com recursos Diamante; depois, a conta passa ao plano gratuito, com limites.</li>
        <li>Plano Diamante mensal ou trimestral: acesso pelo período pago. Sem renovação, a conta volta ao plano gratuito no vencimento, mantendo os dados.</li>
        <li>Plano vitalício: acesso enquanto o serviço for oferecido.</li>
        <li>Os preços exibidos na tela de planos podem mudar para novas contratações, sem afetar períodos já pagos.</li>
      </ul>
      <h2>4. Uso permitido</h2>
      <p>É proibido usar o app para atividades ilegais, enviar conteúdo de terceiros sem autorização (fotos, marcas) ou tentar acessar dados de outras contas. Você é responsável pelas imagens e textos que publica no catálogo.</p>
      <h2>5. Disponibilidade</h2>
      <p>Buscamos manter o serviço sempre no ar, mas podem ocorrer interrupções. Recomendamos exportar backups periodicamente.</p>
      <h2>6. Propriedade intelectual</h2>
      <p>A marca, o design e o software pertencem ao Lucrando com Papel. Os dados e imagens que você cadastra continuam sendo seus.</p>
      <h2>7. Reembolso e cancelamento</h2>
      <p>Veja a <Link to="/legal/reembolso" className="underline">Política de Reembolso</Link>.</p>
      <h2>8. Contato e foro</h2>
      <p>Dúvidas: WhatsApp {CONTATO_WHATSAPP}. Aplica-se a legislação brasileira, incluindo o Código de Defesa do Consumidor.</p>
    </LegalPage>
  ),
});
