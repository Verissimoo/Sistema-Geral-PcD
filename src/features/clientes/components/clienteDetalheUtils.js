export const STATUS_STYLES = {
  Enviado: "bg-accent/10 text-accent border-accent/30",
  Aprovado: "bg-success/10 text-success border-success/30",
  "Aguardando Emissão": "bg-warning/10 text-warning border-warning/30",
  Emitido: "bg-accent/10 text-accent border-accent/30",
  Recusado: "bg-danger/10 text-danger border-danger/30",
  Cancelado: "bg-bg-elevated text-text-secondary border-border",
};

export const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

export const onlyDigits = (s = "") => s.replace(/\D/g, "");

export const timeAgo = (iso) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d}d`;
  const months = Math.floor(d / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  return new Date(iso).toLocaleDateString("pt-BR");
};
