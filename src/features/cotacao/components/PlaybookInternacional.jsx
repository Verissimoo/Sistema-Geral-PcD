import {
  Globe, Users, TrendingUp, Banknote, Sparkles, Zap, Stamp,
  FileWarning, Skull, AlertTriangle, Building2, Shield, FileCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import {
  PlaybookHero, PlaybookSection, OverviewCards, OfferGrid, FraseBase,
  ProcessSteps, ConceptCards, Row, CriticalRules, ErrorsExcellence,
  ScenarioCard, Quiz,
} from "@/features/cotacao/components/manualPrimitives";

// ═══════════════════════════════════════════════════════════════════
//  PLAYBOOK — PASSAGEM INTERNACIONAL
// ═══════════════════════════════════════════════════════════════════

export function PlaybookInternacional() {
  return (
    <div className="space-y-8">
      <PlaybookHero
        accentColor="text-danger"
        productName="Passagem Internacional"
        subtitle="Treinamento, consulta rápida e execução comercial"
        meta={[
          { label: "Categoria", value: "Aéreo" },
          { label: "Função", value: "High ticket" },
          { label: "Plataforma", value: "Cias + Edreams + Confiança" },
          { label: "Ticket", value: "Médio a Alto" },
          { label: "Comissão", value: "25–45% + upsell" },
        ]}
      />

      <PlaybookSection number="01" title="Visão Geral" subtitle="O contexto do produto">
        <OverviewCards
          items={[
            {
              icon: Globe,
              title: "O que vendemos",
              desc: "Passagens internacionais via milhas ou dinheiro. Rotas para todo o mundo.",
            },
            {
              icon: Users,
              title: "Para quem",
              desc: "Clientes com demanda de saída do país — turismo, trabalho, evento, visita.",
            },
            {
              icon: TrendingUp,
              title: "Função comercial",
              desc: "Alto ticket médio. Oportunidade de upsell com hotel, seguro e pacote imigração.",
            },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="02" title="Quando Vender" subtitle="Critérios de oferta">
        <div className="space-y-3">
          <OfferGrid
            offer={[
              "Cliente pede cotação internacional",
              "Necessidade de saída do país",
              "Lead aponta demanda exterior",
            ]}
            dontOffer={[
              "Cliente busca voo nacional",
              "Demanda é outro produto fora do escopo",
            ]}
          />
          <FraseBase>
            Consigo montar sua passagem internacional buscando a melhor rota dentro do seu perfil,
            com segurança na emissão, clareza nas regras e suporte durante o processo.
          </FraseBase>
        </div>
      </PlaybookSection>

      <PlaybookSection number="03" title="Processo de Cotação" subtitle="6 etapas adaptadas ao internacional">
        <ProcessSteps
          steps={[
            { title: "Entender a necessidade", desc: "Validar perfil, orçamento, bagagem, flexibilidade e situação documental." },
            { title: "Visão geral do mercado", desc: "Kayak, Google Flights, SkyScanner para janelas competitivas." },
            { title: "Decidir milhas × dinheiro", desc: "Comparar custo e escolher melhor via (lucratividade + valor percebido)." },
            { title: "Trabalhar flexibilidade e quebra", desc: "Aeroportos alternativos, conexões, quebra de trechos (mín 2h30, cliente ciente)." },
            { title: "Validar rota e ferramentas", desc: "Checar na companhia, usar Edreams ou Confiança quando ajudar." },
            { title: "Montar orçamento e fechar", desc: "Proposta, negociação, follow-up, upsell hotel/pacote." },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="04" title="Conceitos-chave do internacional" subtitle="Domine antes de cotar">
        <ConceptCards
          concepts={[
            {
              icon: Banknote,
              title: "Milhas × Dinheiro",
              desc: "Mesma lógica nacional, prioridade milhas quando a conta fechar melhor.",
            },
            {
              icon: Sparkles,
              title: "Flexibilidade",
              desc: "Adaptar pesquisa ao perfil do cliente — datas, aeroportos e classes.",
            },
            {
              icon: Zap,
              title: "Quebra de Trechos",
              desc: "Intervalo mínimo de 2h30, passageiro ciente e de acordo com a operação.",
            },
            {
              icon: Stamp,
              title: "Documentação",
              desc: "Passaporte válido, visto conforme destino, vacinas exigidas.",
            },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="05" title="Ferramentas extras" subtitle="Pesquisa avançada">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <Badge variant="outline" className="w-fit mb-1 font-bold">EDREAMS</Badge>
              <CardTitle className="text-sm">Pesquisa em euro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Costuma ser mais barato que direto nas companhias. Útil para cotações internacionais.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <Badge variant="outline" className="w-fit mb-1 font-bold">CONFIANÇA</Badge>
              <CardTitle className="text-sm">Consolidadora</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Valores já incluindo comissão. Útil para destinos específicos com tarifas negociadas.
              </p>
            </CardContent>
          </Card>
        </div>
      </PlaybookSection>

      <PlaybookSection number="06" title="Documentação por destino" subtitle="Tema obrigatório de conversa">
        <Card className="border-warning/30 bg-warning/10 dark:bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-warning dark:text-warning">
              <FileWarning className="h-4 w-4" /> Verificar antes de fechar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="EUA" v="Exigem visto" />
            <Row k="Europa (Schengen)" v="Sem visto para turismo até 90 dias, passaporte válido" />
            <Row k="Colômbia" v="Pode exigir vacina febre amarela" />
            <Row k="México" v="Pode exigir autorização de entrada" />
            <Separator className="my-2" />
            <div className="text-xs font-bold uppercase tracking-wider text-warning dark:text-warning">
              Passaporte válido é tema OBRIGATÓRIO de conversa.
            </div>
          </CardContent>
        </Card>
      </PlaybookSection>

      <PlaybookSection number="07" title="Regras críticas" subtitle="O que NUNCA prometer">
        <CriticalRules
          rules={[
            "Nunca prometer cancelamento gratuito, remarcação sem custo ou entrada garantida no país.",
            "Nunca prometer visto, vacina ou autorização sem confirmar regra do trecho.",
            "Propostas parceladas: valor final com juros calculado.",
            "MB Way e TransferWise como opções de pagamento internacional.",
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="08" title="Skiplagging" subtitle="Mesmas regras do nacional">
        <Card className="border-2 border-danger/30 bg-danger/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-danger dark:text-danger">
              <Skull className="h-4 w-4" /> Atenção máxima ao oferecer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              "Explicar riscos antes de sugerir.",
              "Cliente NÃO pode permitir despacho de bagagem.",
              "NÃO associar conta de milhagem.",
              "Companhias podem penalizar — nunca vender como opção sem risco.",
            ].map((r) => (
              <div key={r} className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5" /> {r}
              </div>
            ))}
          </CardContent>
        </Card>
      </PlaybookSection>

      <PlaybookSection number="09" title="Erros vs Excelente" subtitle="Aplicado ao internacional">
        <ErrorsExcellence
          errors={[
            "Cotação mal feita",
            "Não fechar a venda",
            "Atendimento inseguro",
            "Não dominar pagamentos",
            "Não comparar valor",
          ]}
          excellence={[
            "Cotação autônoma",
            "Diagnostica perfil high ticket",
            "Explica documentação sem assustar",
            "Follow-up rápido",
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="10" title="Cenários práticos" subtitle="Aplicação real">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ScenarioCard
            label="Cenário 1"
            scenario="Casal quer Lisboa, aceita conexão, compara com outro orçamento e tem receio de fechar."
            checklist={[
              "Confirmar passaporte e Schengen antes de cotar",
              "Mostrar opção de quebra de trecho se reduzir custo",
              "Comparar com concorrente sem brigar por preço",
              "Contornar receio com prova social e suporte 24h",
              "Encerrar com follow-up agendado",
            ]}
          />
          <ScenarioCard
            label="Cenário 2"
            scenario="Cliente quer EUA e não sabe situação documental."
            checklist={[
              "Perguntar se já tem visto B1/B2 ativo",
              "Orientar a buscar consulado se não tiver",
              "Não emitir antes de visto confirmado",
              "Apresentar opções com datas flexíveis",
              "Combinar prazo de retorno com cliente",
            ]}
          />
        </div>
      </PlaybookSection>

      <PlaybookSection number="11" title="Quiz de fixação" subtitle="Confirme o domínio">
        <Quiz
          questions={[
            "Dados mínimos para emissão internacional?",
            "O que nunca prometer?",
            "Formas de pagamento aceitas?",
            "O que checar sobre documentação antes de fechar?",
            "Como conduzir conversa sobre skiplagging?",
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="12" title="Upsell" subtitle="Produtos que combinam">
        <Card className="border-success/30 bg-success/10 dark:bg-success/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-success dark:text-success flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Com quais produtos combina bem
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {[
              { icon: Building2, name: "Hotel", desc: "Via Expedia TAAP" },
              { icon: Shield, name: "Seguro Viagem", desc: "Proteção para imprevistos" },
              { icon: FileCheck, name: "Pacote Imigração", desc: "Assessoria completa de entrada" },
            ].map((u) => {
              const Icon = u.icon;
              return (
                <div key={u.name} className="flex items-start gap-3 p-3 rounded-lg bg-bg-surface dark:bg-success/10 border border-success/30">
                  <Icon className="h-5 w-5 text-success shrink-0" />
                  <div>
                    <div className="font-semibold text-success dark:text-success">{u.name}</div>
                    <div className="text-xs text-success dark:text-success mt-0.5">{u.desc}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </PlaybookSection>
    </div>
  );
}
