import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, FileText, Plane, Calculator, Users, 
  DollarSign, Settings, Lock, X, Briefcase, Calendar 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Início", icon: LayoutDashboard, path: "/", active: true },
  { label: "Contratos PJ", icon: Briefcase, path: "/contratos", active: true },
  { label: "Projetos (Kanban)", icon: FileText, path: "/projetos", active: true },
  { label: "Metas e Bônus", icon: DollarSign, path: "/metas", active: true },
  { label: "Rituais", icon: Calendar, path: "/rituais", active: true },
  { divider: true },
  { label: "Passagens", icon: Plane, path: null, locked: true },
  { label: "Orçamentos", icon: Calculator, path: null, locked: true },
  { label: "Fornecedores de milhas", icon: Users, path: null, locked: true },
  { label: "Financeiro", icon: DollarSign, path: null, locked: true },
  { label: "Configurações", icon: Settings, path: "/configuracoes", active: true },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transition-transform duration-300 lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Plane className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
                Passagens
              </span>
              <span className="text-sm font-bold text-sidebar-primary tracking-tight">
                ComDesconto
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden text-sidebar-foreground" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item, idx) => {
            if (item.divider) {
              return <div key={`div-${idx}`} className="my-2 border-t border-sidebar-border" />;
            }
            const Icon = item.icon;
            const isActive = item.path && (
              item.path === "/" 
                ? location.pathname === "/" 
                : location.pathname.startsWith(item.path)
            );

            if (item.locked) {
              return (
                <div key={item.label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/40 cursor-not-allowed">
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="text-sm">{item.label}</span>
                  <Lock className="h-3 w-3 ml-auto" />
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive && "text-sidebar-primary")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-semibold text-sidebar-accent-foreground">PD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">Painel Administrativo</p>
              <p className="text-xs text-sidebar-foreground/50">Gestão PJ</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}