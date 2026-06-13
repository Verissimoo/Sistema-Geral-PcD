import {
  Plane, Globe, Crown, Building2, Shield, FileCheck,
  Wallet, CreditCard, Calculator, Target, ListChecks,
  Search, MessageSquare, ArrowRight, CheckCircle2, XCircle,
  AlertTriangle, TrendingUp, Headphones, ClipboardList, Award,
  Briefcase, Sparkles, Map, ChevronRight, Diamond,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  PRODUCT_BADGE_CLASSES,
  SectionTitle, RuleLine, CommissionRow,
} from "@/features/cotacao/components/manualPrimitives";

// ─── Aba: Visão Geral ────────────────────────────────────────────────
export function TabVisaoGeral({ setActiveTab }) {
  return (
    <div className="space-y-6">
      {/* Hero navy */}
      <Card className="border-0 bg-[#0B1E3D] text-white overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex items-center gap-2 text-warning text-xs font-semibold uppercase tracking-[0.3em] mb-2">
            <Diamond className="h-3 w-3" /> Quem somos e como atuamos
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
            Passagens<span className="text-danger">Com</span>Desconto
          </h2>
          <p className="text-white/60 text-sm mb-6">
            Agência de viagens · Brasília-DF · CADASTUR: 62.830.477/0001-51
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-lg bg-white/10 border border-white/10">
              <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Como funciona</div>
              <p className="text-white/90 text-sm leading-relaxed">
                Leads chegam prontos via marketing (Zenvia) — o vendedor foca em{" "}
                <strong>atender, qualificar, cotar e fechar</strong>.
              </p>
              <Badge className="mt-3 bg-warning hover:bg-warning text-[#0B1E3D] border-0">
                Sem prospecção ativa
              </Badge>
            </div>

            <div className="p-5 rounded-lg bg-white/10 border border-white/10">
              <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Fluxo padrão</div>
              <div className="space-y-2">
                {["Diagnosticar", "Comparar", "Apresentar", "Fechar", "Follow-up"].map((step, i, arr) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-warning text-[#0B1E3D] flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <span className="text-white/90 text-sm font-medium">{step}</span>
                    {i < arr.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-white/30 ml-auto" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Produtos */}
      <div>
        <SectionTitle icon={Briefcase} title="Produtos que vendemos" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { icon: Plane, name: "Passagem Nacional", sub: "Voos dentro do Brasil", tab: "nacional", color: "blue" },
            { icon: Globe, name: "Passagem Internacional", sub: "Voos para o exterior", tab: "internacional", color: "red" },
            { icon: Crown, name: "Passagem Executiva", sub: "Classe executiva e primeira", tab: "internacional", color: "purple" },
            { icon: Building2, name: "Hotel", sub: "Hospedagem via Expedia TAAP", tab: "hotel", color: "amber" },
            { icon: Shield, name: "Seguro Viagem", sub: "Proteção para imprevistos", tab: "seguro", color: "emerald" },
            { icon: FileCheck, name: "Pacote Imigração", sub: "Assessoria completa de entrada", tab: "imigracao", color: "purple" },
          ].map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.name}
                onClick={() => setActiveTab(p.tab)}
                className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center mb-3 border",
                  PRODUCT_BADGE_CLASSES[p.color]
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.sub}</div>
                <div className="text-xs text-primary mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Abrir playbook <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Companhias principais */}
      <div>
        <SectionTitle icon={Plane} title="Companhias principais" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: "LATAM", color: "bg-danger", milheiro: "R$ 0,0285" },
            { name: "GOL", color: "bg-warning", milheiro: "R$ 0,02" },
            { name: "AZUL", color: "bg-accent", milheiro: "R$ 0,02" },
          ].map((c) => (
            <Card key={c.name} className="border-border/50 overflow-hidden">
              <div className={cn("h-1", c.color)} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="font-bold tracking-wider">{c.name}</Badge>
                  <Plane className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-xs text-muted-foreground mb-1">Valor do milheiro</div>
                <div className="text-2xl font-bold tracking-tight">{c.milheiro}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Regras fundamentais */}
      <Card className="border-warning/30 bg-warning/10 dark:bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-warning dark:text-warning">
            <AlertTriangle className="h-4 w-4" /> Regras fundamentais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 text-sm text-warning dark:text-warning">
          <RuleLine>
            <strong>Prioridade:</strong> SEMPRE tentar vender em milhas quando a conta fechar melhor.
          </RuleLine>
          <RuleLine>
            Reserva confirmada somente após <strong>compensação do pagamento</strong>.
          </RuleLine>
          <RuleLine>
            Linguagem padrão: <em>"melhor condição disponível"</em> — nunca "mais barato do mercado" sem base real.
          </RuleLine>
        </CardContent>
      </Card>

      {/* Formas de pagamento */}
      <div>
        <SectionTitle icon={CreditCard} title="Formas de pagamento" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Map className="h-4 w-4 text-primary" /> Pagamento Brasil
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5">
              {["PIX", "Cartão até 12x com juros", "Débito", "Composição"].map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {m}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> Pagamento Internacional
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5">
              {["PIX", "Cartão", "Débito", "TransferWise", "MB Way", "Composição PIX + Cartão"].map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {m}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card className="border-warning/30 bg-warning/10 mt-3">
          <CardContent className="p-4 text-sm flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div>
              <strong className="text-warning dark:text-warning">Boleto:</strong>{" "}
              só quando permite cancelamento/reembolso, entrada cobre taxa de cancelamento e bilhete quitado 10 dias antes.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Precificação */}
      <div>
        <SectionTitle icon={Calculator} title="Precificação" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <Badge className="w-fit mb-1 bg-accent hover:bg-accent">Milhas</Badge>
              <CardTitle className="text-base">Cálculo do custo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 rounded-lg bg-muted/50 font-mono text-sm border border-border">
                Custo = milhas × preço do milheiro + taxas
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <Badge className="w-fit mb-1 bg-success hover:bg-success">Dinheiro</Badge>
              <CardTitle className="text-base">Cálculo do preço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-3 rounded-lg bg-muted/50 font-mono text-sm border border-border">
                Preço venda = tarifa + 10%
              </div>
              <div className="text-xs text-warning dark:text-warning flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> EXCEÇÃO AZUL: não aplicar 10%
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Aba: Atendimento ────────────────────────────────────────────────
export function TabAtendimento() {
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle icon={ListChecks} title="Etapas do atendimento" />
        <div className="space-y-3">
          {[
            {
              title: "Entender a necessidade",
              desc: "Atendimento humanizado e objetivo. Definir objetivo, urgência, orçamento, bagagem, passageiros, flexibilidade.",
            },
            {
              title: "Visão geral do mercado",
              desc: "Pesquisar Kayak, Google Flights e SkyScanner para achar melhores faixas de datas e preço-base do mercado.",
            },
            {
              title: "Interpretar resultados",
              desc: "Identificar melhor data, companhias com bons voos e valor de mercado.",
            },
            {
              title: "Documentar informações",
              desc: "Anotar valor da data pedida, datas com melhor preço e companhias que valem pesquisa direta.",
            },
            {
              title: "Validar na companhia",
              desc: "Pesquisar direto no site, ver opção em milhas, comparar com dinheiro.",
            },
            {
              title: "Montar orçamento e fechar",
              desc: "Usar o Gerador de Orçamento do sistema, enviar, pedir feedback, negociar e conduzir fechamento.",
            },
          ].map((step, i) => (
            <Card key={step.title} className="border-border/50">
              <CardContent className="p-4 flex gap-4 items-start">
                <div className="h-9 w-9 rounded-full bg-[#0B1E3D] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {i + 1}
                </div>
                <div>
                  <div className="font-semibold text-sm">{step.title}</div>
                  <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle icon={Search} title="Ferramentas de pesquisa" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: "KAYAK", sub: "Pesquisa com flexibilidade de até 6 dias" },
            { name: "GOOGLE FLIGHTS", sub: "Leitura rápida da faixa do mês" },
            { name: "SKYSCANNER", sub: "Mais opções de companhias e leitura de mercado" },
          ].map((t) => (
            <Card key={t.name} className="border-border/50">
              <CardContent className="p-4">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Ferramenta</div>
                <div className="font-bold text-base mb-1">{t.name}</div>
                <p className="text-sm text-muted-foreground">{t.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="p-4">
              <div className="font-bold text-sm mb-1">EDREAMS</div>
              <p className="text-sm text-muted-foreground">
                Pesquisa em euro — costuma ser mais barato que direto nas companhias.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="p-4">
              <div className="font-bold text-sm mb-1">CONFIANÇA</div>
              <p className="text-sm text-muted-foreground">
                Consolidadora com valores já com comissão.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <SectionTitle icon={MessageSquare} title="Perguntas obrigatórias" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-success/30 bg-success/10 dark:bg-success/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-success dark:text-success">
                Obrigatórias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {[
                "Origem e destino",
                "Datas + flexibilidade",
                "Quantidade de passageiros",
                "Bagagem",
                "Intuito da viagem",
                "Orçamento máximo",
              ].map((q) => (
                <div key={q} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  {q}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-warning/30 bg-warning/10 dark:bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-warning dark:text-warning">
                Qualificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {[
                "Lazer, trabalho, lua de mel, família?",
                "Primeira vez no destino?",
                "Já fez outro orçamento?",
                "Aceita conexão ou aeroporto alternativo?",
              ].map((q) => (
                <div key={q} className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-warning shrink-0" />
                  {q}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <SectionTitle icon={ClipboardList} title="Checklist pré-emissão" />
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-2">
            {[
              "Confirmar nome completo, datas, origem, destino, passageiros",
              "Checar bagagem, horários, conexões, restrições tarifárias",
              "Confirmar forma de pagamento e prazo de quitação",
              "Explicar cancelamento, remarcação e no-show",
              "Fazer follow-up quando não fechar na primeira conversa",
            ].map((c) => (
              <div key={c} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> {c}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <SectionTitle icon={Target} title="Erros comuns vs Boas práticas" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-danger/30 bg-danger/10 dark:bg-danger/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-danger dark:text-danger flex items-center gap-2">
                <XCircle className="h-4 w-4" /> Erros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {[
                "Cotação fraca ou incompleta",
                "Atender mal ou responder inseguro",
                "Não saber fechar a venda",
                "Não dominar formas de pagamento",
                "Não fazer follow-up",
              ].map((e) => (
                <div key={e} className="flex items-start gap-2">
                  <XCircle className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5" /> {e}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-success/30 bg-success/10 dark:bg-success/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-success dark:text-success flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Boas práticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {[
                "Realizar cotação sem depender de ajuda constante",
                "Ler perfil do cliente antes de argumentar preço",
                "Explicar regras sem enrolar",
                "Follow-up até decisão final",
              ].map((b) => (
                <div key={b} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" /> {b}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Aba: Comissões ──────────────────────────────────────────────────
export function TabComissoes({ navigate }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle icon={Wallet} title="Estrutura de comissões" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Tipo A */}
          <Card className="border-2 border-[#0B1E3D]/40 bg-accent/10 dark:bg-accent/5">
            <CardHeader className="pb-3">
              <Badge className="w-fit mb-2 bg-[#0B1E3D] text-white hover:bg-[#0B1E3D]">Tipo A</Badge>
              <CardTitle className="text-base">Carteira Própria</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Vendas originadas da própria carteira do vendedor
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <CommissionRow label="Preço Nipon" value="30% do lucro" />
              <CommissionRow label="Acima do Nipon" value="45% do excedente" highlight />
            </CardContent>
          </Card>

          {/* Tipo B */}
          <Card className="border-2 border-warning/30 bg-warning/10 dark:bg-warning/5">
            <CardHeader className="pb-3">
              <Badge className="w-fit mb-2 bg-warning hover:bg-warning text-white">Tipo B</Badge>
              <CardTitle className="text-base">Lead de Marketing</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Vendas originadas pelo marketing interno (Zenvia)
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <CommissionRow label="Preço Nipon" value="25% do lucro" />
              <CommissionRow label="Acima do Nipon" value="45% do excedente" highlight />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" /> Como funciona o Valor Nipon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Em milhas</div>
            <div className="font-mono">milhas × valor do milheiro + taxas</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Em dinheiro</div>
            <div className="font-mono">custo + 10% (exceto Azul)</div>
          </div>
          <p className="text-muted-foreground">
            Comissão base é sobre o lucro até o Nipon.{" "}
            <strong className="text-foreground">Excedente acima do Nipon gera 45% extra.</strong>
          </p>
          <Button
            onClick={() => navigate("/vendedor/ferramentas")}
            variant="outline"
            className="gap-2 mt-2"
          >
            Ir para Calculadora de Comissão <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <div>
        <SectionTitle icon={TrendingUp} title="Métricas do vendedor" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Headphones, label: "Tempo de 1ª resposta", desc: "O mais curto possível" },
            { icon: Target, label: "Conversão", desc: "Maior possível dentro do perfil dos leads" },
            { icon: Briefcase, label: "Follow-up", desc: "Obrigatório para cotações não convertidas" },
            { icon: Award, label: "Attach rate", desc: "Hotel ou pacote quando fizer sentido" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className="border-border/50">
                <CardContent className="p-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="font-semibold text-sm">{m.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
