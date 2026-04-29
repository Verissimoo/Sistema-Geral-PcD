import { Info, CreditCard, Percent, ShieldCheck, Phone, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  {
    title: "Formas de Pagamento Aceitas",
    icon: CreditCard,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10",
    items: [
      "PIX — à vista, sem taxa",
      "Cartão de Crédito — consulte a tabela de taxas na ferramenta",
      "Transferência Bancária — à vista, sem taxa",
      "Dinheiro — somente presencial",
    ],
  },
  {
    title: "Regras de Parcelamento",
    icon: Percent,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-500/10",
    items: [
      "Mínimo de R$ 300,00 para parcelamento",
      "Máximo 12x no cartão de crédito",
      "Parcelamento sujeito às taxas da plataforma utilizada",
      "Valor final repassado ao cliente deve incluir a taxa",
    ],
  },
  {
    title: "Políticas Importantes",
    icon: ShieldCheck,
    iconColor: "text-red-500",
    bgColor: "bg-red-500/10",
    items: [
      "Emissão somente após confirmação do pagamento",
      "Alterações após emissão podem gerar taxas da companhia aérea",
      "Reembolsos seguem a política de cada companhia aérea",
      "Prazo de atendimento: dias úteis das 8h às 18h",
    ],
  },
  {
    title: "Contatos Internos",
    icon: Phone,
    iconColor: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    items: [
      "Suporte operacional: (a definir)",
      "Financeiro: (a definir)",
    ],
  },
];

export default function VendedorInformacoes() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Informações Essenciais</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Regras operacionais, formas de pagamento e políticas da agência
        </p>
      </div>

      {/* Seções */}
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="border-border/50 hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${section.bgColor}`}>
                    <Icon className={`h-4 w-4 ${section.iconColor}`} />
                  </div>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary/50 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
