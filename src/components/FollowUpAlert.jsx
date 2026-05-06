import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { localClient } from "@/api/localClient";
import { useAuth } from "@/lib/AuthContext";
import { getNextSentStatus } from "@/lib/followUpHelper";
import { cn } from "@/lib/utils";

const formatBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const REFRESH_MS = 5 * 60 * 1000;

export function FollowUpAlert() {
  const { user, isAdmin } = useAuth();
  const [pendentes, setPendentes] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const all = (await localClient.entities.Quotes.list()) || [];
    const mine = isAdmin ? all : all.filter((q) => q.seller_id === user.id);
    setPendentes(mine.filter((q) => q.status === "FollowUp Pendente"));
  }, [user?.id, isAdmin]);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

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

  if (!user?.id) return null;
  if (pendentes.length === 0) return null;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
        aria-label="Follow-ups pendentes"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
          {pendentes.length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-border rounded-xl shadow-xl z-50">
          <div className="p-3 border-b border-border">
            <p className="font-semibold text-sm">Follow-ups pendentes</p>
            <p className="text-xs text-muted-foreground">
              {pendentes.length} orçamento{pendentes.length === 1 ? "" : "s"} aguardam contato
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {pendentes.map((q) => {
              const trecho = q.itinerary?.trechos?.[0];
              const rota = trecho ? `${trecho.origem_iata} → ${trecho.destino_iata}` : "—";
              return (
                <div
                  key={q.id}
                  className="p-3 border-b last:border-0 border-border hover:bg-slate-50"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {q.client?.name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {q.quote_number || q.id?.slice(0, 8)} · {rota}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBRL(q.total_value)}
                      </p>
                    </div>
                    <RegistrarFollowUpButton
                      quote={q}
                      onDone={() => {
                        load();
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RegistrarFollowUpButton({ quote, onDone }) {
  const [loading, setLoading] = useState(false);

  const handleRegistrar = async () => {
    setLoading(true);
    const novoStatus =
      getNextSentStatus(quote.followup_count || 0) || "FollowUp 3 Enviado";
    const novoCount = (Number(quote.followup_count) || 0) + 1;
    await localClient.entities.Quotes.update(quote.id, {
      status: novoStatus,
      followup_count: novoCount,
      last_followup_date: new Date().toISOString(),
    });
    setLoading(false);
    onDone?.();
  };

  return (
    <button
      type="button"
      onClick={handleRegistrar}
      disabled={loading}
      className={cn(
        "text-xs px-2 py-1 bg-amber-500 text-white rounded font-medium hover:bg-amber-600 disabled:opacity-50 whitespace-nowrap shrink-0"
      )}
    >
      {loading ? "..." : "Registrar feito"}
    </button>
  );
}
