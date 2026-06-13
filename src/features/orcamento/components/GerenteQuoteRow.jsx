import {
  Eye, FileText, Handshake, Edit, RefreshCw, FilePlus,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/shared/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { CAREER_LEVELS } from "@/features/carreira/careerPlan";
import { formatBRL, formatDateBR } from "@/shared/lib/format";
import {
  STATUSES, STATUS_LABELS, STATUS_STYLES, FROZEN_EDIT_STATUSES,
} from "@/features/orcamento/lib/quoteStatus";
import { gerenteTimeAgo } from "@/features/orcamento/lib/gerenteTimeAgo";

const TICKET_STYLES = {
  Normal: "bg-bg-elevated text-text-secondary border-border",
  "Hidden City": "bg-danger/10 text-danger border-danger/30",
  "Quebra de Trecho": "bg-warning/10 text-warning border-warning/30",
  "Imigração": "bg-accent/10 text-accent border-accent/30",
};

export function GerenteQuoteRow({ quote, seller, onView, onChangeStatus, onPDF, onClickClient, onQuickEdit, onFullEdit }) {
  const canEdit = !FROZEN_EDIT_STATUSES.has(quote.status);
  const ida =
    quote.itinerary?.trechos?.find((t) => t.tipo === "ida") ||
    quote.itinerary?.trechos?.[0];
  const route = ida ? `${ida.origem_iata} → ${ida.destino_iata}` : "—";
  const companhia = ida?.companhia || "—";
  const levelData = CAREER_LEVELS.find((l) => l.level === seller?.career_level);
  const ticketType = quote.ticket_type || "Normal";

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono text-xs font-bold">{quote.quote_number || "—"}</span>
      </td>
      <td className="px-4 py-3">
        {quote.recipient_type === "parceiro" ? (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Badge className="bg-accent/10 text-accent border border-accent/30 hover:bg-accent/10 gap-1 text-[10px]">
                <Handshake className="h-3 w-3" /> Parceiro
              </Badge>
              <span className="font-medium text-sm">{quote.partner_name || "—"}</span>
            </div>
            {quote.partner_client_data?.name && (
              <div className="text-xs text-muted-foreground">
                Cliente: {quote.partner_client_data.name}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onClickClient}
            className="text-left hover:text-primary transition-colors"
            title="Ver cliente"
          >
            <div className="font-medium text-sm">{quote.client?.name || "—"}</div>
            <div className="text-xs text-muted-foreground">{quote.client?.phone || ""}</div>
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="font-mono font-semibold text-sm">{route}</div>
        {companhia !== "—" && (
          <Badge variant="secondary" className="text-[10px] mt-1">{companhia}</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">{quote.seller_name || "—"}</span>
          {levelData && (
            <Badge
              style={{ background: levelData.color }}
              className="text-white text-[9px] h-4 px-1.5 border-0"
            >
              {seller?.career_level}
            </Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge className={cn("border text-[10px]", TICKET_STYLES[ticketType])}>
          {ticketType}
        </Badge>
      </td>
      <td className="px-4 py-3 font-bold text-sm">{formatBRL(quote.total_value)}</td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cursor-pointer">
              <Badge className={cn("font-medium border", STATUS_STYLES[quote.status] || STATUS_STYLES.Enviado)}>
                {STATUS_LABELS[quote.status] || quote.status || "Enviado"}
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Alterar status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUSES
              .filter((s) => s !== quote.status)
              .map((s) => (
                <DropdownMenuItem key={s} onClick={() => onChangeStatus(s)}>
                  {STATUS_LABELS[s] || s}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">{formatDateBR(quote.created_date)}</div>
        <div className="text-[10px] text-muted-foreground">{gerenteTimeAgo(quote.created_date)}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <Button size="sm" variant="ghost" onClick={onView} className="gap-1.5 h-8">
            <Eye className="h-3.5 w-3.5" /> Detalhes
          </Button>
          <Button size="sm" variant="ghost" onClick={onPDF} className="gap-1.5 h-8" title="Abrir PDF">
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={!canEdit}
                className="gap-1.5 h-8"
              >
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
      </td>
    </tr>
  );
}
