import { useState, useEffect, useMemo, useRef } from "react";
import {
  Send, Clock, DollarSign, ChevronDown, ChevronUp, FileText, Plane,
  CheckCircle2, AlertTriangle, Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useQuotes, useUpdateQuote } from "@/api/hooks";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { computePricingTotals } from "@/lib/pricingCalculator";
import { formatBRL, formatDateBR } from "@/shared/lib/format";

const timeAgo = (iso) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

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

function SummaryCard({ icon: Icon, label, value, isText, tone = "neutral" }) {
  const cardTone =
    tone === "warning" ? "bg-warning/10 border border-warning/30" : "border border-border";
  const iconWrap = {
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success",
    neutral: "bg-bg-elevated text-text-secondary",
  }[tone];
  const valueColor = tone === "warning" ? "text-warning" : "text-text-primary";
  return (
    <Card className={cardTone}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("w-8 h-8 rounded-md flex items-center justify-center", iconWrap)}>
            <Icon className="w-4 h-4" />
          </div>
          <p className="text-xs uppercase tracking-wider text-text-muted font-medium">{label}</p>
        </div>
        <p className={cn("font-semibold tabular-nums", isText ? "text-xl" : "text-3xl", valueColor)}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function EmissionCard({ quote, expanded, onToggle, onEmit }) {
  const ida = quote.itinerary?.trechos?.find((t) => t.tipo === "ida") || quote.itinerary?.trechos?.[0];
  const route = ida ? `${ida.origem_iata} → ${ida.destino_iata}` : "—";
  const companhia = ida?.companhia || "—";
  const sentAt = quote.sent_to_emission_date || quote.created_date;
  const horasAguardando = sentAt
    ? Math.floor((Date.now() - new Date(sentAt).getTime()) / 3600000)
    : 0;
  const isUrgent = horasAguardando >= 24;
  const totals = computePricingTotals(quote);
  const multiPax = totals.passengers >= 2;

  return (
    <Card
      className={cn(
        "transition-colors",
        isUrgent
          ? "border border-danger/25 hover:border-danger/40"
          : "border border-border hover:border-border-strong"
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {quote.quote_number || `#${quote.id?.slice(0, 8)}`}
              </span>
              {isUrgent && (
                <Badge variant="danger" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Urgente
                </Badge>
              )}
            </div>
            <div className="font-bold text-base">{quote.client?.name || quote.partner_name || "—"}</div>
            <div className="text-xs text-muted-foreground">
              Vendedor: <strong>{quote.seller_name || "—"}</strong>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
              <span className="font-mono font-semibold">{route}</span>
              <Badge variant="secondary" className="text-[10px]">{companhia}</Badge>
              <Badge variant="outline" className="text-[10px]">{quote.ticket_type || "Normal"}</Badge>
              <span className="text-muted-foreground">
                Ida: {formatDateBR(quote.dates?.departure)}
                {!quote.dates?.one_way && ` · Volta: ${formatDateBR(quote.dates?.return)}`}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Valor pago</div>
            <div className="font-bold text-lg">
              {formatBRL(quote.final_paid_value || quote.total_value)}
            </div>
            <div className="text-xs text-text-muted flex items-center justify-end gap-1 mt-1">
              <Clock className="h-3 w-3" /> Enviado {timeAgo(sentAt)}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onToggle} className="gap-1.5">
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" /> Ocultar detalhes
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> Ver detalhes completos
              </>
            )}
          </Button>
          <Button
            variant="success"
            onClick={onEmit}
            className="gap-1.5 ml-auto"
          >
            <CheckCircle2 className="h-4 w-4" /> Marcar como Emitido + Anexar Voucher
          </Button>
        </div>

        {expanded && (
          <div className="border-t border-border pt-3 space-y-3 text-sm">
            <Section title="Itinerário">
              {(quote.itinerary?.trechos || []).map((t, i) => (
                <div key={i} className="p-2 rounded-lg bg-muted/40 border border-border space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="capitalize">{t.tipo}</Badge>
                    <span className="font-medium">{t.companhia} {t.numero_voo}</span>
                    {t.classe && <Badge variant="secondary" className="text-[10px]">{t.classe}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold">{t.horario_saida}</span>
                    <span className="text-muted-foreground">
                      {t.origem_cidade} ({t.origem_iata})
                    </span>
                    <Plane className="h-3 w-3 text-muted-foreground" />
                    <span className="font-bold">{t.horario_chegada}</span>
                    <span className="text-muted-foreground">
                      {t.destino_cidade} ({t.destino_iata})
                    </span>
                    <span className="text-muted-foreground ml-auto">
                      {t.duracao}
                      {t.escalas > 0 ? ` · ${t.escalas} escala` : " · direto"}
                    </span>
                  </div>
                  {t.bagagem && (
                    <div className="text-[11px] text-muted-foreground">Bagagem: {t.bagagem}</div>
                  )}
                </div>
              ))}
            </Section>

            <Section title={multiPax ? `Pricing · ${totals.passengers} passageiros` : "Pricing"}>
              <Field label="Tipo" value={quote.pricing?.type === "milhas" ? `Milhas — ${quote.pricing?.program || "—"}` : quote.pricing?.type === "milhas_dinheiro" ? `Milhas + Dinheiro — ${quote.pricing?.program || quote.pricing?.program_name || "Azul"}` : "Dinheiro"} />
              <Field
                label="Custo total"
                value={
                  multiPax
                    ? `${formatBRL(totals.costTotal)} (${formatBRL(totals.costPerPax)} × ${totals.passengers})`
                    : formatBRL(totals.costTotal)
                }
              />
              <Field
                label="Nipon (mínimo)"
                value={
                  multiPax
                    ? `${formatBRL(totals.niponTotal)} (${formatBRL(totals.niponPerPax)} × ${totals.passengers})`
                    : formatBRL(totals.niponTotal)
                }
              />
              <Field label="Valor de venda" value={formatBRL(quote.total_value)} />
              <Field label="Valor pago final" value={formatBRL(quote.final_paid_value)} />
            </Section>

            <Section title="Pagamento">
              <Field label="Forma" value={quote.payment_method || "—"} />
              <Field label="Responsável" value={quote.purchase_responsible || "—"} />
              {Array.isArray(quote.payment_installments) && quote.payment_installments.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Parcelas:</div>
                  {quote.payment_installments.map((inst, i) => (
                    <div key={i} className="text-xs flex justify-between border-b border-border/40 py-1">
                      <span>{i + 1}ª — {formatDateBR(inst.date)}</span>
                      <span className="font-semibold">{formatBRL(inst.value)}</span>
                    </div>
                  ))}
                </div>
              )}
              {quote.payment_proof_url && (
                <a
                  href={quote.payment_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-accent hover:text-accent-hover text-sm font-semibold"
                >
                  <FileText className="h-3.5 w-3.5" /> Ver comprovante de pagamento
                </a>
              )}
            </Section>

            {Array.isArray(quote.passenger_data) && quote.passenger_data.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Passageiros ({quote.passenger_data.length})
                </div>
                <div className="space-y-2">
                  {quote.passenger_data.map((pax, idx) => (
                    <div key={idx} className="bg-bg-elevated rounded-md p-3 text-sm border border-border">
                      <p className="font-semibold mb-1">
                        {idx + 1}. {pax.full_name || "—"}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-muted">
                        <span>CPF: <strong>{pax.cpf || "—"}</strong></span>
                        <span>
                          Nascimento:{" "}
                          <strong>
                            {pax.birth_date
                              ? new Date(pax.birth_date + "T12:00:00").toLocaleDateString("pt-BR")
                              : "—"}
                          </strong>
                        </span>
                        {pax.passport && <span>Passaporte: <strong>{pax.passport}</strong></span>}
                        {pax.passport_expiry && (
                          <span>
                            Validade:{" "}
                            <strong>
                              {new Date(pax.passport_expiry + "T12:00:00").toLocaleDateString("pt-BR")}
                            </strong>
                          </span>
                        )}
                        {pax.nationality && <span>Nacionalidade: <strong>{pax.nationality}</strong></span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmitirDialog({ quote, open, onClose, onSuccess }) {
  const { user } = useAuth();
  const updateQuote = useUpdateQuote();
  const [voucherFile, setVoucherFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Trava síncrona contra clique duplo: evita uploads paralelos do mesmo voucher.
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setVoucherFile(null);
      setNotes("");
      setError("");
    }
  }, [open]);

  const handleEmitir = async () => {
    if (isSubmittingRef.current) return;
    setError("");
    if (!voucherFile) {
      setError("Anexe o documento de emissão.");
      return;
    }
    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const ext = voucherFile.name.split(".").pop();
      const fileName = `voucher-${quote.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("pcd-emission-files")
        .upload(fileName, voucherFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("pcd-emission-files")
        .getPublicUrl(fileName);

      await updateQuote.mutateAsync({
        id: quote.id,
        updates: {
          status: "Emitido",
          emission_voucher_url: urlData.publicUrl,
          emission_notes: notes,
          emission_handled_by: user?.name || "Suporte",
          emission_completed_date: new Date().toISOString(),
          issued_date: new Date().toISOString(),
        },
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Erro ao confirmar emissão: " + (err.message || "tente novamente"));
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Emissão</DialogTitle>
          <DialogDescription>
            {quote?.quote_number || `#${quote?.id?.slice(0, 8)}`} ·{" "}
            {quote?.client?.name || quote?.partner_name || "—"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Documento de emissão (voucher) *</Label>
            <Input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setVoucherFile(e.target.files?.[0] || null)}
            />
            {voucherFile && <p className="text-xs text-success">✓ {voucherFile.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Localizador, referências, observações da emissão..."
            />
          </div>
          {error && (
            <div className="p-3 rounded-md bg-danger/10 border border-danger/30 text-sm text-danger">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleEmitir}
            disabled={loading || !voucherFile}
          >
            {loading ? "Processando..." : "Confirmar Emissão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0 text-sm">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "—"}</span>
    </div>
  );
}
