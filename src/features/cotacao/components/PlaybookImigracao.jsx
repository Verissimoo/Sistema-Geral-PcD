import {
  AlertTriangle, Plane, Briefcase, HelpCircle, Sparkles, TrendingUp,
  Building2, ClipboardList, Headphones, CheckCircle2, Banknote,
  MessageSquare, Lightbulb, Diamond,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/lib/utils";
import {
  PlaybookHero, PlaybookSection,
} from "@/features/cotacao/components/manualPrimitives";

// ═══════════════════════════════════════════════════════════════════
//  PLAYBOOK — PACOTE IMIGRAÇÃO
// ═══════════════════════════════════════════════════════════════════

export function PlaybookImigracao() {
  return (
    <div className="space-y-8">
      <PlaybookHero
        accentColor="text-accent"
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
        <Card className="border-accent/30 bg-accent/10">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm text-accent dark:text-accent leading-relaxed">
              <strong>Conjunto de 4 serviços estratégicos</strong> para facilitar entrada no país,
              reduzir riscos na imigração e evitar gastos desnecessários.
            </p>
            <Badge className="bg-danger hover:bg-danger text-white gap-1">
              <AlertTriangle className="h-3 w-3" />
              NÃO é opcional para clientes de risco médio ou alto
            </Badge>
            <p className="text-xs text-accent dark:text-accent">
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
          <Card className="border-success/30 bg-success/10 dark:bg-success/5">
            <CardContent className="p-4 text-sm flex items-start gap-2 text-success dark:text-success">
              <TrendingUp className="h-4 w-4 text-success shrink-0 mt-0.5" />
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
              badgeClass: "bg-accent hover:bg-accent text-white",
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
              badgeClass: "bg-accent hover:bg-accent text-white",
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
              badgeClass: "bg-warning hover:bg-warning text-white",
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
              badgeClass: "bg-success hover:bg-success text-white",
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
                    <span className="text-2xl font-extrabold text-warning leading-none">
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
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" /> {p}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </PlaybookSection>

      <PlaybookSection number="04" title="Valor do Pacote" subtitle="Precificação e composição">
        <Card className="border-warning/30 bg-warning/10 dark:bg-warning/5">
          <CardContent className="p-5 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Banknote className="h-5 w-5 text-warning" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-warning dark:text-warning font-bold">
                  Valor mínimo
                </div>
                <div className="text-2xl font-extrabold text-warning dark:text-warning">
                  R$ 500 <span className="text-sm font-normal text-warning">por pessoa</span>
                </div>
              </div>
            </div>
            <Separator className="bg-warning/10" />
            <div className="text-warning dark:text-warning">
              <strong>Pode aumentar conforme:</strong> grau de risco · complexidade · urgência · necessidade de suporte intensivo.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
              <div className="flex items-start gap-2 text-warning dark:text-warning">
                <CheckCircle2 className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                O valor deve ser <strong>SEMPRE</strong> incluso no total da cotação.
              </div>
              <div className="flex items-start gap-2 text-warning dark:text-warning">
                <CheckCircle2 className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
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
          <Card className="border-success/30 bg-success/10 dark:bg-success/5">
            <CardContent className="p-5 space-y-2 text-sm text-success dark:text-success">
              {[
                "A passagem é apenas uma parte do processo.",
                "O risco maior está na imigração.",
                "O pacote protege o investimento do cliente.",
              ].map((p) => (
                <div key={p} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> {p}
                </div>
              ))}
              <Separator className="my-2 bg-success/10" />
              <p className="font-medium">
                "O cliente que imigra está largando tudo no Brasil — precisa do pacote completo."
              </p>
              <p className="font-medium">
                "Ele é turista, não imigrante — focar nessa ideia."
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-warning/30 bg-warning/10">
            <CardContent className="p-4 text-sm font-semibold text-warning flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
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
                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> {c}
              </div>
            ))}
          </CardContent>
        </Card>
      </PlaybookSection>

      <PlaybookSection number="08" title="Regra Final" subtitle="A síntese">
        <Card className="border-0 bg-[#0B1E3D] text-white overflow-hidden">
          <CardContent className="p-8 text-center space-y-3">
            <Diamond className="h-8 w-8 text-warning mx-auto" />
            <p className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
              "O cliente não compra passagem.
              <br />
              Ele compra <span className="text-warning">segurança</span>."
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
