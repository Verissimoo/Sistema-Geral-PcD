import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Plane, Users,
  Settings, X, Briefcase, Calendar,
  Store, ChevronDown, Wrench, Star, Info, Target, Kanban, FileStack, BookOpen,
  LogOut, Trophy, BarChart3, UserSearch, Shield, Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/AuthContext";

const inicioItem = { label: "Dashboard", icon: LayoutDashboard, path: "/" };

const gerenteSubItems = [
  { label: "Metas Comerciais", icon: Target, path: "/gerente/metas" },
  { label: "Vendedores", icon: Users, path: "/gerente/vendedores" },
  { label: "Clientes", icon: UserSearch, path: "/gerente/clientes" },
  { label: "Orçamentos", icon: FileStack, path: "/gerente/orcamentos" },
  { label: "Parceiros", icon: Handshake, path: "/gerente/parceiros" },
];

const contratosSubItems = [
  { label: "Contratos PJ", icon: FileText, path: "/contratos" },
  { label: "Projetos (Kanban)", icon: Kanban, path: "/projetos" },
  { label: "Metas e Bônus", icon: Target, path: "/metas" },
  { label: "Rituais", icon: Calendar, path: "/rituais" },
];

const vendedorSubItems = [
  { label: "Ferramentas", icon: Wrench, path: "/vendedor/ferramentas" },
  { label: "Manual do Vendedor", icon: BookOpen, path: "/vendedor/cotacao" },
  { label: "Gerador de Orçamento", icon: FileText, path: "/vendedor/orcamento" },
  { label: "Orçamentos", icon: FileStack, path: "/vendedor/orcamentos" },
  { label: "Tabela de Milhas", icon: Star, path: "/vendedor/milhas" },
  { label: "Plano de Carreira", icon: Trophy, path: "/vendedor/carreira" },
  { label: "Informações Essenciais", icon: Info, path: "/vendedor/informacoes" },
];

const parceiroSubItems = [
  { label: "Meus Orçamentos", icon: FileStack, path: "/parceiro/orcamentos" },
  { label: "Meus Clientes", icon: Users, path: "/parceiro/clientes" },
];

const usuariosItem = { label: "Usuários", icon: Shield, path: "/usuarios" };
const settingsItem = { label: "Configurações", icon: Settings, path: "/configuracoes" };

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export default function Sidebar({ open, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isVendedor, isParceiro } = useAuth();

  const isVendedorRoute = location.pathname.startsWith("/vendedor");
  const isGerenteRoute = location.pathname.startsWith("/gerente");
  const isParceiroRoute = location.pathname.startsWith("/parceiro");
  const isContratosRoute =
    location.pathname.startsWith("/contratos") ||
    location.pathname.startsWith("/projetos") ||
    location.pathname.startsWith("/metas") ||
    location.pathname.startsWith("/rituais");

  const [vendedorOpen, setVendedorOpen] = useState(isVendedorRoute || isVendedor);
  const [gerenteOpen, setGerenteOpen] = useState(isGerenteRoute);
  const [parceiroOpen, setParceiroOpen] = useState(isParceiroRoute || isParceiro);
  const [contratosOpen, setContratosOpen] = useState(isContratosRoute);

  useEffect(() => { if (isVendedorRoute) setVendedorOpen(true); }, [isVendedorRoute]);
  useEffect(() => { if (isGerenteRoute) setGerenteOpen(true); }, [isGerenteRoute]);
  useEffect(() => { if (isParceiroRoute) setParceiroOpen(true); }, [isParceiroRoute]);
  useEffect(() => { if (isContratosRoute) setContratosOpen(true); }, [isContratosRoute]);
  useEffect(() => { if (isVendedor) setVendedorOpen(true); }, [isVendedor]);
  useEffect(() => { if (isParceiro) setParceiroOpen(true); }, [isParceiro]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isActive = item.path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(item.path);

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
  };

  const renderGroup = (label, Icon, isActive, isOpen, setIsOpen, subItems, matchExact = false) => (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full text-left",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        )}
      >
        <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive && "text-sidebar-primary")} />
        <span className="flex-1">{label}</span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-[480px] opacity-100 mt-1" : "max-h-0 opacity-0"
      )}>
        <div className="pl-4 space-y-0.5">
          {subItems.map((sub) => {
            const SubIcon = sub.icon;
            const isSubActive = matchExact
              ? location.pathname === sub.path
              : location.pathname.startsWith(sub.path);
            return (
              <Link
                key={sub.path}
                to={sub.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                  isSubActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <SubIcon className={cn("h-3.5 w-3.5 shrink-0", isSubActive && "text-sidebar-primary")} />
                <span>{sub.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );

  const roleBadge = isAdmin
    ? { label: "Administrador", className: "bg-[#0B1E3D] text-white hover:bg-[#0B1E3D]" }
    : isParceiro
      ? { label: "Parceiro", className: "bg-purple-600 text-white hover:bg-purple-600" }
      : { label: "Vendedor", className: "bg-amber-500 text-white hover:bg-amber-500" };

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
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden text-sidebar-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {/* Parceiro — apenas Portal do Parceiro */}
          {isParceiro && renderGroup(
            "Portal do Parceiro",
            Handshake,
            isParceiroRoute,
            parceiroOpen,
            setParceiroOpen,
            parceiroSubItems
          )}

          {/* Demais portais — admin / vendedor */}
          {!isParceiro && (
            <>
              {/* Dashboard — admin */}
              {isAdmin && renderNavItem(inicioItem)}

              {/* Portal do Gerente — admin */}
              {isAdmin &&
                renderGroup(
                  "Portal do Gerente",
                  BarChart3,
                  isGerenteRoute,
                  gerenteOpen,
                  setGerenteOpen,
                  gerenteSubItems
                )}

              {/* Portal de Contratos — admin */}
              {isAdmin &&
                renderGroup(
                  "Portal de Contratos",
                  Briefcase,
                  isContratosRoute,
                  contratosOpen,
                  setContratosOpen,
                  contratosSubItems
                )}

              {/* Portal do Vendedor — admin + vendedor */}
              {renderGroup(
                "Portal do Vendedor",
                Store,
                isVendedorRoute,
                vendedorOpen,
                setVendedorOpen,
                vendedorSubItems,
                true
              )}

              {/* Usuários + Configurações — admin */}
              {isAdmin && renderNavItem(usuariosItem)}
              {isAdmin && renderNavItem(settingsItem)}
            </>
          )}
        </nav>

        {/* Rodapé com usuário logado */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-sidebar-accent-foreground">
                {initials(user?.name) || "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">
                {user?.name || "—"}
              </p>
              <Badge
                className={cn(
                  "h-4 mt-0.5 px-1.5 text-[9px] font-semibold border-0",
                  roleBadge.className
                )}
              >
                {roleBadge.label}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
