// Constantes compartilhadas de status de orçamento — extraídas de
// GerenteOrcamentos e VendedorOrcamentos (eram idênticas em ambos).

export const STATUSES = [
  "Enviado",
  "FollowUp Pendente",
  "FollowUp 1 Enviado",
  "FollowUp 2 Enviado",
  "FollowUp 3 Enviado",
  "Aprovado",
  "Aguardando Emissão",
  "Emitido",
  "Recusado",
  "Cancelado",
];

export const STATUS_LABELS = {
  Enviado: "Enviado",
  "FollowUp Pendente": "⚡ Follow-up Pendente",
  "FollowUp 1 Enviado": "Follow-up 1 ✓",
  "FollowUp 2 Enviado": "Follow-up 2 ✓",
  "FollowUp 3 Enviado": "Follow-up 3 ✓",
  Aprovado: "Aprovado",
  "Aguardando Emissão": "⏳ Aguardando Emissão",
  Emitido: "✓ Emitido",
  Recusado: "Recusado",
  Cancelado: "Cancelado",
};

export const STATUS_STYLES = {
  Enviado: "bg-accent/10 text-accent border-accent/30 hover:bg-accent/10",
  "FollowUp Pendente": "bg-warning/10 text-warning border-warning/30 hover:bg-warning/10 animate-pulse",
  "FollowUp 1 Enviado": "bg-accent/10 text-accent border-accent/30 hover:bg-accent/10",
  "FollowUp 2 Enviado": "bg-accent/10 text-accent border-accent/30 hover:bg-accent/10",
  "FollowUp 3 Enviado": "bg-accent/10 text-accent border-accent/30 hover:bg-accent/10",
  Aprovado: "bg-success/10 text-success border-success/30 hover:bg-success/10",
  "Aguardando Emissão": "bg-warning/10 text-warning border-warning/30 hover:bg-warning/10",
  Emitido: "bg-accent/10 text-accent border-accent/30 hover:bg-accent/10",
  Recusado: "bg-danger/10 text-danger border-danger/30 hover:bg-danger/10",
  Cancelado: "bg-bg-elevated text-text-secondary border-border hover:bg-bg-elevated",
};

// Status em que a edição rápida não faz sentido (cotação congelada).
export const FROZEN_EDIT_STATUSES = new Set(["Emitido", "Cancelado", "Recusado"]);
