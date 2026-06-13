import { Award } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { formatDate } from "./vendedorDetalheShared";

export default function VendedorHeader({ vendedor, nivelAtual, tempoAtivo, initials }) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-bg-elevated border-b border-border text-text-primary p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-warning flex items-center justify-center text-2xl font-semibold text-white shadow-lg">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{vendedor.name}</h1>
              <p className="text-sm text-text-muted">@{vendedor.username}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge
                  className={
                    vendedor.role === "admin"
                      ? "bg-[#0B1E3D] text-white border-0"
                      : vendedor.role === "gerente"
                        ? "bg-accent text-white border-0"
                        : vendedor.role === "suporte"
                          ? "bg-accent text-white border-0"
                          : "bg-warning text-white border-0"
                  }
                >
                  {vendedor.role === "admin"
                    ? "Admin"
                    : vendedor.role === "gerente"
                      ? "Gerente"
                      : vendedor.role === "suporte"
                        ? "Suporte"
                        : "Vendedor"}
                </Badge>
                <Badge variant="outline" className="text-white border-white/30">
                  <Award className="w-3 h-3 mr-1" />
                  Nível {vendedor.career_level || "N0"} · {nivelAtual?.title || "—"}
                </Badge>
                <Badge
                  className={
                    vendedor.status === "Ativo"
                      ? "bg-success text-white border-0"
                      : "bg-text-muted text-white border-0"
                  }
                >
                  {vendedor.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="text-right text-sm">
            <p className="text-text-muted">No sistema há</p>
            <p className="text-lg font-bold text-white">{tempoAtivo}</p>
            <p className="text-xs text-text-muted">
              Desde {formatDate(vendedor.created_date)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
