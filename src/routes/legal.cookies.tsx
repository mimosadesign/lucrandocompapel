import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, legalHead } from "@/components/legal-page";

export const Route = createFileRoute("/legal/cookies")({
  head: () => legalHead("Aviso de Cookies — Lucrando com Papel", "Quais cookies e armazenamento local o Lucrando com Papel usa e por quê."),
  component: () => (
    <LegalPage titulo="Aviso de Cookies">
      <p>Usamos apenas armazenamento <strong>estritamente necessário</strong> para o app funcionar:</p>
      <ul>
        <li>Sessão de login, para manter você conectada.</li>
        <li>Cópia local dos seus dados, para o app funcionar rápido e offline e sincronizar com a nuvem.</li>
        <li>Preferências, como tema escuro e avisos já fechados.</li>
      </ul>
      <p>Não usamos cookies de publicidade, de rastreamento ou de análise de terceiros. Por serem essenciais, esses itens não podem ser desligados sem impedir o funcionamento do app; você pode apagá-los saindo da conta ou limpando os dados do navegador.</p>
    </LegalPage>
  ),
});
