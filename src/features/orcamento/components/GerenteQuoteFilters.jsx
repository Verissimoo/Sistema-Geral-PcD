import { Search } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { STATUSES, STATUS_LABELS } from "@/features/orcamento/lib/quoteStatus";

const TICKET_TYPES = ["Normal", "Hidden City", "Quebra de Trecho", "Imigração"];

export function GerenteQuoteFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sellerFilter,
  onSellerFilterChange,
  sellers,
  periodFilter,
  onPeriodFilterChange,
  ticketTypeFilter,
  onTicketTypeFilterChange,
  recipientFilter,
  onRecipientFilterChange,
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou nº do orçamento..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os status</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s] || s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sellerFilter} onValueChange={onSellerFilterChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os vendedores</SelectItem>
              {sellers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={periodFilter} onValueChange={onPeriodFilterChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Últimos 7 dias</SelectItem>
              <SelectItem value="month">Último mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ticketTypeFilter} onValueChange={onTicketTypeFilterChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os tipos</SelectItem>
              {TICKET_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={recipientFilter} onValueChange={onRecipientFilterChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os destinatários</SelectItem>
              <SelectItem value="cliente">Cliente Final</SelectItem>
              <SelectItem value="parceiro">Parceiro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
