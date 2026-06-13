import {
  Plane, Users, Briefcase, Skull, AlertTriangle, HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  PlaybookHero, PlaybookSection, OverviewCards, OfferGrid, FraseBase,
  ProcessSteps, CriticalRules, ErrorsExcellence, ScenarioCard, Quiz,
} from "@/features/cotacao/components/manualPrimitives";

// ═══════════════════════════════════════════════════════════════════
//  PLAYBOOK — PASSAGEM NACIONAL
// ═══════════════════════════════════════════════════════════════════

export function PlaybookNacional() {
  const PERGUNTAS = [
    "Qual destino e origem?",
    "Ida, ida/volta ou múltiplos trechos?",
    "Datas e flexibilidade?",
    "Quantos passageiros e idades?",
    "Bagagem despachada ou só mão?",
    "Intuito: lazer, trabalho, evento, urgência?",
    "Já fez outro orçamento? O que pesou: preço, horário ou conforto?",
    "Orçamento médio ou limite máximo?",
    "Aceita conexão, horários alternativos ou aeroporto alternativo?",
  ];

  return (
    <div className="space-y-8">
      <PlaybookHero
        accentColor="text-accent"
        productName="Passagem Nacional"
        subtitle="Treinamento, consulta rápida e execução comercial"
        meta={[
          { label: "Categoria", value: "Aéreo" },
          { label: "Função", value: "Core business" },
          { label: "Plataforma", value: "Cias diretas" },
          { label: "Ticket", value: "Baixo a Alto" },
          { label: "Comissão", value: "25–45%" },
        ]}
      />

      <PlaybookSection number="01" title="Visão Geral" subtitle="O contexto do produto">
        <OverviewCards
          items={[
            {
              icon: Plane,
              title: "O que vendemos",
              desc: "Passagens aéreas dentro do Brasil via milhas ou dinheiro. Companhias: LATAM, GOL, AZUL.",
            },
            {
              icon: Users,
              title: "Para quem",
              desc: "Clientes que precisam de voo nacional — lazer, trabalho, evento ou urgência pessoal.",
            },
            {
              icon: Briefcase,
              title: "Função comercial",
              desc: "Core business da agência. Lead chega pelo marketing, vendedor foca em atender e fechar.",
            },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="02" title="Quando Vender" subtitle="Critérios de oferta">
        <div className="space-y-3">
          <OfferGrid
            offer={[
              "Cliente pede cotação de voo nacional",
              "Necessidade é deslocamento dentro do Brasil",
              "Lead do chatbot aponta demanda de aéreo nacional",
            ]}
            dontOffer={[
              "Cliente busca viagem internacional",
              "Demanda é pacote, hotel ou serviço fora do aéreo",
            ]}
          />
          <FraseBase>
            Consigo buscar a melhor opção nacional dentro do seu perfil, com segurança na emissão,
            clareza nas regras e suporte em todo o processo.
          </FraseBase>
        </div>
      </PlaybookSection>

      <PlaybookSection number="03" title="Processo de Cotação" subtitle="6 etapas até o fechamento">
        <ProcessSteps
          steps={[
            { title: "Entender a necessidade", desc: "Validar perfil, urgência, orçamento, bagagem, passageiros e flexibilidade." },
            { title: "Visão geral do mercado", desc: "Kayak, Google Flights, SkyScanner para janela de preço." },
            { title: "Interpretação de resultados", desc: "Melhor data, companhias, valor de mercado." },
            { title: "Documentar", desc: "Anotar preço da data pedida, datas mais baratas, companhias promissoras." },
            { title: "Validar na companhia", desc: "Pesquisar direto no site, comparar milhas vs dinheiro." },
            { title: "Montar orçamento e fechar", desc: "Usar Gerador de Orçamento, enviar, negociar, follow-up." },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="04" title="Perguntas do diagnóstico" subtitle="O que perguntar antes de cotar">
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-2">
            {PERGUNTAS.map((p) => (
              <div key={p} className="flex items-start gap-2 text-sm">
                <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-1" /> {p}
              </div>
            ))}
          </CardContent>
        </Card>
      </PlaybookSection>

      <PlaybookSection number="05" title="Regras e alertas críticos" subtitle="O que NUNCA pode ser dito ao cliente">
        <CriticalRules
          rules={[
            "Nunca prometer cancelamento gratuito.",
            "Nunca prometer tarifa fixa sem regra interna.",
            "Nunca assumir bagagem inclusa sem checar tarifa.",
            "Cartão parcelado: calcular juros no valor final.",
            "Boleto: confirmar reembolso e cobertura da taxa de cancelamento.",
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="06" title="Skiplagging / Hidden City" subtitle="Risco e orientação">
        <Card className="border-2 border-danger/30 bg-danger/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-danger dark:text-danger">
              <Skull className="h-4 w-4" /> Atenção máxima ao oferecer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              "Explicar riscos antes de sugerir.",
              "Voos nacionais: se houver risco de despacho obrigatório, cliente NÃO pode permitir despacho.",
              "Orientar a NÃO associar conta de milhagem (risco de invalidação).",
              "Mau tempo: pedir rota semelhante para não inviabilizar.",
              "Companhias podem penalizar — nunca vender como opção sem risco.",
            ].map((r) => (
              <div key={r} className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5" /> {r}
              </div>
            ))}
          </CardContent>
        </Card>
      </PlaybookSection>

      <PlaybookSection number="07" title="Erros comuns vs Vendedor excelente">
        <ErrorsExcellence
          errors={[
            "Cotação fraca ou incompleta",
            "Atendimento inseguro",
            "Não fechar a venda",
            "Não dominar formas de pagamento",
            "Não fazer follow-up",
          ]}
          excellence={[
            "Cotação autônoma",
            "Lê perfil do cliente antes de argumentar preço",
            "Explica regras sem enrolar",
            "Follow-up até decisão final",
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="08" title="Cenário prático" subtitle="Aplicação real">
        <ScenarioCard
          scenario="Lead de anúncio: Brasília × Salvador, ida e volta, 2 pessoas, sem bagagem, orçamento apertado. Após cotação, diz que achou mais barato e vai pensar."
          checklist={[
            "Fazer perguntas certas antes da cotação",
            "Apresentar com foco em valor percebido",
            "Comparar com concorrência sem brigar por preço",
            "Contornar objeção com senso de urgência",
            "Encerrar com follow-up bem combinado",
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="09" title="Quiz de fixação" subtitle="Confirme o domínio">
        <Quiz
          questions={[
            "Quais dados mínimos confirmar antes da emissão?",
            "Quando a reserva fica efetivamente confirmada?",
            "Em quais situações o boleto pode ser usado?",
            "O que o vendedor nunca pode prometer?",
            "O que comparar quando o cliente diz que achou mais barato?",
          ]}
        />
      </PlaybookSection>
    </div>
  );
}
