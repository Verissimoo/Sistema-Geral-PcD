import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const formatBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const REFRESH_MS = 60 * 1000;

export function NotificationBell() {
  const { user, isAdmin, isGerente } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const isManagerLevel = !!(user?.id && (isAdmin || isGerente));

  const load = useCallback(async () => {
    if (!isManagerLevel) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("pcd_notifications")
      .select("*")
      .eq("target_role", "gerente")
      .eq("read", false)
      .order("created_date", { ascending: false })
      .limit(20);
    if (!error) setNotifications(data || []);
    setLoading(false);
  }, [isManagerLevel]);

  useEffect(() => {
    if (!isManagerLevel) return;
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [isManagerLevel, load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleClick = async (n) => {
    await supabase
      .from("pcd_notifications")
      .update({
        read: true,
        read_at: new Date().toISOString(),
        read_by_id: user?.id || null,
        read_by_name: user?.name || null,
      })
      .eq("id", n.id);
    setOpen(false);
    if (n.quote_id) {
      const base = isAdmin ? "/admin/orcamentos" : "/gerente/orcamentos";
      navigate(`${base}?id=${n.quote_id}`);
    }
    load();
  };

  const markAllRead = async () => {
    if (notifications.length === 0) return;
    await supabase
      .from("pcd_notifications")
      .update({
        read: true,
        read_at: new Date().toISOString(),
        read_by_id: user?.id || null,
        read_by_name: user?.name || null,
      })
      .eq("target_role", "gerente")
      .eq("read", false);
    load();
  };

  if (!isManagerLevel) return null;

  const unreadCount = notifications.length;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-96 max-w-[calc(100vw-2rem)] bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-border bg-slate-50 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm">Notificações</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount === 0
                  ? "Tudo em dia!"
                  : `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}`}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:underline shrink-0"
              >
                Marcar todas lidas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                Nenhuma notificação nova
              </div>
            ) : (
              notifications.map((n) => {
                const isOverride = n.type === "price_override";
                const diff = Number(n.metadata?.difference) || 0;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className="w-full text-left p-3 border-b last:border-0 border-border hover:bg-slate-50 transition flex gap-3"
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base",
                        isOverride ? "bg-purple-100" : "bg-blue-100"
                      )}
                    >
                      {isOverride ? "💰" : "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      {isOverride && diff !== 0 && (
                        <p
                          className={cn(
                            "text-[10px] font-bold mt-1",
                            diff > 0 ? "text-emerald-600" : "text-amber-600"
                          )}
                        >
                          {diff > 0 ? "+" : ""}{formatBRL(diff)} vs sugerido
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.created_date).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
