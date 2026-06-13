// Helpers e badge compartilhados entre os blocos da página de detalhe do vendedor.

export const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const STATUS_CONFIG = {
  "Enviado": { label: "Enviado", className: "bg-accent/10 text-accent border-accent/30" },
  "FollowUp Pendente": { label: "⚡ Follow-up", className: "bg-warning/10 text-warning border-warning/30" },
  "FollowUp 1 Enviado": { label: "Follow-up 1", className: "bg-accent/10 text-accent border-accent/30" },
  "FollowUp 2 Enviado": { label: "Follow-up 2", className: "bg-accent/10 text-accent border-accent/30" },
  "FollowUp 3 Enviado": { label: "Follow-up 3", className: "bg-accent/10 text-accent border-accent/30" },
  "Aprovado": { label: "Aprovado", className: "bg-success/10 text-success border-success/30" },
  "Aguardando Emissão": { label: "Aguardando", className: "bg-warning/10 text-warning border-warning/30" },
  "Emitido": { label: "Emitido", className: "bg-accent/10 text-accent border-accent/30" },
  "Recusado": { label: "Recusado", className: "bg-danger/10 text-danger border-danger/30" },
  "Cancelado": { label: "Cancelado", className: "bg-bg-elevated text-text-secondary border-border" },
};

export function StatusBadge({ status }) {
  const config =
    STATUS_CONFIG[status] || {
      label: status || "—",
      className: "bg-bg-elevated text-text-secondary border-border",
    };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// Extrai a rota (origem → destino) de uma cotação considerando segmentos ou trecho legacy.
export function getRota(quote) {
  const trecho = quote.itinerary?.trechos?.[0];
  if (!trecho) return "—";
  const seg = trecho.segmentos?.[0] || trecho;
  const origem = seg.origem_iata || "—";
  const destino = seg.destino_iata || "—";
  return `${origem} → ${destino}`;
}
