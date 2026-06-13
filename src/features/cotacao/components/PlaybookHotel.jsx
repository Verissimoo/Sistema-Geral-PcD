import {
  Building2, Users, Briefcase, Target, Sparkles, Headphones, Award,
  Calculator, ListChecks, Banknote, Map, BookMarked, Plane,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  PlaybookHero, PlaybookSection, BigBenefitCards, OfferGrid, CollectGrid,
  StepsWithTags, PlatformCard, TicketTiers, NunPromVerify, ErrorsExcellence,
  ObjectionCards,
} from "@/features/cotacao/components/manualPrimitives";

// ═══════════════════════════════════════════════════════════════════
//  PLAYBOOK — HOTEL
// ═══════════════════════════════════════════════════════════════════

export function PlaybookHotel() {
  return (
    <div className="space-y-8">
      <PlaybookHero
        accentColor="text-warning"
        productName="Hotel"
        subtitle="Guia completo para entender, posicionar e vender hospedagens com confiança e resultado"
        meta={[
          { label: "Categoria", value: "Turismo" },
          { label: "Função", value: "Estadia + Upsell" },
          { label: "Plataforma", value: "Expedia TAAP" },
          { label: "Ticket", value: "Baixo · Médio · Alto" },
          { label: "Comissão", value: "0% a 15%" },
        ]}
      />

      <PlaybookSection number="01" title="Visão Geral" subtitle="O contexto do produto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Building2, title: "O que vendemos", desc: "Estadia em hotéis, resorts, all-inclusives, casas e apartamentos. Escopo varia conforme perfil." },
            { icon: Users, title: "Para quem", desc: "Clientes que precisam de hospedagem — lazer ou business. Todos os tickets." },
            { icon: Briefcase, title: "Função comercial", desc: "Resolver necessidade de estadia e funcionar como upsell para clientes que pedem apenas aéreo." },
            { icon: Target, title: "Que dor resolve", desc: "Necessidade real de ter um lugar para ficar. Em muitos casos, indispensável." },
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

      <PlaybookSection number="02" title="3 Benefícios que o Cliente Percebe" subtitle="O que vender, além da estadia">
        <BigBenefitCards
          benefits={[
            {
              icon: Sparkles,
              title: "Cuidado e atenção",
              desc: "A agência encontra a melhor estadia avaliando detalhes que o cliente não perceberia sozinho.",
            },
            {
              icon: Headphones,
              title: "Suporte quando algo dá errado",
              desc: "Overbooking, quarto errado, problema na estadia — a agência age rapidamente.",
            },
            {
              icon: Award,
              title: "Melhores preços via Expedia TAAP",
              desc: "Tarifas exclusivas B2B melhores que o público geral.",
            },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="03" title="Quando Oferecer" subtitle="Critérios de oferta">
        <OfferGrid
          offer={[
            "Pede cotação de voos (upsell natural)",
            "Pergunta sobre hospedagem",
            "Destino exige estadia",
            "Lua de mel, férias ou negócios",
            "Demonstra interesse em resort",
          ]}
          dontOffer={[
            "Vai na casa de familiar",
            "Já tem hospedagem reservada",
            "Pedido só aéreo, sem abertura",
            "Destino próximo sem pernoite",
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="04" title="O que Coletar Antes de Cotar" subtitle="Diagnóstico do hóspede">
        <CollectGrid
          items={[
            { icon: Users, text: "Composição do grupo (família, casal, lua de mel, crianças, idosos?)" },
            { icon: Calculator, text: "Datas exatas de check-in/check-out alinhadas com voo" },
            { icon: ListChecks, text: "Regime de pensão (café, meia pensão, all-inclusive?)" },
            { icon: Banknote, text: "Faixa de investimento por noite" },
            { icon: Map, text: "Localização esperada (beira-mar, centro, perto de atrações?)" },
            { icon: BookMarked, text: "Referências ou preferências (hotel em mente?)" },
            { icon: Plane, text: "Horários de voo (para alinhar check-in/out)" },
            { icon: Sparkles, text: "Expectativa de experiência (relaxamento, aventura, trabalho?)" },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="05" title="Como Vender — Passo a Passo" subtitle="Do diagnóstico ao fechamento">
        <StepsWithTags
          steps={[
            { title: "Entenda o contexto do cliente", desc: "Ouça antes de tudo.", tags: ["Perguntas abertas", "Escuta ativa"] },
            { title: "Identifique o perfil ideal", desc: "Família = espaço, casal = romantismo, executivo = praticidade.", tags: ["Família", "Casal", "Business"] },
            { title: "Acesse a Expedia TAAP", desc: "Use filtros: destino, datas, hóspedes, categoria, regime.", tags: ["Filtros", "Melhores tarifas"] },
            { title: "Selecione 2 ou 3 opções", desc: "Dentro do budget + intermediária + premium.", tags: ["Comparativo"] },
            { title: "Apresente com contexto", desc: "Explique o que está incluso, localização e diferenciais.", tags: ["Storytelling", "Localização"] },
            { title: "Confirme políticas antes de fechar", desc: "Cancelamento, remarcação, restrições.", tags: ["Políticas", "Transparência"] },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="06" title="Usando a Expedia TAAP" subtitle="Plataforma B2B exclusiva">
        <PlatformCard
          name="EXPEDIA TAAP"
          description="Plataforma exclusiva para agências. Tarifas B2B melhores que o público geral."
          steps={[
            "Solicite cadastro como agência",
            "Pesquise como hóspede normal",
            "Use filtros a seu favor",
            "Verifique a comissão (0% a 15%)",
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="07" title="Faixas de Ticket" subtitle="Onde cada hospedagem se posiciona">
        <TicketTiers
          tiers={[
            {
              label: "Baixo",
              badgeClass: "bg-accent hover:bg-accent text-white",
              borderClass: "border-accent/30",
              title: "Econômico",
              desc: "Hotéis 2-3 estrelas, pousadas. Foco em custo-benefício.",
            },
            {
              label: "Médio",
              badgeClass: "bg-warning hover:bg-warning text-white",
              borderClass: "border-warning/30",
              title: "Intermediário",
              desc: "Hotéis 3-4 estrelas. Bom conforto, café incluso.",
            },
            {
              label: "Alto",
              badgeClass: "bg-accent hover:bg-accent text-white",
              borderClass: "border-accent/30",
              title: "Premium",
              desc: "Resorts 5 estrelas, all-inclusive, suítes de luxo.",
            },
          ]}
        />
      </PlaybookSection>

      <PlaybookSection number="08" title="Regras Críticas" subtitle="Padrão de qualidade">
        <div className="space-y-3">
          <NunPromVerify
            never={[
              "Cancelamento gratuito sem verificar política",
              "Serviços não inclusos na diária",
              "Características não confirmadas no anúncio",
            ]}
            always={[
              "Política de cancelamento",
              "Disponibilidade real antes de prometer",
              "Restrições (crianças, animais)",
              "O que está e o que não está na diária",
            ]}
          />
          <ErrorsExcellence
            errors={[
              "Errar datas de check-in / check-out",
              "Não entender necessidade do hóspede",
              "Ignorar descrição do hotel",
              "Explicar mal o tipo de quarto",
              "Não alinhar com horários de voo",
            ]}
            excellence={[
              "Confirmar datas antes de cotar",
              "Ler descrição completa do hotel",
              "Explicar quarto com detalhes",
              "Enviar política por escrito",
            ]}
          />
        </div>
      </PlaybookSection>

      <PlaybookSection number="09" title="3 Objeções Mais Comuns" subtitle="Quebrando resistências">
        <ObjectionCards
          objections={[
            {
              q: "Achei mais barato em outro lugar.",
              a: "Compare o que está incluso. Mostre valor além do preço — café, taxas, política, suporte.",
            },
            {
              q: "Não gostei desse hotel.",
              a: "Pergunte o que não agradou, refine a busca, apresente novas opções alinhadas ao gosto.",
            },
            {
              q: "Ficou muito longe do que eu queria.",
              a: "Pergunte referência específica, ajuste filtro de localização, explique alternativas com justificativa.",
            },
          ]}
        />
      </PlaybookSection>
    </div>
  );
}
