import { useState, useMemo } from "react";
import { Send, Clock, DollarSign, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { useToast } from "@/shared/ui/use-toast";
import { useQuotes } from "@/api/hooks";
import { formatBRL } from "@/shared/lib/format";
import { timeAgo } from "../components/emissoesUtils";
import { SummaryCard } from "../components/EmissionSummaryCard";
import { EmissionCard } from "../components/EmissionCard";
import { EmitirDialog } from "../components/EmitirVoucherDialog";

export default function SuporteEmissoes() {
  const { toast } = useToast();
  const { data: allQuotes = [] } = useQuotes();
  const [expanded, setExpanded] = useState({});
  const [emitDialogQuote, setEmitDialogQuote] = useState(null);

  const quotes = useMemo(
    () =>
      allQuotes
        .filter((q) => q.status === "Aguardando Emissão")
        .sort(
          (a, b) =>
            new Date(a.sent_to_emission_date || a.created_date) -
            new Date(b.sent_to_emission_date || b.created_date)
        ),
    [allQuotes]
  );

  const summary = useMemo(() => {
    const total = quotes.length;
    const oldest = quotes[0]?.sent_to_emission_date || quotes[0]?.created_date;
    const totalValor = quotes.reduce(
      (s, q) => s + (Number(q.final_paid_value) || Number(q.total_value) || 0),
      0
    );
    return { total, oldest, totalValor };
  }, [quotes]);

  const toggleExpand = (id) => {
    setExpanded((p) => ({ ...p, [id]: !p[id] }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-md bg-bg-elevated flex items-center justify-center">
              <Send className="h-4 w-4 text-text-secondary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Emissões Pendentes</h1>
          </div>
          <p className="text-text-muted text-sm ml-12">
            Orçamentos aprovados aguardando emissão pela equipe de suporte
          </p>
        </div>
        <Badge variant="warning" className="h-9 px-4 text-base font-semibold">
          {summary.total} {summary.total === 1 ? "pendente" : "pendentes"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard
          icon={Send}
          label="Total pendentes"
          value={summary.total}
        />
        <SummaryCard
          icon={Clock}
          label="Mais antigo"
          value={summary.oldest ? timeAgo(summary.oldest) : "—"}
          tone={
            summary.oldest && Date.now() - new Date(summary.oldest).getTime() > 24 * 3600 * 1000
              ? "warning"
              : "neutral"
          }
        />
        <SummaryCard
          icon={DollarSign}
          label="Valor pendente"
          value={formatBRL(summary.totalValor)}
          isText
        />
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-success/40 mx-auto mb-3" />
            <p className="text-sm text-text-muted">
              Nenhuma emissão pendente. Tudo em dia.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <EmissionCard
              key={q.id}
              quote={q}
              expanded={!!expanded[q.id]}
              onToggle={() => toggleExpand(q.id)}
              onEmit={() => setEmitDialogQuote(q)}
            />
          ))}
        </div>
      )}

      <EmitirDialog
        quote={emitDialogQuote}
        open={!!emitDialogQuote}
        onClose={() => setEmitDialogQuote(null)}
        onSuccess={() => {
          toast({
            title: "Voucher emitido",
            description: "O vendedor foi notificado.",
          });
        }}
      />
    </div>
  );
}
