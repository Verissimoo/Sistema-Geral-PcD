import {
  Pencil, ShieldCheck, ShieldOff, Lock, Trash2, Phone, Mail,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import { formatDateBR } from "@/shared/lib/format";
import { ADMIN_USERNAME, initials } from "./userUtils";

export function UserListItem({ user: u, currentUser, onEdit, onToggleStatus, onDelete }) {
  const isSystemAdmin = u.username === ADMIN_USERNAME;
  const isPartner = u._source === "partners";
  const isSelf = !isPartner && u.id === currentUser?.id;
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center gap-4 flex-wrap">
        <div
          className={cn(
            "h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
            isPartner
              ? "bg-success/10 text-success"
              : "bg-primary/10 text-primary"
          )}
        >
          {initials(u.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{u.name}</span>
            {isSystemAdmin && (
              <Badge className="bg-muted text-muted-foreground hover:bg-muted gap-1">
                <Lock className="h-3 w-3" /> Conta do sistema
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
            <span>@{u.username}</span>
            {isPartner && u.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {u.phone}
              </span>
            )}
            {isPartner && u.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {u.email}
              </span>
            )}
            <span>· criado em {formatDateBR(u.created_date)}</span>
          </div>
        </div>
        <Badge
          className={cn(
            "border",
            u.role === "admin"
              ? "bg-[#0B1E3D] text-white border-transparent hover:bg-[#0B1E3D]"
              : u.role === "gerente"
                ? "bg-accent text-white border-transparent hover:bg-accent"
                : u.role === "parceiro"
                  ? "bg-success text-white border-transparent hover:bg-success"
                  : u.role === "suporte"
                    ? "bg-accent/10 text-accent border-accent/30 hover:bg-accent/10"
                    : "bg-warning/10 text-warning border-warning/30 hover:bg-warning/10"
          )}
        >
          {u.role === "admin"
            ? "Admin"
            : u.role === "gerente"
              ? "Gerente"
              : u.role === "parceiro"
                ? "Parceiro"
                : u.role === "suporte"
                  ? "Suporte"
                  : "Vendedor"}
        </Badge>
        <Badge
          className={cn(
            "border",
            u.status === "Ativo"
              ? "bg-success/10 text-success border-success/30 hover:bg-success/10"
              : "bg-danger/10 text-danger border-danger/30 hover:bg-danger/10"
          )}
        >
          {u.status}
        </Badge>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(u)}
            disabled={isSystemAdmin}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleStatus(u)}
            disabled={isSystemAdmin}
            className={cn(
              "gap-1.5",
              u.status === "Ativo" ? "text-danger hover:text-danger" : "text-success hover:text-success"
            )}
          >
            {u.status === "Ativo" ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {u.status === "Ativo" ? "Desativar" : "Ativar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(u)}
            disabled={isSystemAdmin || isSelf}
            title={
              isSystemAdmin
                ? "Admin do sistema não pode ser excluído"
                : isSelf
                  ? "Você não pode excluir sua própria conta"
                  : isPartner
                    ? "Excluir parceiro"
                    : "Excluir usuário"
            }
            className="gap-1.5 text-danger hover:text-danger hover:bg-danger/10 disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
