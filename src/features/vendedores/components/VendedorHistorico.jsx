import { Filter, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { formatBRL } from "@/shared/lib/format";
import { formatDate, getRota, StatusBadge } from "./vendedorDetalheShared";

export default function VendedorHistorico({
  historicoFiltrado,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  navigate,
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-5 h-5 text-text-secondary" />
            Histórico de orçamentos
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <Input
                placeholder="Buscar PCD ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-56 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Enviado">Enviado</SelectItem>
                <SelectItem value="FollowUp Pendente">Follow-up Pendente</SelectItem>
                <SelectItem value="FollowUp 1 Enviado">Follow-up 1</SelectItem>
                <SelectItem value="FollowUp 2 Enviado">Follow-up 2</SelectItem>
                <SelectItem value="FollowUp 3 Enviado">Follow-up 3</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Aguardando Emissão">Aguardando Emissão</SelectItem>
                <SelectItem value="Emitido">Emitido</SelectItem>
                <SelectItem value="Recusado">Recusado</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {historicoFiltrado.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Nenhum orçamento corresponde aos filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-text-secondary">
                    PCD
                  </th>
                  <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-text-secondary">
                    Cliente
                  </th>
                  <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-text-secondary">
                    Rota
                  </th>
                  <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-text-secondary text-right">
                    Valor
                  </th>
                  <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-text-secondary">
                    Status
                  </th>
                  <th className="pb-2 font-semibold text-xs uppercase tracking-wider text-text-secondary">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {historicoFiltrado.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => navigate(`/gerente/orcamentos?id=${q.id}`)}
                    className="border-b border-border hover:bg-bg-elevated cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-mono text-xs font-bold">
                      {q.quote_number || `#${q.id?.slice(0, 8)}`}
                    </td>
                    <td className="py-3">
                      {q.client?.name || q.partner_name || "—"}
                    </td>
                    <td className="py-3 font-mono text-xs">{getRota(q)}</td>
                    <td className="py-3 text-right font-semibold">
                      {formatBRL(q.total_value)}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="py-3 text-xs text-text-muted">
                      {formatDate(q.created_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
