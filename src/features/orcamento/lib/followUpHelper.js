export const FOLLOWUP_INTERVAL_HOURS = 24;

const FOLLOWUP_TRIGGERS = [
  "Enviado",
  "FollowUp 1 Enviado",
  "FollowUp 2 Enviado",
];

export function needsFollowUp(quote) {
  if (!quote) return false;
  if (!FOLLOWUP_TRIGGERS.includes(quote.status)) return false;

  const refIso = quote.last_followup_date || quote.created_date;
  if (!refIso) return false;

  const ref = new Date(refIso);
  if (isNaN(ref.getTime())) return false;

  const hoursSince = (Date.now() - ref.getTime()) / (1000 * 60 * 60);
  return hoursSince >= FOLLOWUP_INTERVAL_HOURS;
}

export function getNextFollowUpStatus(currentStatus) {
  const map = {
    Enviado: "FollowUp Pendente",
    "FollowUp 1 Enviado": "FollowUp Pendente",
    "FollowUp 2 Enviado": "FollowUp Pendente",
    "FollowUp 3 Enviado": null,
  };
  return map[currentStatus] ?? null;
}

export function getNextSentStatus(followupCount) {
  const count = Number(followupCount) || 0;
  if (count === 0) return "FollowUp 1 Enviado";
  if (count === 1) return "FollowUp 2 Enviado";
  if (count === 2) return "FollowUp 3 Enviado";
  return null;
}

export const FOLLOWUP_STATUSES = [
  "FollowUp Pendente",
  "FollowUp 1 Enviado",
  "FollowUp 2 Enviado",
  "FollowUp 3 Enviado",
];

export const AGUARDANDO_FECHAMENTO_STATUSES = [
  "Enviado",
  "FollowUp Pendente",
  "FollowUp 1 Enviado",
  "FollowUp 2 Enviado",
  "FollowUp 3 Enviado",
];
