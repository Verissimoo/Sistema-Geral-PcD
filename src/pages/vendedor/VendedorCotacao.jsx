import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Plane, Globe, Crown, Building2, Shield, FileCheck,
  Users, Wallet, CreditCard, Calculator, Target, ListChecks,
  Search, MessageSquare, ArrowRight, CheckCircle2, XCircle,
  AlertTriangle, TrendingUp, Headphones, ClipboardList, Award,
  Briefcase, Sparkles, Map, ChevronRight, Diamond, Plus, Minus,
  HelpCircle, Lightbulb, Banknote, Skull, FileWarning, Stamp,
  Zap, BookMarked,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─── Configuração das abas de produto ────────────────────────────────
const PRODUCT_TABS = [
  { value: "nacional", label: "Passagem Nacional", icon: Plane, color: "blue" },
  { value: "internacional", label: "Passagem Internacional", icon: Globe, color: "red" },
  { value: "hotel", label: "Hotel", icon: Building2, color: "amber" },
  { value: "seguro", label: "Seguro Viagem", icon: Shield, color: "emerald" },
  { value: "imigracao", label: "Pacote Imigração", icon: FileCheck, color: "purple" },
];

const PRODUCT_DOT_CLASSES = {
  blue: "bg-blue-500",
  red: "bg-red-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  purple: "bg-purple-500",
};

const PRODUCT_BADGE_CLASSES = {
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  red: "bg-red-100 text-red-700 border-red-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
};

