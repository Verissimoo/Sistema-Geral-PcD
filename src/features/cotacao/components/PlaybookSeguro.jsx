import {
  Shield, Users, Briefcase, Target, Search, Award, Calculator, Map,
  AlertTriangle, CreditCard, Banknote, Zap, Sparkles, TrendingUp,
  XCircle, HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  PlaybookHero, PlaybookSection, BigBenefitCards, OfferGrid, CollectGrid,
  ProcessSteps, PlatformCard, TicketTiers, NunPromVerify, FraseBase, Quiz,
  ObjectionCards,
} from "@/features/cotacao/components/manualPrimitives";

// ═══════════════════════════════════════════════════════════════════
//  PLAYBOOK — SEGURO VIAGEM
// ═══════════════════════════════════════════════════════════════════

export function PlaybookSeguro() {
  return (
    <div className="space-y-8">
      <PlaybookHero
        accentColor="text-success"
        productName="Seguro Viagem"
        subtitle="Guia para entender, posicionar e vender seguro viagem com empatia e resultado"
        meta={[
          { label: "Categoria", value: "Serviços" },
          { label: "Função", value: "Proteção + Upsell" },
          { label: "Plataforma", value: "CompararSeguroViagem" },
          { label: "Comissão", value: "~30%" },
          { label: "Canal", value: "WhatsApp" },
        ]}
      />

      <PlaybookSection number="01" title="Visão Geral" subtitle="O contexto do produto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Shield, title: "O que vendemos", desc: "Seguro contra imprevistos — despesas médicas, extravio, cancelamentos." },
            { icon: Users, title: "Para quem", desc: "Clientes que valorizam segurança, viajam com idosos ou pessoas com problemas de saúde." },
            { icon: Briefcase, title: "Função comercial", desc: "Upsell na compra de viagem, venda avulsa, extensão para familiares." },
            { icon: Target, title: "Que dor resolve", desc: "Medo de gastos altíssimos com medicina no exterior." },
          ].map((it) => {
            const Icon = it.icon;
            return (
              <Card key={it.title} className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm">{it.title}</CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{it.desc}</p></CardContent>
              </Card>
            );
          })}
        </div>
      </PlaybookSection>

      <PlaybookSection number="02" title="3 Benefícios" subtitle="O que o cliente leva">
        <BigBenefitCards
          benefits={[
            {
              icon: Search,
              title: "Comparação e melhores valores",
              desc: "Via CompararSeguroViagem, várias alternativas e melhor custo-benefício.",
            },
            {
              icon: Shield,
              title: "Segurança real",
              desc: "Cobertura médica, extravio, cancelamentos — tudo sem pagar do bolso.",
            },
            {
              icon: Award,
              title: "Proteção para quem precisa mais",
              desc: "Indispensável para idosos ou condições de saúde.",
            },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="03" title="Quando Oferecer" subtitle="Critérios de oferta">
        <OfferGrid
          offer={[
            "Está comprando viagem (upsell natural)",
            "Já comprou passagem em outro lugar",
            "Familiares sem cobertura",
            "Grupo com idosos",
            "Destinos com medicina cara (EUA, Europa, Japão)",
            "Demonstra preocupação com segurança",
          ]}
          dontOffer={[
            "Quer economizar ao máximo",
            "Já tem seguro válido contratado",
            "Tem seguro do cartão (mas explique a diferença!)",
            "Viagem doméstica curta",
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="04" title="O que Coletar" subtitle="Diagnóstico antes da cotação">
        <CollectGrid
          items={[
            { icon: Calculator, text: "Datas da viagem (ida e volta)" },
            { icon: Map, text: "Destino" },
            { icon: Users, text: "Quantidade e idade dos passageiros" },
            { icon: AlertTriangle, text: "Necessidades específicas (condição pré-existente, esportes?)" },
            { icon: CreditCard, text: "Seguro no cartão? (para argumentar diferença)" },
            { icon: Banknote, text: "Budget disponível" },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="05" title="Como Vender — Passo a Passo" subtitle="7 etapas com empatia">
        <ProcessSteps
          steps={[
            { title: "Identifique a abertura no momento certo", desc: "Durante a compra de viagem, não como extra no final." },
            { title: "Gere necessidade com empatia", desc: "Internação nos EUA pode custar R$ 50.000+. Tranquilize, não assuste." },
            { title: "Colete informações", desc: "Destino, datas, passageiros, coberturas especiais." },
            { title: "Acesse CompararSeguroViagem", desc: "Insira dados, apresente 2-3 opções, mostre coberturas." },
            { title: "Apresente com valor", desc: "Use a frase âncora, mostre o que está coberto, venda tranquilidade." },
            { title: "Explique limites", desc: "O que está e o que não está coberto, como acionar em emergência." },
            { title: "Feche e faça follow-up", desc: "Seguro tem prazo. Urgência aumenta perto da viagem." },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="06" title="Usando a CompararSeguroViagem" subtitle="Plataforma de cotação">
        <PlatformCard
          name="COMPARARSEGUROVIAGEM"
          description="Múltiplas seguradoras em uma única busca. Mostre comparativos e cobre o melhor custo-benefício."
          steps={[
            "Acesse a plataforma",
            "Insira os dados do cliente",
            "Compare as opções de cobertura",
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="07" title="Faixas de Ticket" subtitle="Posicionamento de cobertura">
        <TicketTiers
          tiers={[
            {
              label: "Baixo",
              badgeClass: "bg-accent hover:bg-accent text-white",
              borderClass: "border-accent/30",
              title: "Cobertura básica",
              desc: "Viagens curtas, jovens até 60, cobertura essencial.",
            },
            {
              label: "Médio",
              badgeClass: "bg-warning hover:bg-warning text-white",
              borderClass: "border-warning/30",
              title: "Cobertura ampla",
              desc: "Duração média, destinos com medicina cara, boa cobertura.",
            },
            {
              label: "Alto",
              badgeClass: "bg-accent hover:bg-accent text-white",
              borderClass: "border-accent/30",
              title: "Cobertura premium",
              desc: "Viagens longas, acima de 60 anos, condições especiais.",
            },
          ]}
          footer="Sua comissão é ~30% do valor do seguro. Quanto maior o ticket, maior seu ganho."
        />
      </PlaybookSection>

      <PlaybookSection number="08" title="Regras Críticas" subtitle="Compliance e clareza">
        <div className="space-y-3">
          <NunPromVerify
            never={[
              "Prometer que o seguro resolve todos os problemas",
              "Cobrir acima do contrato",
              "Benefícios fora da apólice",
            ]}
            always={[
              "Esclarecer limites de cada plano",
              "Explicar como acionar em emergência",
              "Explicar a diferença para o seguro do cartão",
            ]}
          />
          <Card className="border-warning/30 bg-warning/10 dark:bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-warning dark:text-warning">
                <AlertTriangle className="h-4 w-4" /> Acionar em emergência
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-warning dark:text-warning">
              Contatar a seguradora pelo número da apólice <strong>ANTES</strong> de qualquer gasto médico.
              O cliente deve ligar primeiro, autorizar atendimento, e só então proceder.
            </CardContent>
          </Card>
        </div>
      </PlaybookSection>

      <PlaybookSection number="09" title="3 Objeções" subtitle="Argumentos prontos">
        <ObjectionCards
          objections={[
            {
              q: "Está muito caro.",
              a: "Contextualize: consulta nos EUA US$ 1.500, internação US$ 30.000+. Apresente opções mais acessíveis dentro do orçamento.",
            },
            {
              q: "Já tenho seguro do cartão.",
              a: "Seguro do cartão = reembolso posterior (paga do bolso, junta comprovantes, espera meses). Seguro contratado = liga e resolve no momento.",
            },
            {
              q: "Nunca precisei.",
              a: "Lógica do seguro do carro. Ninguém contrata esperando precisar. O custo é pequeno frente à viagem toda.",
            },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="10" title="Treinamento avançado" subtitle="Linguagem e sinais">
        <div className="space-y-3">
          <FraseBase>
            É um valor a ser pago — porém é a segurança e tranquilidade para a sua viagem.
          </FraseBase>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="border-success/30 bg-success/10 dark:bg-success/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-success dark:text-success">
                  Palavras que ajudam
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {["Segurança", "Tranquilidade", "Proteção", "Praticidade", "Economia", "Suporte"].map((w) => (
                    <Badge key={w} variant="outline" className="bg-success/10 border-success/30 text-success">
                      {w}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border-danger/30 bg-danger/10 dark:bg-danger/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-danger dark:text-danger">
                  Evitar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-start gap-2"><XCircle className="h-3.5 w-3.5 text-danger mt-0.5 shrink-0" /> Termos técnicos sem explicação</div>
                <div className="flex items-start gap-2"><XCircle className="h-3.5 w-3.5 text-danger mt-0.5 shrink-0" /> Promessas excessivas</div>
                <div className="flex items-start gap-2"><XCircle className="h-3.5 w-3.5 text-danger mt-0.5 shrink-0" /> Linguagem insegura</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-warning" /> Sinais de compra — o que fazer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {[
                ["Pergunta sobre prazo", "Dê data limite para garantir o preço"],
                ["Pergunta sobre parcelamento", "Apresente opções, calcule juros"],
                ["Pergunta sobre documentos", "Liste exatamente o que precisa"],
                ["Pergunta sobre cobertura", "Mostre o resumo da apólice"],
                ["Pergunta sobre acionamento", "Explique passo a passo"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-1 md:grid-cols-2 gap-2 py-1 border-b border-border/40 last:border-0">
                  <span className="font-medium">{k}</span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-success/30 bg-success/10 dark:bg-success/5">
            <CardContent className="p-4 text-sm flex items-start gap-2 text-success dark:text-success">
              <TrendingUp className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>
                <strong>Combina com:</strong> Aéreo · Hotel · Pacote turismo
              </span>
            </CardContent>
          </Card>
        </div>
      </PlaybookSection>

      <PlaybookSection number="11" title="Perguntas de diagnóstico" subtitle="Antes de ofertar">
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-2">
            {[
              "Para onde e quando vai viajar?",
              "Quem está viajando — idades e condições de saúde?",
              "Já tem alguma cobertura ativa (cartão ou outro seguro)?",
              "O que mais te preocupa nessa viagem?",
              "Qual sua disponibilidade de orçamento para proteção?",
            ].map((p) => (
              <div key={p} className="flex items-start gap-2 text-sm">
                <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-1" /> {p}
              </div>
            ))}
          </CardContent>
        </Card>
      </PlaybookSection>

      <PlaybookSection number="12" title="Quiz de fixação" subtitle="Confirme o domínio">
        <div className="space-y-3">
          <Quiz
            questions={[
              "Quais coberturas básicas o seguro deve ter?",
              "Como diferenciar seguro contratado x seguro do cartão?",
              "Qual a frase âncora para gerar valor?",
              "Como o cliente deve acionar em emergência?",
              "Quais sinais de compra você reconhece na conversa?",
            ]}
          />
          <Card className="border-warning/30 bg-warning/10 dark:bg-warning/5">
            <CardContent className="p-4 text-sm flex items-start gap-2 text-warning dark:text-warning">
              <Sparkles className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <span>
                Seguro viagem hoje = menos de 1% do faturamento ={" "}
                <strong>enorme oportunidade de crescimento</strong>.
              </span>
            </CardContent>
          </Card>
        </div>
      </PlaybookSection>
    </div>
  );
}
