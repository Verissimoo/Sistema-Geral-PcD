import {
  Plane, Globe, Building2, Shield, FileCheck,
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, Award,
  Plus, Minus, HelpCircle, Lightbulb, BookMarked, MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/lib/utils";

// ─── Configuração das abas de produto ────────────────────────────────
export const PRODUCT_TABS = [
  { value: "nacional", label: "Passagem Nacional", icon: Plane, color: "blue" },
  { value: "internacional", label: "Passagem Internacional", icon: Globe, color: "red" },
  { value: "hotel", label: "Hotel", icon: Building2, color: "amber" },
  { value: "seguro", label: "Seguro Viagem", icon: Shield, color: "emerald" },
  { value: "imigracao", label: "Pacote Imigração", icon: FileCheck, color: "purple" },
];

export const PRODUCT_DOT_CLASSES = {
  blue: "bg-accent",
  red: "bg-danger",
  amber: "bg-warning",
  emerald: "bg-success",
  purple: "bg-accent",
};

export const PRODUCT_BADGE_CLASSES = {
  blue: "bg-accent/10 text-accent border-accent/30",
  red: "bg-danger/10 text-danger border-danger/30",
  amber: "bg-warning/10 text-warning border-warning/30",
  emerald: "bg-success/10 text-success border-success/30",
  purple: "bg-accent/10 text-accent border-accent/30",
};

// ─── Subcomponentes ──────────────────────────────────────────────────

export function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h3>
      <Separator className="flex-1" />
    </div>
  );
}

export function RuleLine({ children }) {
  return (
    <div className="flex items-start gap-2">
      <div className="h-1.5 w-1.5 rounded-full bg-warning mt-2 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function CommissionRow({ label, value, highlight }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      highlight
        ? "bg-success/10 border-success/30"
        : "bg-card border-border"
    )}>
      <span className="text-sm font-medium">{label}</span>
      <span className={cn(
        "font-bold text-sm",
        highlight && "text-success dark:text-success"
      )}>
        {value}
      </span>
    </div>
  );
}

export function ProductPlaceholder({ product }) {
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

export function PlaybookHero({ accentColor, productName, subtitle, meta }) {
  return (
    <Card className="border-0 bg-[#0B1E3D] text-white overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="flex items-center gap-2 text-warning text-xs font-bold uppercase tracking-[0.3em] mb-3">
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

export function PlaybookSection({ number, title, subtitle, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="text-4xl md:text-5xl font-extrabold text-warning leading-none tracking-tight">
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

export function OfferGrid({ offer, dontOffer }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="border-success/30 bg-success/10 dark:bg-success/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-success dark:text-success flex items-center gap-2">
            <Plus className="h-4 w-4" /> Ofereça quando
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {offer.map((x) => (
            <div key={x} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" /> {x}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-danger/30 bg-danger/10 dark:bg-danger/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-danger dark:text-danger flex items-center gap-2">
            <Minus className="h-4 w-4" /> Não ofereça quando
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {dontOffer.map((x) => (
            <div key={x} className="flex items-start gap-2">
              <XCircle className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5" /> {x}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function ProcessSteps({ steps }) {
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

export function FraseBase({ children }) {
  return (
    <Card className="border-warning/30 bg-warning/10">
      <CardContent className="p-5 flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div>
          <div className="text-xs uppercase tracking-widest text-warning dark:text-warning font-bold mb-1">
            Frase-base
          </div>
          <p className="text-sm text-warning dark:text-warning italic">"{children}"</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CriticalRules({ rules }) {
  return (
    <div className="space-y-2">
      {rules.map((r) => (
        <Card key={r} className="border-danger/30 border-l-4 border-l-red-600 bg-danger/10 dark:bg-danger/5">
          <CardContent className="p-3 flex items-start gap-3 text-sm text-danger dark:text-danger">
            <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
            {r}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ErrorsExcellence({ errors, excellence }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="border-danger/30 bg-danger/10 dark:bg-danger/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-danger dark:text-danger flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Erros comuns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {errors.map((e) => (
            <div key={e} className="flex items-start gap-2">
              <XCircle className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5" /> {e}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-success/30 bg-success/10 dark:bg-success/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-success dark:text-success flex items-center gap-2">
            <Award className="h-4 w-4" /> Vendedor excelente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {excellence.map((x) => (
            <div key={x} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" /> {x}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function Quiz({ questions }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {questions.map((q, i) => (
        <Card key={q} className="border-border/50">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-7 w-7 rounded-full bg-warning/10 text-warning border border-warning/30 flex items-center justify-center text-xs font-bold shrink-0">
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

export function ScenarioCard({ scenario, checklist, label }) {
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
            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" /> {c}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ConceptCards({ concepts }) {
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

export function OverviewCards({ items }) {
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

export function Row({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-warning/30 last:border-0">
      <span className="font-semibold text-warning dark:text-warning shrink-0">{k}</span>
      <span className="text-warning dark:text-warning text-right">{v}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  HELPERS ADICIONAIS PARA HOTEL / SEGURO / IMIGRAÇÃO
// ═══════════════════════════════════════════════════════════════════

export function BigBenefitCards({ benefits }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {benefits.map((b, i) => {
        const Icon = b.icon;
        return (
          <Card key={b.title} className="border-0 bg-[#0B1E3D] text-white overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl font-extrabold text-warning leading-none tracking-tight">
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

export function CollectGrid({ items }) {
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

export function StepsWithTags({ steps }) {
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

export function PlatformCard({ name, description, steps }) {
  return (
    <Card className="border-0 bg-[#0B1E3D] text-white">
      <CardContent className="p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-warning font-bold mb-2">
          Plataforma
        </div>
        <div className="text-2xl font-extrabold mb-2">{name}</div>
        <p className="text-sm text-white/70 mb-5">{description}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {steps.map((s, i) => (
            <div key={s} className="flex items-start gap-3 p-3 rounded-lg bg-white/10 border border-white/10">
              <span className="text-warning font-bold text-sm">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm text-white/90">{s}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TicketTiers({ tiers, footer }) {
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
        <Card className="border-success/30 bg-success/10 dark:bg-success/5">
          <CardContent className="p-4 text-sm flex items-start gap-2 text-success dark:text-success">
            <TrendingUp className="h-4 w-4 text-success shrink-0 mt-0.5" /> {footer}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function ObjectionCards({ objections }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {objections.map((o, i) => (
        <Card key={o.q} className="border-border/50 overflow-hidden">
          <div className="bg-danger h-1" />
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Objeção {i + 1}
            </div>
            <div className="text-sm italic font-semibold mb-3 text-danger dark:text-danger">
              "{o.q}"
            </div>
            <Separator className="my-2" />
            <div className="text-[10px] uppercase tracking-widest text-success dark:text-success font-bold mb-1.5 flex items-center gap-1">
              <ArrowRight className="h-3 w-3" /> Resposta
            </div>
            <p className="text-sm text-muted-foreground">{o.a}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function NunPromVerify({ never, always }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="border-danger/30 bg-danger/10 dark:bg-danger/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-danger dark:text-danger flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Nunca prometa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {never.map((x) => (
            <div key={x} className="flex items-start gap-2">
              <XCircle className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5" /> {x}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="border-success/30 bg-success/10 dark:bg-success/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-success dark:text-success flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Sempre verifique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {always.map((x) => (
            <div key={x} className="flex items-start gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" /> {x}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