// ─── Página ──────────────────────────────────────────────────────────
export default function VendedorCotacao() {
  const [activeTab, setActiveTab] = useState("visao-geral");
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Manual do Vendedor</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Base de conhecimento e playbooks de produto da equipe comercial
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/50 justify-start w-full">
          <TabsTrigger value="visao-geral" className="gap-2 px-3 py-2">
            <BookOpen className="w-4 h-4" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="atendimento" className="gap-2 px-3 py-2">
            <Headphones className="w-4 h-4" /> Atendimento
          </TabsTrigger>
          <TabsTrigger value="comissoes" className="gap-2 px-3 py-2">
            <Wallet className="w-4 h-4" /> Comissões
          </TabsTrigger>

          <span className="mx-1 my-1 w-px self-stretch bg-border" aria-hidden />

          {PRODUCT_TABS.map((p) => {
            const Icon = p.icon;
            return (
              <TabsTrigger
                key={p.value}
                value={p.value}
                className="gap-2 px-3 py-2"
              >
                <Icon className="w-4 h-4" />
                {p.label}
                <span className={cn("inline-block w-1.5 h-1.5 rounded-full ml-1", PRODUCT_DOT_CLASSES[p.color])} />
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════
            VISÃO GERAL
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="visao-geral" className="space-y-6">
          {/* Hero navy */}
          <Card className="border-0 bg-[#0B1E3D] text-white overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-[0.3em] mb-2">
                <Diamond className="h-3 w-3" /> Quem somos e como atuamos
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
                Passagens<span className="text-red-500">Com</span>Desconto
              </h2>
              <p className="text-white/60 text-sm mb-6">
                Agência de viagens · Brasília-DF · CADASTUR: 62.830.477/0001-51
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Como funciona</div>
                  <p className="text-white/90 text-sm leading-relaxed">
                    Leads chegam prontos via marketing (Zenvia) — o vendedor foca em{" "}
                    <strong>atender, qualificar, cotar e fechar</strong>.
                  </p>
                  <Badge className="mt-3 bg-amber-500 hover:bg-amber-500 text-[#0B1E3D] border-0">
                    Sem prospecção ativa
                  </Badge>
                </div>

                <div className="p-5 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-xs uppercase tracking-widest text-white/50 mb-3">Fluxo padrão</div>
                  <div className="space-y-2">
                    {["Diagnosticar", "Comparar", "Apresentar", "Fechar", "Follow-up"].map((step, i, arr) => (
                      <div key={step} className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-amber-500 text-[#0B1E3D] flex items-center justify-center text-xs font-bold">
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
                { name: "LATAM", color: "from-red-500 to-pink-600", milheiro: "R$ 0,0285" },
                { name: "GOL", color: "from-orange-500 to-amber-600", milheiro: "R$ 0,02" },
                { name: "AZUL", color: "from-blue-500 to-blue-700", milheiro: "R$ 0,02" },
              ].map((c) => (
                <Card key={c.name} className="border-border/50 overflow-hidden">
                  <div className={cn("h-1 bg-gradient-to-r", c.color)} />
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
          <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" /> Regras fundamentais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm text-amber-900 dark:text-amber-200">
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
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {m}
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
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {m}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card className="border-amber-200 bg-amber-50/40 mt-3">
              <CardContent className="p-4 text-sm flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="text-amber-900 dark:text-amber-300">Boleto:</strong>{" "}
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
                  <Badge className="w-fit mb-1 bg-purple-500 hover:bg-purple-500">Milhas</Badge>
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
                  <Badge className="w-fit mb-1 bg-emerald-600 hover:bg-emerald-600">Dinheiro</Badge>
                  <CardTitle className="text-base">Cálculo do preço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="p-3 rounded-lg bg-muted/50 font-mono text-sm border border-border">
                    Preço venda = tarifa + 10%
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> EXCEÇÃO AZUL: não aplicar 10%
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            ATENDIMENTO
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="atendimento" className="space-y-6">
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
              <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-emerald-800 dark:text-emerald-300">
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
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      {q}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-amber-300 bg-amber-50/40 dark:bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-amber-800 dark:text-amber-300">
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
                      <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
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
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> {c}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div>
            <SectionTitle icon={Target} title="Erros comuns vs Boas práticas" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="border-red-300 bg-red-50/40 dark:bg-red-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
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
                      <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" /> {e}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
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
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> {b}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            COMISSÕES
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="comissoes" className="space-y-6">
          <div>
            <SectionTitle icon={Wallet} title="Estrutura de comissões" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Tipo A */}
              <Card className="border-2 border-[#0B1E3D]/40 bg-blue-50/40 dark:bg-blue-500/5">
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
              <Card className="border-2 border-amber-400 bg-amber-50/40 dark:bg-amber-500/5">
                <CardHeader className="pb-3">
                  <Badge className="w-fit mb-2 bg-amber-500 hover:bg-amber-500 text-white">Tipo B</Badge>
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
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            PLAYBOOKS DE PRODUTO
        ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="nacional"><PlaybookNacional /></TabsContent>
        <TabsContent value="internacional"><PlaybookInternacional /></TabsContent>
        <TabsContent value="hotel"><PlaybookHotel /></TabsContent>
        <TabsContent value="seguro"><PlaybookSeguro /></TabsContent>
        <TabsContent value="imigracao"><PlaybookImigracao /></TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h3>
      <Separator className="flex-1" />
    </div>
  );
}

function RuleLine({ children }) {
  return (
    <div className="flex items-start gap-2">
      <div className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-2 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function CommissionRow({ label, value, highlight }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      highlight
        ? "bg-emerald-500/10 border-emerald-500/40"
        : "bg-card border-border"
    )}>
      <span className="text-sm font-medium">{label}</span>
      <span className={cn(
        "font-bold text-sm",
        highlight && "text-emerald-700 dark:text-emerald-400"
      )}>
        {value}
      </span>
    </div>
  );
}

function ProductPlaceholder({ product }) {
  const Icon = product.icon;
  return (
    <Card className="border-border/50">
      <CardContent className="p-10 text-center">
        <div className={cn(
          "h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2",
          PRODUCT_BADGE_CLASSES[product.color]
        )}>
          <Icon className="h-7 w-7" />
        </div>
        <Badge className={cn("mb-3", PRODUCT_BADGE_CLASSES[product.color])} variant="outline">
          Playbook de vendas
        </Badge>
        <h2 className="text-2xl font-bold tracking-tight mb-1">{product.label}</h2>
        <p className="text-muted-foreground text-sm">Conteúdo em carregamento…</p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  PLAYBOOK — COMPONENTES REUTILIZÁVEIS
// ═══════════════════════════════════════════════════════════════════

function PlaybookHero({ accentColor, productName, subtitle, meta }) {
  return (
    <Card className="border-0 bg-[#0B1E3D] text-white overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">
          <BookMarked className="h-3 w-3" /> Playbook de vendas
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
          Produto: <span className={accentColor}>{productName}</span>
        </h2>
        <p className="text-white/60 text-sm mb-6">{subtitle}</p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-white/10">
          {meta.map((m) => (
            <div key={m.label}>
              <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                {m.label}
              </div>
              <div className="text-sm font-semibold text-white">{m.value}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PlaybookSection({ number, title, subtitle, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="text-4xl md:text-5xl font-extrabold text-amber-500 leading-none tracking-tight">
          {number}
        </div>
        <div className="pt-1">
          <h3 className="text-xl font-bold tracking-tight">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="md:pl-16">{children}</div>
    </section>
  );
}

function OfferGrid({ offer, dontOffer }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Ofereça quando
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {offer.map((x) => (
            <div key={x} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> {x}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-red-300 bg-red-50/40 dark:bg-red-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
            <Minus className="h-4 w-4" /> Não ofereça quando
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {dontOffer.map((x) => (
            <div key={x} className="flex items-start gap-2">
              <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" /> {x}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ProcessSteps({ steps }) {
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <Card key={s.title} className="border-border/50">
          <CardContent className="p-4 flex gap-4 items-start">
            <div className="h-9 w-9 rounded-full bg-[#0B1E3D] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {i + 1}
            </div>
            <div>
              <div className="font-semibold text-sm">{s.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FraseBase({ children }) {
  return (
    <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-500/10 dark:to-amber-500/5">
      <CardContent className="p-5 flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold mb-1">
            Frase-base
          </div>
          <p className="text-sm text-amber-900 dark:text-amber-100 italic">"{children}"</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CriticalRules({ rules }) {
  return (
    <div className="space-y-2">
      {rules.map((r) => (
        <Card key={r} className="border-red-300 border-l-4 border-l-red-600 bg-red-50/40 dark:bg-red-500/5">
          <CardContent className="p-3 flex items-start gap-3 text-sm text-red-900 dark:text-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            {r}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ErrorsExcellence({ errors, excellence }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="border-red-300 bg-red-50/40 dark:bg-red-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Erros comuns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {errors.map((e) => (
            <div key={e} className="flex items-start gap-2">
              <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" /> {e}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Award className="h-4 w-4" /> Vendedor excelente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {excellence.map((x) => (
            <div key={x} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> {x}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Quiz({ questions }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {questions.map((q, i) => (
        <Card key={q} className="border-border/50">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center text-xs font-bold shrink-0">
              {i + 1}
            </div>
            <div className="text-sm flex items-start gap-2">
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
              {q}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ScenarioCard({ scenario, checklist, label }) {
  return (
    <Card className="border-border/50 bg-muted/30">
      <CardHeader className="pb-2">
        {label && (
          <Badge variant="outline" className="w-fit mb-1">{label}</Badge>
        )}
        <CardTitle className="text-sm flex items-start gap-2">
          <MessageSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <span className="italic font-normal text-foreground/80">"{scenario}"</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2 mt-1">
          Checklist do vendedor
        </div>
        {checklist.map((c) => (
          <div key={c} className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> {c}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ConceptCards({ concepts }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {concepts.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.title} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="font-semibold text-sm">{c.title}</div>
              </div>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function OverviewCards({ items }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Card key={it.title} className="border-border/50">
            <CardHeader className="pb-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-sm">{it.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{it.desc}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  PLAYBOOK — PASSAGEM NACIONAL
// ═══════════════════════════════════════════════════════════════════

function PlaybookNacional() {
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
        accentColor="text-blue-400"
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
        <Card className="border-2 border-red-700 bg-red-950/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
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
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" /> {r}
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

// ═══════════════════════════════════════════════════════════════════
//  PLAYBOOK — PASSAGEM INTERNACIONAL
// ═══════════════════════════════════════════════════════════════════

function PlaybookInternacional() {
  return (
    <div className="space-y-8">
      <PlaybookHero
        accentColor="text-red-400"
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
        <Card className="border-amber-300 bg-amber-50/40 dark:bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <FileWarning className="h-4 w-4" /> Verificar antes de fechar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="EUA" v="Exigem visto" />
            <Row k="Europa (Schengen)" v="Sem visto para turismo até 90 dias, passaporte válido" />
            <Row k="Colômbia" v="Pode exigir vacina febre amarela" />
            <Row k="México" v="Pode exigir autorização de entrada" />
            <Separator className="my-2" />
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
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
        <Card className="border-2 border-red-700 bg-red-950/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
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
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" /> {r}
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
        <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
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
                <div key={u.name} className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-emerald-950/20 border border-emerald-200">
                  <Icon className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-emerald-900 dark:text-emerald-200">{u.name}</div>
                    <div className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">{u.desc}</div>
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

function Row({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-amber-200/50 last:border-0">
      <span className="font-semibold text-amber-900 dark:text-amber-200 shrink-0">{k}</span>
      <span className="text-amber-800 dark:text-amber-300/90 text-right">{v}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  HELPERS ADICIONAIS PARA HOTEL / SEGURO / IMIGRAÇÃO
// ═══════════════════════════════════════════════════════════════════

function BigBenefitCards({ benefits }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {benefits.map((b, i) => {
        const Icon = b.icon;
        return (
          <Card key={b.title} className="border-0 bg-[#0B1E3D] text-white overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl font-extrabold text-amber-400 leading-none tracking-tight">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {Icon && <Icon className="h-5 w-5 text-white/40" />}
              </div>
              <div className="font-bold text-base mb-1.5">{b.title}</div>
              <p className="text-sm text-white/70 leading-relaxed">{b.desc}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CollectGrid({ items }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Card key={it.text} className="border-border/50">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm">{it.text}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StepsWithTags({ steps }) {
  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <Card key={s.title} className="border-border/50">
          <CardContent className="p-4 flex gap-4 items-start">
            <div className="h-9 w-9 rounded-full bg-[#0B1E3D] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{s.title}</div>
              <p className="text-sm text-muted-foreground mt-1 mb-2">{s.desc}</p>
              {s.tags && (
                <div className="flex flex-wrap gap-1.5">
                  {s.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PlatformCard({ name, description, steps }) {
  return (
    <Card className="border-0 bg-[#0B1E3D] text-white">
      <CardContent className="p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-amber-400 font-bold mb-2">
          Plataforma
        </div>
        <div className="text-2xl font-extrabold mb-2">{name}</div>
        <p className="text-sm text-white/70 mb-5">{description}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {steps.map((s, i) => (
            <div key={s} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-amber-400 font-bold text-sm">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm text-white/90">{s}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TicketTiers({ tiers, footer }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {tiers.map((t) => (
          <Card key={t.label} className={cn("border-2", t.borderClass)}>
            <CardHeader className="pb-2">
              <Badge className={cn("w-fit mb-1", t.badgeClass)}>{t.label}</Badge>
              <CardTitle className="text-base">{t.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {footer && (
        <Card className="border-emerald-300 bg-emerald-50/50 dark:bg-emerald-500/5">
          <CardContent className="p-4 text-sm flex items-start gap-2 text-emerald-900 dark:text-emerald-200">
            <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> {footer}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ObjectionCards({ objections }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {objections.map((o, i) => (
        <Card key={o.q} className="border-border/50 overflow-hidden">
          <div className="bg-red-500 h-1" />
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Objeção {i + 1}
            </div>
            <div className="text-sm italic font-semibold mb-3 text-red-700 dark:text-red-400">
              "{o.q}"
            </div>
            <Separator className="my-2" />
            <div className="text-[10px] uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-bold mb-1.5 flex items-center gap-1">
              <ArrowRight className="h-3 w-3" /> Resposta
            </div>
            <p className="text-sm text-muted-foreground">{o.a}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NunPromVerify({ never, always }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="border-red-300 bg-red-50/40 dark:bg-red-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Nunca prometa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {never.map((x) => (
            <div key={x} className="flex items-start gap-2">
              <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" /> {x}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Sempre verifique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {always.map((x) => (
            <div key={x} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> {x}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  PLAYBOOK — HOTEL
// ═══════════════════════════════════════════════════════════════════

function PlaybookHotel() {
  return (
    <div className="space-y-8">
      <PlaybookHero
        accentColor="text-amber-400"
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
              badgeClass: "bg-blue-500 hover:bg-blue-500 text-white",
              borderClass: "border-blue-200",
              title: "Econômico",
              desc: "Hotéis 2-3 estrelas, pousadas. Foco em custo-benefício.",
            },
            {
              label: "Médio",
              badgeClass: "bg-amber-500 hover:bg-amber-500 text-white",
              borderClass: "border-amber-200",
              title: "Intermediário",
              desc: "Hotéis 3-4 estrelas. Bom conforto, café incluso.",
            },
            {
              label: "Alto",
              badgeClass: "bg-purple-500 hover:bg-purple-500 text-white",
              borderClass: "border-purple-200",
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

// ═══════════════════════════════════════════════════════════════════
//  PLAYBOOK — SEGURO VIAGEM
// ═══════════════════════════════════════════════════════════════════

function PlaybookSeguro() {
  return (
    <div className="space-y-8">
      <PlaybookHero
        accentColor="text-emerald-400"
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
              badgeClass: "bg-blue-500 hover:bg-blue-500 text-white",
              borderClass: "border-blue-200",
              title: "Cobertura básica",
              desc: "Viagens curtas, jovens até 60, cobertura essencial.",
            },
            {
              label: "Médio",
              badgeClass: "bg-amber-500 hover:bg-amber-500 text-white",
              borderClass: "border-amber-200",
              title: "Cobertura ampla",
              desc: "Duração média, destinos com medicina cara, boa cobertura.",
            },
            {
              label: "Alto",
              badgeClass: "bg-purple-500 hover:bg-purple-500 text-white",
              borderClass: "border-purple-200",
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
          <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" /> Acionar em emergência
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-amber-900 dark:text-amber-200">
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
            <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-800 dark:text-emerald-300">
                  Palavras que ajudam
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {["Segurança", "Tranquilidade", "Proteção", "Praticidade", "Economia", "Suporte"].map((w) => (
                    <Badge key={w} variant="outline" className="bg-emerald-100/50 border-emerald-300 text-emerald-800">
                      {w}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-300 bg-red-50/40 dark:bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-800 dark:text-red-300">
                  Evitar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex items-start gap-2"><XCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" /> Termos técnicos sem explicação</div>
                <div className="flex items-start gap-2"><XCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" /> Promessas excessivas</div>
                <div className="flex items-start gap-2"><XCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" /> Linguagem insegura</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Sinais de compra — o que fazer
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

          <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-500/5">
            <CardContent className="p-4 text-sm flex items-start gap-2 text-emerald-900 dark:text-emerald-200">
              <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
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
          <Card className="border-amber-300 bg-amber-50/40 dark:bg-amber-500/5">
            <CardContent className="p-4 text-sm flex items-start gap-2 text-amber-900 dark:text-amber-200">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
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

// ═══════════════════════════════════════════════════════════════════
//  PLAYBOOK — PACOTE IMIGRAÇÃO
// ═══════════════════════════════════════════════════════════════════

function PlaybookImigracao() {
  return (
    <div className="space-y-8">
      <PlaybookHero
        accentColor="text-purple-400"
        productName="Pacote Imigração"
        subtitle="Solução completa de viagem + assessoria de entrada no país"
        meta={[
          { label: "Categoria", value: "Serviço especializado" },
          { label: "Função", value: "Alto valor agregado" },
          { label: "Valor mín.", value: "R$ 500/pessoa" },
          { label: "Ticket", value: "Alto" },
          { label: "Canal", value: "Atendimento direto" },
        ]}
      />

      <PlaybookSection number="01" title="O que é o Pacote Imigração" subtitle="Definição estratégica">
        <Card className="border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100/40 dark:from-purple-500/10 dark:to-purple-500/5">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm text-purple-900 dark:text-purple-100 leading-relaxed">
              <strong>Conjunto de 4 serviços estratégicos</strong> para facilitar entrada no país,
              reduzir riscos na imigração e evitar gastos desnecessários.
            </p>
            <Badge className="bg-red-500 hover:bg-red-500 text-white gap-1">
              <AlertTriangle className="h-3 w-3" />
              NÃO é opcional para clientes de risco médio ou alto
            </Badge>
            <p className="text-xs text-purple-800/80 dark:text-purple-200/80">
              Apresentar como solução completa — não como item extra.
            </p>
          </CardContent>
        </Card>
      </PlaybookSection>

      <PlaybookSection number="02" title="Quando Oferecer" subtitle="Sinais de risco">
        <div className="space-y-3">
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-2">
              {[
                { icon: Plane, text: "Não tem passagem de volta definida" },
                { icon: Briefcase, text: "Indo para estudar, trabalhar ou ficar tempo indeterminado" },
                { icon: AlertTriangle, text: "Já teve problemas em imigração" },
                { icon: HelpCircle, text: "Inseguro sobre documentos ou entrevistas" },
                { icon: Sparkles, text: "Primeira vez no país" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.text} className="flex items-start gap-2 text-sm">
                    <Icon className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> {s.text}
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-500/5">
            <CardContent className="p-4 text-sm flex items-start gap-2 text-emerald-900 dark:text-emerald-200">
              <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <strong>Quanto maior o risco percebido, maior o valor percebido do pacote.</strong>
            </CardContent>
          </Card>
        </div>
      </PlaybookSection>

      <PlaybookSection number="03" title="4 Serviços Inclusos" subtitle="O que está dentro do pacote">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              num: "3.1",
              icon: Plane,
              title: "Volta Cancelada",
              badge: "Serviço Principal",
              badgeClass: "bg-purple-500 hover:bg-purple-500 text-white",
              points: [
                "Emite passagem de volta 4h antes do embarque",
                "Cancela após o cliente passar pela imigração",
                "Objetivo: evitar desconfiança, facilitar entrada, comprovar saída",
                "Benefício: cliente não paga por volta que não será usada",
              ],
            },
            {
              num: "3.2",
              icon: Building2,
              title: "Reserva de Hotel e Seguro Viagem",
              badge: "Suporte documental",
              badgeClass: "bg-blue-500 hover:bg-blue-500 text-white",
              points: [
                "Reserva e seguro compatíveis com o período declarado",
                "Objetivo: reforçar narrativa, aumentar credibilidade",
                "Datas e informações coerentes com o discurso orientado",
              ],
            },
            {
              num: "3.3",
              icon: ClipboardList,
              title: "Assessoria Completa de Imigração",
              badge: "Preparação",
              badgeClass: "bg-amber-500 hover:bg-amber-500 text-white",
              points: [
                "Orientação sobre perguntas frequentes",
                "Como responder de forma segura e objetiva",
                "O que falar e o que não falar",
                "Simulações de entrevista",
                "Tirar dúvidas antes do embarque",
              ],
            },
            {
              num: "3.4",
              icon: Headphones,
              title: "Suporte 24h até Aprovação",
              badge: "Suporte ativo",
              badgeClass: "bg-emerald-500 hover:bg-emerald-500 text-white",
              points: [
                "Suporte ativo até a imigração ser concluída com sucesso",
                "Encerra somente após entrada autorizada",
              ],
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.num} className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl font-extrabold text-amber-500 leading-none">
                      {s.num}
                    </span>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge className={cn("w-fit mb-1", s.badgeClass)}>{s.badge}</Badge>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  {s.points.map((p) => (
                    <div key={p} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> {p}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </PlaybookSection>

      <PlaybookSection number="04" title="Valor do Pacote" subtitle="Precificação e composição">
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-500/5">
          <CardContent className="p-5 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-200/60">
                <Banknote className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold">
                  Valor mínimo
                </div>
                <div className="text-2xl font-extrabold text-amber-900 dark:text-amber-100">
                  R$ 500 <span className="text-sm font-normal text-amber-800/70">por pessoa</span>
                </div>
              </div>
            </div>
            <Separator className="bg-amber-200" />
            <div className="text-amber-900 dark:text-amber-200">
              <strong>Pode aumentar conforme:</strong> grau de risco · complexidade · urgência · necessidade de suporte intensivo.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
              <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                O valor deve ser <strong>SEMPRE</strong> incluso no total da cotação.
              </div>
              <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                O cliente compra <strong>solução completa</strong> — não pacote separado.
              </div>
            </div>
          </CardContent>
        </Card>
      </PlaybookSection>

      <PlaybookSection number="05" title="Como Apresentar" subtitle="Modelo de abordagem">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm italic text-foreground/90 leading-relaxed">
              "Além da passagem, reconhecemos que o maior risco está na imigração.
              Por isso trabalhamos com um <strong>Pacote Imigração</strong>, que inclui passagem de
              volta cancelada, reservas e seguro compatíveis e assessoria completa até passar pela
              imigração com segurança. Isso evita problemas, economiza dinheiro e aumenta muito a
              chance de entrada no país."
            </p>
          </CardContent>
        </Card>
      </PlaybookSection>

      <PlaybookSection number="06" title="Geração de Valor" subtitle="O argumento central">
        <div className="space-y-3">
          <Card className="border-emerald-300 bg-emerald-50/40 dark:bg-emerald-500/5">
            <CardContent className="p-5 space-y-2 text-sm text-emerald-900 dark:text-emerald-200">
              {[
                "A passagem é apenas uma parte do processo.",
                "O risco maior está na imigração.",
                "O pacote protege o investimento do cliente.",
              ].map((p) => (
                <div key={p} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> {p}
                </div>
              ))}
              <Separator className="my-2 bg-emerald-200" />
              <p className="font-medium">
                "O cliente que imigra está largando tudo no Brasil — precisa do pacote completo."
              </p>
              <p className="font-medium">
                "Ele é turista, não imigrante — focar nessa ideia."
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100/40">
            <CardContent className="p-4 text-sm font-semibold text-amber-900 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              Preço sem valor gera objeção. <strong>Valor bem explicado gera fechamento.</strong>
            </CardContent>
          </Card>
        </div>
      </PlaybookSection>

      <PlaybookSection number="07" title="Padrão do Vendedor" subtitle="Disciplina de execução">
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-2">
            {[
              "Nunca oferecer como opcional para clientes de risco",
              "Nunca detalhar demais antes de gerar valor",
              "Sempre incluir valor no total da cotação",
              "Explicar benefícios, não apenas serviços",
            ].map((c) => (
              <div key={c} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> {c}
              </div>
            ))}
          </CardContent>
        </Card>
      </PlaybookSection>

      <PlaybookSection number="08" title="Regra Final" subtitle="A síntese">
        <Card className="border-0 bg-[#0B1E3D] text-white overflow-hidden">
          <CardContent className="p-8 text-center space-y-3">
            <Diamond className="h-8 w-8 text-amber-400 mx-auto" />
            <p className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
              "O cliente não compra passagem.
              <br />
              Ele compra <span className="text-amber-400">segurança</span>."
            </p>
            <p className="text-white/60 text-sm">
              O Pacote Imigração é parte essencial dessa segurança.
            </p>
          </CardContent>
        </Card>
      </PlaybookSection>
    </div>
  );
}
