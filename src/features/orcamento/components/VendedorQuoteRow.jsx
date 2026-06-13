import { useMemo } from "react";
import {
  Eye, Calendar, Send, Download, Clock, XCircle,
  RefreshCw, Edit, FilePlus,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { formatBRL, formatDateBR } from "@/shared/lib/format";
import {
  STATUS_LABELS, STATUS_STYLES, FROZEN_EDIT_STATUSES,
} from "@/features/orcamento/lib/quoteStatus";
import { vendedorTimeAgo } from "@/features/orcamento/lib/vendedorTimeAgo";

const FOLLOWUP_STATUSES = [
  "Enviado",
  "FollowUp Pendente",
  "FollowUp 1 Enviado",
  "FollowUp 2 Enviado",
  "FollowUp 3 Enviado",
];

function StatusActionMenu({ quote, onMarkRejected, onSendToEmission }) {
  const isEnviadoOuFollowUp = FOLLOWUP_STATUSES.includes(quote.status);
  const isAprovado = quote.status === "Aprovado";

  const followupTime = useMemo(() => {
    if (!isEnviadoOuFollowUp) return null;
    const refDate = quote.last_followup_date
      ? new Date(quote.last_followup_date)
      : new Date(quote.created_date);
    const hoursSince = (Date.now() - refDate.getTime()) / (1000 * 60 * 60);
    const hoursLeft = Math.max(0, 24 - hoursSince);
    if (hoursLeft === 0) return "Follow-up pendente agora";
    const h = Math.floor(hoursLeft);
    const m = Math.floor((hoursLeft - h) * 60);
    return `Próximo follow-up em ${h}h ${m}min`;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps intencionalmente estreitas (efeito de sync); incluir as faltantes mudaria comportamento
  }, [isEnviadoOuFollowUp, quote.status, quote.last_followup_date, quote.created_date]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex" title="Ações de status">
          <Badge
            className={cn(
              "font-medium border cursor-pointer",
              STATUS_STYLES[quote.status] || STATUS_STYLES.Enviado,
            )}
          >
            {STATUS_LABELS[quote.status] || quote.status || "Enviado"}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="space-y-1">
          {followupTime && (
            <div className="px-3 py-2 text-xs bg-warning/10 border border-warning/30 rounded-md text-warning flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" /> {followupTime}
            </div>
          )}

          {isEnviadoOuFollowUp && (
            <>
              <button
                type="button"
                onClick={() => onSendToEmission(quote)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 rounded-md flex items-center gap-2 text-accent"
              >
                <Send className="h-4 w-4" /> Enviar para Emissão (cliente aprovou)
              </button>
              <button
                type="button"
                onClick={() => onMarkRejected(quote)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-danger/10 rounded-md flex items-center gap-2 text-danger"
              >
                <XCircle className="h-4 w-4" /> Marcar como Recusado
              </button>
            </>
          )}

          {isAprovado && (
            <button
              type="button"
              onClick={() => onSendToEmission(quote)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 rounded-md flex items-center gap-2 text-accent font-medium"
            >
              <Send className="h-4 w-4" /> Enviar para Emissão
            </button>
          )}

          {["Aguardando Emissão", "Emitido", "Recusado", "Cancelado"].includes(quote.status) && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Sem ações disponíveis neste status
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function VendedorQuoteRow({ quote, onView, onMarkRejected, onSendToEmission, onQuickEdit, onFullEdit }) {
  const canEdit = !FROZEN_EDIT_STATUSES.has(quote.status);
  const ida = quote.itinerary?.trechos?.find((t) => t.tipo === "ida")
    || quote.itinerary?.trechos?.[0];
  const route = ida ? `${ida.origem_iata} → ${ida.destino_iata}` : "—";
  const companhia = ida?.companhia || "—";

  return (
    <Card className="border-border/50 hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{quote.client?.name || "—"}</span>
              <span className="text-xs text-muted-foreground">
                {quote.client?.phone || ""}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
              <span className="font-mono font-semibold text-foreground">{route}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDateBR(quote.dates?.departure)}
              </span>
              <Badge variant="secondary" className="text-[10px]">{companhia}</Badge>
              <Badge variant="outline" className="text-[10px]">{quote.ticket_type || "Normal"}</Badge>
            </div>
          </div>

          <div className="text-right min-w-[100px]">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-bold text-base">{formatBRL(quote.total_value)}</div>
          </div>

          <StatusActionMenu
            quote={quote}
            onMarkRejected={onMarkRejected}
            onSendToEmission={onSendToEmission}
          />

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {vendedorTimeAgo(quote.created_date)}
          </span>

          <div className="flex items-center gap-1 justify-end flex-wrap">
            {quote.status === "Emitido" && quote.emission_voucher_url && (
              <a
                href={quote.emission_voucher_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold text-accent hover:text-accent hover:bg-accent/10 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Baixar Voucher
              </a>
            )}
            <Button size="sm" variant="ghost" onClick={onView} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Detalhes
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" disabled={!canEdit} className="gap-1.5">
                  <Edit className="h-3.5 w-3.5" /> Editar
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                <button
                  type="button"
                  onClick={() => onQuickEdit?.()}
                  className="w-full text-left p-3 rounded-md hover:bg-warning/10 transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw className="w-4 h-4 text-warning" />
                    <p className="font-semibold text-sm">Atualizar valores</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mudar pontuação, custo, taxa ou venda. Mantém voos e cliente.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onFullEdit?.()}
                  className="w-full text-left p-3 rounded-md hover:bg-accent/10 transition mt-1"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FilePlus className="w-4 h-4 text-accent" />
                    <p className="font-semibold text-sm">Edição completa</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Refazer cotação do zero (mudou voo, destino, cliente etc).
                  </p>
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
